import { NextResponse, type NextRequest } from "next/server";
import { enqueueFeature, enqueueWeeklyRoundups } from "@/lib/ai/jobs";
import { isAuthorizedCron } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

// GET /api/cron/weekly: schedule for Monday morning. Queues Rex's weekly jobs; /api/cron/run-ai-jobs then runs them.
// - one "Apa jadi minggu ni" roundup per league (published automatically)
// - one Rencana feature (waits for review)
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roundups = await enqueueWeeklyRoundups();
  await enqueueFeature();
  return NextResponse.json({ queued: { roundups, features: 1 } });
}
