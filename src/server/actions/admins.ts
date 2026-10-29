"use server";

import bcrypt from "bcryptjs";
import { AdminRole, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, requireAdmin, requireSuperAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface AdminFormState {
  errors?: Partial<Record<string, string>>;
  message?: string;
}

const AVATAR_RE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/, "3–30 characters: lowercase letters, numbers, dots or underscores"),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  title: z.string().trim().max(80, "Keep the title under 80 characters"),
  bio: z.string().trim().max(500, "Keep the bio under 500 characters"),
  avatarUrl: z
    .string()
    .max(250_000, "That image is too large")
    // "/rex/avatar" is Rex's built-in picture, kept when its profile is saved without a new upload.
    .refine((v) => v === "" || v === "/rex/avatar" || AVATAR_RE.test(v), "Unsupported image format"),
});

const roleSchema = z.enum(AdminRole);
const passwordSchema = z.string().min(10, "Password must be at least 10 characters").max(200);

// ─── Helpers ────────────────────────────────────────────────────────────────

const read = (fd: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));

function toErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

function duplicateError(err: unknown): AdminFormState | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return null;
  const target = String(err.meta?.target ?? "");
  if (target.includes("username")) return { errors: { username: "That username is taken" } };
  if (target.includes("email")) return { errors: { email: "Another admin already uses this email" } };
  return { message: "That admin already exists." };
}

function parsePasswordPair(fd: FormData): { password: string } | { errors: Record<string, string> } {
  const password = String(fd.get("password") ?? "");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { errors: { password: parsed.error.issues[0].message } };
  if (password !== String(fd.get("confirmPassword") ?? "")) return { errors: { confirmPassword: "Passwords don't match" } };
  return { password };
}

const detailsData = (d: z.infer<typeof detailsSchema>) => ({
  name: d.name,
  username: d.username,
  email: d.email,
  title: d.title || null,
  bio: d.bio || null,
  avatarUrl: d.avatarUrl || null,
});

// ─── Actions ────────────────────────────────────────────────────────────────

/** Main admin only. */
export async function createAdmin(_prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  await requireSuperAdmin();

  const details = detailsSchema.safeParse(read(fd, Object.keys(detailsSchema.shape)));
  const role = roleSchema.safeParse(String(fd.get("role")));
  const pw = parsePasswordPair(fd);
  const errors = {
    ...(details.success ? {} : toErrors(details.error.issues)),
    ...(role.success ? {} : { role: "Choose a role" }),
    ...("errors" in pw ? pw.errors : {}),
  };
  if (!details.success || !role.success || "errors" in pw) return { errors };

  try {
    await prisma.admin.create({
      data: { ...detailsData(details.data), role: role.data, passwordHash: await bcrypt.hash(pw.password, 12) },
    });
  } catch (err) {
    const dup = duplicateError(err);
    if (dup) return dup;
    throw err;
  }
  revalidatePath("/admin/team");
  redirect(`/admin/team?created=${encodeURIComponent(details.data.username)}`);
}

/**
 * Edit profile details. Admins can edit their own; the main admin can edit anyone's.
 * Only the main admin can change usernames and roles, and nobody can change their own role.
 */
export async function updateAdmin(id: string, _prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const session = await requireAdmin();
  const isSelf = id === session.adminId;
  const isSuper = session.role === AdminRole.SUPER_ADMIN;
  if (!isSelf && !isSuper) return { message: "You can only edit your own profile." };

  const existing = await prisma.admin.findUnique({ where: { id }, select: { username: true, isBot: true } });
  if (!existing) return { message: "This admin no longer exists." };

  const raw = read(fd, Object.keys(detailsSchema.shape));
  if (!isSuper || existing.isBot) raw.username = existing.username; // Rex's username is fixed
  const details = detailsSchema.safeParse(raw);
  if (!details.success) return { errors: toErrors(details.error.issues) };

  let role: AdminRole | undefined;
  if (isSuper && !isSelf && !existing.isBot) {
    const parsed = roleSchema.safeParse(String(fd.get("role")));
    if (!parsed.success) return { errors: { role: "Choose a role" } };
    role = parsed.data;
  }

  try {
    await prisma.admin.update({ where: { id }, data: { ...detailsData(details.data), ...(role && { role }) } });
  } catch (err) {
    const dup = duplicateError(err);
    if (dup) return dup;
    throw err;
  }
  revalidatePath("/admin", "layout");
  return { message: "Profile saved" };
}

/**
 * Change a password. For your own account the current password is required and you stay signed in;
 * the main admin can reset anyone else's, which signs that admin out everywhere.
 */
export async function changePassword(id: string, _prev: AdminFormState, fd: FormData): Promise<AdminFormState> {
  const session = await requireAdmin();
  const isSelf = id === session.adminId;
  if (!isSelf && session.role !== AdminRole.SUPER_ADMIN) return { message: "Not allowed." };

  const admin = await prisma.admin.findUnique({ where: { id }, select: { passwordHash: true, isBot: true } });
  if (!admin) return { message: "This admin no longer exists." };
  if (admin.isBot) return { message: "Rex is an AI writer and can't sign in, so it has no password." };

  if (isSelf) {
    const current = String(fd.get("currentPassword") ?? "");
    if (!(await bcrypt.compare(current, admin.passwordHash)))
      return { errors: { currentPassword: "Current password is incorrect" } };
  }
  const pw = parsePasswordPair(fd);
  if ("errors" in pw) return { errors: pw.errors };

  const updated = await prisma.admin.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(pw.password, 12), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  if (isSelf) await createSession(id, updated.sessionVersion); // other devices are signed out, this one isn't
  return { message: isSelf ? "Password changed. Other devices have been signed out." : "Password reset. They've been signed out everywhere." };
}

/** Main admin only; can't deactivate yourself. Deactivating signs the admin out immediately. */
export async function setAdminActive(id: string, active: boolean): Promise<void> {
  const session = await requireSuperAdmin();
  if (id === session.adminId) throw new Error("You can't deactivate your own account.");
  if ((await prisma.admin.findUnique({ where: { id }, select: { isBot: true } }))?.isBot) throw new Error("Rex can't be deactivated.");
  await prisma.admin.update({
    where: { id },
    data: { isActive: active, ...(!active && { sessionVersion: { increment: 1 } }) },
  });
  revalidatePath("/admin/team", "layout");
}

/** Main admin only; can't delete yourself. Their articles are kept, with no author. */
export async function deleteAdmin(id: string): Promise<void> {
  const session = await requireSuperAdmin();
  if (id === session.adminId) throw new Error("You can't delete your own account.");
  if ((await prisma.admin.findUnique({ where: { id }, select: { isBot: true } }))?.isBot) throw new Error("Rex can't be deleted.");
  await prisma.admin.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  redirect("/admin/team");
}
