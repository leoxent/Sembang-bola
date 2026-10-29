"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

// Lockout: too many failures for one account, or from one IP, within the window blocks further tries.
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES_PER_ACCOUNT = 5;
const MAX_FAILURES_PER_IP = 20;

// Compared against when the account doesn't exist, so response time doesn't reveal valid usernames.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("not-a-real-password", 12));

async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel the first x-forwarded-for entry is the visitor's IP.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "Enter your username and password." };
  if (!process.env.AUTH_SECRET) return { error: "Server is missing AUTH_SECRET. Run `npm run admin:create` first." };

  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MS);
  const [accountFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({ where: { identifier, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { ip, createdAt: { gte: since } } }),
  ]);
  if (accountFailures >= MAX_FAILURES_PER_ACCOUNT || ipFailures >= MAX_FAILURES_PER_IP) {
    return { error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const admin = await prisma.admin.findFirst({
    // Bot accounts (Rex) can never sign in; to an attacker they look like a non-existent user.
    where: { isBot: false, ...(identifier.includes("@") ? { email: identifier } : { username: identifier }) },
  });
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? getDummyHash());
  if (!admin || !valid) {
    await prisma.loginAttempt.create({ data: { identifier, ip } });
    const left = MAX_FAILURES_PER_ACCOUNT - accountFailures - 1;
    return {
      error: left > 0 && left <= 2 ? `Invalid username or password. ${left} ${left === 1 ? "try" : "tries"} left.` : "Invalid username or password.",
    };
  }
  if (!admin.isActive) return { error: "This account has been deactivated. Contact the main admin." };

  await Promise.all([
    prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
    // A successful login clears this account's failures and prunes old rows.
    prisma.loginAttempt.deleteMany({
      where: { OR: [{ identifier }, { createdAt: { lt: new Date(Date.now() - 86_400_000) } }] },
    }),
  ]);
  await createSession(admin.id, admin.sessionVersion);

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
