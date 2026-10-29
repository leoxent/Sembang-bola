import { NextResponse, type NextRequest } from "next/server";
import { sendAlert } from "@/lib/alerts";
import { isAuthorizedCron } from "@/lib/auth/cron";
import { syncPlayerStats } from "@/lib/sync/player-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/sync-player-stats[?limit=10]
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 10, 30);
  try {
    return NextResponse.json(await syncPlayerStats({ limit }));
  } catch (err) {
    console.error("[sync-player-stats]", err);
    await sendAlert(`Sync statistik pemain gagal: ${err instanceof Error ? err.message : err}`.slice(0, 600));
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 502 });
  }
}
