import { MatchStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isFeaturedMatch } from "@/lib/ai/featured";
import { enqueueMatchSummary } from "@/lib/ai/jobs";
import { getEspnMatchDetail } from "@/lib/providers";

// ESPN finalises box scores shortly after full time; wait before fetching so we only fetch once.
const SETTLE_HOURS = 3;
// When a featured match's stats arrive (top 6 / Premier League big clubs, see lib/ai/featured.ts), Rex writes
// its report and publishes it straight away. Other matches get no automatic report (admins can queue one).
// Set AI_AUTO_SUMMARIES="false" to turn this off.
const AUTO_SUMMARIES = process.env.AI_AUTO_SUMMARIES !== "false";
const REPORT_MAX_AGE_DAYS = 3;

/**
 * Fetches player stats, team stats and key events for finished ESPN matches that don't have them yet.
 * One ESPN request per match. A match is marked done by setting `teamStats`, so it is never re-fetched.
 */
export async function syncPlayerStats({ limit = 10 } = {}) {
  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.FINISHED,
      externalId: { startsWith: "espn:" },
      teamStats: { equals: Prisma.AnyNull },
      kickoffAt: { lt: new Date(Date.now() - SETTLE_HOURS * 3_600_000) },
    },
    orderBy: { kickoffAt: "desc" },
    take: limit,
    select: {
      id: true,
      externalId: true,
      kickoffAt: true,
      league: { select: { externalId: true, slug: true } },
      homeTeam: { select: { id: true, externalId: true, name: true } },
      awayTeam: { select: { id: true, externalId: true, name: true } },
    },
  });

  let players = 0;
  let queuedSummaries = 0;
  for (const m of matches) {
    const detail = await getEspnMatchDetail(m.externalId, m.league.externalId);
    const teamIdByExternal = new Map([
      [m.homeTeam.externalId, m.homeTeam.id],
      [m.awayTeam.externalId, m.awayTeam.id],
    ]);

    await Promise.all(
      detail.players.map(async (p) => {
        const teamId = teamIdByExternal.get(p.teamExternalId);
        if (!teamId) return;
        const player = await prisma.player.upsert({
          where: { externalId: p.player.externalId },
          create: { ...p.player, teamId },
          update: { name: p.player.name, position: p.player.position, photoUrl: p.player.photoUrl, teamId },
          select: { id: true },
        });
        const data = { teamId, goals: p.goals, assists: p.assists, extra: p.stats };
        await prisma.playerMatchStat.upsert({
          where: { matchId_playerId: { matchId: m.id, playerId: player.id } },
          create: { matchId: m.id, playerId: player.id, ...data },
          update: data,
        });
        players++;
      }),
    );

    await prisma.match.update({
      where: { id: m.id },
      data: {
        teamStats: detail.teamStats as Prisma.InputJsonValue,
        events: detail.events as unknown as Prisma.InputJsonValue,
      },
    });
    if (
      AUTO_SUMMARIES &&
      detail.players.length > 0 &&
      // Old matches pulled in by a longer sync window are history, not news: no automatic report.
      m.kickoffAt.getTime() > Date.now() - REPORT_MAX_AGE_DAYS * 86_400_000 &&
      (await isFeaturedMatch({ leagueSlug: m.league.slug, homeTeam: m.homeTeam.name, awayTeam: m.awayTeam.name })) &&
      (await enqueueMatchSummary(m.id, { autoPublish: true }))
    )
      queuedSummaries++;
  }

  const remaining = await prisma.match.count({
    where: { status: MatchStatus.FINISHED, externalId: { startsWith: "espn:" }, teamStats: { equals: Prisma.AnyNull } },
  });
  return { matches: matches.length, players, queuedSummaries, remaining };
}
