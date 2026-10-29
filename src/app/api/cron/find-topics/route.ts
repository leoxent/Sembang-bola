import { NextResponse, type NextRequest } from "next/server";
import { findHotTopics } from "@/lib/ai/news";
import { isAuthorizedCron } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// GET /api/cron/find-topics: web-searches current football news and saves topic briefs for review.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await findHotTopics());
  } catch (err) {
    console.error("[find-topics]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
