"use server";

import { CategorySection, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/session";
import { PROTECTED_CATEGORY_SLUGS } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export interface CategoryFormState {
  errors?: Partial<Record<string, string>>;
  message?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  section: z.enum(CategorySection),
  description: z.string().trim().max(160, "Keep the description under 160 characters"),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const read = (fd: FormData) => Object.fromEntries(["name", "section", "description", "sortOrder"].map((k) => [k, String(fd.get(k) ?? "")]));

function toErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string> = {};
  for (const i of issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function createCategory(_prev: CategoryFormState, fd: FormData): Promise<CategoryFormState> {
  await requireSuperAdmin();
  const parsed = schema.safeParse(read(fd));
  if (!parsed.success) return { errors: toErrors(parsed.error.issues) };
  const slug = slugify(parsed.data.name);
  if (!slug) return { errors: { name: "Use letters or numbers in the name" } };
  try {
    await prisma.category.create({ data: { ...parsed.data, description: parsed.data.description || null, slug } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { errors: { name: "A category with this name already exists" } };
    throw err;
  }
  revalidatePath("/", "layout");
  return { message: `Category "${parsed.data.name}" created. Its page is /kategori/${slug}` };
}

/** Renaming keeps the slug, so existing links keep working. */
export async function updateCategory(id: string, _prev: CategoryFormState, fd: FormData): Promise<CategoryFormState> {
  await requireSuperAdmin();
  const parsed = schema.safeParse(read(fd));
  if (!parsed.success) return { errors: toErrors(parsed.error.issues) };
  await prisma.category.update({ where: { id }, data: { ...parsed.data, description: parsed.data.description || null } });
  revalidatePath("/", "layout");
  return { message: "Saved" };
}

/** Articles in a deleted category are kept, with no category. The categories AI drafts are filed under can't be deleted. */
export async function deleteCategory(id: string): Promise<void> {
  await requireSuperAdmin();
  const category = await prisma.category.findUnique({ where: { id }, select: { slug: true } });
  if (!category) return;
  if (PROTECTED_CATEGORY_SLUGS.includes(category.slug)) throw new Error("This category is used for AI articles and can't be deleted.");
  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
}
