import type { NextRequest } from "next/server";

// Cron routes expect "Authorization: Bearer <CRON_SECRET>" (Vercel Cron sends this automatically).
// With no CRON_SECRET set they are open in development and locked in production.
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
