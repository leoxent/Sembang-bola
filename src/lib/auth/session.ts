import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_HINT_COOKIE, SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./jwt";

export interface Session {
  adminId: string;
  name: string;
  username: string;
  role: AdminRole;
  avatarUrl: string | null;
}

export async function createSession(adminId: string, sessionVersion: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession({ adminId, ver: sessionVersion }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  jar.set(ADMIN_HINT_COOKIE, "1", { path: "/", sameSite: "lax", maxAge: SESSION_DAYS * 86_400 });
}

/** Valid token + admin still active + session not revoked. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const admin = await prisma.admin.findUnique({
    where: { id: token.adminId },
    select: { id: true, name: true, username: true, role: true, avatarUrl: true, isActive: true, isBot: true, sessionVersion: true },
  });
  if (!admin || !admin.isActive || admin.isBot || admin.sessionVersion !== token.ver) return null;
  return { adminId: admin.id, name: admin.name, username: admin.username, role: admin.role, avatarUrl: admin.avatarUrl };
});

/** Use at the top of every admin page and server action (middleware alone doesn't cover actions). */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireSuperAdmin(): Promise<Session> {
  const session = await requireAdmin();
  if (session.role !== AdminRole.SUPER_ADMIN) redirect("/admin");
  return session;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ADMIN_HINT_COOKIE);
}
