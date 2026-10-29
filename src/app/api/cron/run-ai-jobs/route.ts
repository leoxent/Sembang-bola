import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/auth/cron";
import { runJobs } from "@/lib/ai/jobs";

export const dynamic = "force-dynamic";
// Each generation takes roughly 20-90s. Needs a plan that allows long functions when deployed (e.g. Vercel Pro).
export const maxDuration = 300;

// GET /api/cron/run-ai-jobs[?max=3]
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const max = Math.min(Number(req.nextUrl.searchParams.get("max")) || 3, 10);
  const results = await runJobs({ max, budgetMs: maxDuration * 1000 });
  return NextResponse.json({ ran: results.length, results });
}
