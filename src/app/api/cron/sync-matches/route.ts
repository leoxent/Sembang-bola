import { NextResponse, type NextRequest } from "next/server";
import { sendAlert } from "@/lib/alerts";
import { isAuthorizedCron } from "@/lib/auth/cron";
import { syncLiveMatches, syncMatchWindow } from "@/lib/sync/matches";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/sync-matches?mode=live|window[&dryRun=1]
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const mode = params.get("mode") === "live" ? "live" : "window";
  try {
    const result = mode === "live" ? await syncLiveMatches() : await syncMatchWindow({ dryRun: params.has("dryRun") });
    // Two weeks of six competitions always has matches; none means the provider changed or is blocking us.
    if (mode === "window" && result.fixtures === 0) {
      await sendAlert(`Sync perlawanan (${result.provider}) pulangkan 0 perlawanan. API mungkin berubah atau disekat.`);
    }
    return NextResponse.json({ mode, ...result });
  } catch (err) {
    console.error("[sync-matches]", err);
    // Live sync runs every minute or two, so only the window sync alerts: one outage, a few messages.
    if (mode === "window") await sendAlert(`Sync perlawanan gagal: ${err instanceof Error ? err.message : err}`.slice(0, 600));
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 502 });
  }
}
