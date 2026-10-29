"use server";

import { AdminRole, ArticleStatus, ContentOrigin, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type ArticleIntent = "save" | "publish" | "schedule" | "unpublish" | "archive";

export interface ArticleFormState {
  errors?: Partial<Record<string, string>>;
  message?: string;
}

const articleSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens"),
  excerpt: z.string().trim().max(300, "Keep the excerpt under 300 characters"),
  body: z.string().trim().min(1, "Write the article body"),
  coverImageUrl: z.union([z.literal(""), z.url("Enter a full image URL (https://…)")]),
  tags: z.string(),
  categoryId: z.string().min(1, "Choose a category"),
  leagueId: z.string(),
  scheduledFor: z.string(),
  intent: z.enum(["save", "publish", "schedule", "unpublish", "archive"]),
});

const MESSAGES: Record<ArticleIntent, string> = {
  save: "Changes saved",
  publish: "Published",
  schedule: "Scheduled",
  unpublish: "Moved back to drafts",
  archive: "Archived",
};

export async function saveArticle(
  id: string | null,
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  const session = await requireAdmin();

  const field = (name: string) => String(formData.get(name) ?? "");
  const parsed = articleSchema.safeParse(Object.fromEntries(Object.keys(articleSchema.shape).map((k) => [k, field(k)])));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors };
  }
  const input = parsed.data;

  const existing = id ? await prisma.article.findUnique({ where: { id } }) : null;
  if (id && !existing) return { message: "This article no longer exists." };

  let status = existing?.status ?? ArticleStatus.DRAFT;
  let publishedAt = existing?.publishedAt ?? null;
  let scheduledFor = existing?.scheduledFor ?? null;

  switch (input.intent) {
    case "publish":
      // Keep the original date when re-saving an already published article.
      if (existing?.status !== ArticleStatus.PUBLISHED || !publishedAt) publishedAt = new Date();
      status = ArticleStatus.PUBLISHED;
      scheduledFor = null;
      break;
    case "schedule": {
      const when = new Date(input.scheduledFor);
      if (!input.scheduledFor || Number.isNaN(when.getTime()) || when <= new Date())
        return { errors: { scheduledFor: "Pick a date and time in the future" } };
      // Public pages show SCHEDULED articles once publishedAt has passed, so no extra job is needed.
      status = ArticleStatus.SCHEDULED;
      scheduledFor = when;
      publishedAt = when;
      break;
    }
    case "unpublish":
      status = ArticleStatus.DRAFT;
      scheduledFor = null;
      break;
    case "archive":
      status = ArticleStatus.ARCHIVED;
      scheduledFor = null;
      break;
  }

  const data = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt || null,
    body: input.body,
    coverImageUrl: input.coverImageUrl || null,
    tags: parseTags(input.tags),
    categoryId: input.categoryId,
    leagueId: input.leagueId || null,
    status,
    publishedAt,
    scheduledFor,
    // A human touching AI output marks it as edited.
    origin: existing?.origin === ContentOrigin.AI ? ContentOrigin.AI_EDITED : (existing?.origin ?? ContentOrigin.HUMAN),
    authorId: existing?.authorId ?? session.adminId,
  };

  let savedId: string;
  try {
    const saved = existing
      ? await prisma.article.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.article.create({ data, select: { id: true } });
    savedId = saved.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return { errors: { slug: "Another article already uses this slug" } };
    throw err;
  }

  revalidatePath("/", "layout");
  if (!existing) redirect(`/admin/articles/${savedId}/edit?created=1`);
  return { message: MESSAGES[input.intent] };
}

export async function deleteArticle(id: string): Promise<void> {
  const session = await requireAdmin();
  const article = await prisma.article.findUnique({ where: { id }, select: { authorId: true } });
  if (article) {
    if (session.role !== AdminRole.SUPER_ADMIN && article.authorId !== session.adminId)
      throw new Error("Only a super admin or the article's author can delete it.");
    await prisma.article.delete({ where: { id } });
    revalidatePath("/", "layout");
  }
  redirect("/admin/articles");
}

function parseTags(raw: string): string[] {
  const tags = raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  return [...new Set(tags)].slice(0, 10);
}
