import type { Prisma } from "@prisma/client";
import { COMPETITIONS } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { getFixturesProvider, type NormalizedFixture, type NormalizedTeam } from "@/lib/providers";

export interface MatchSyncResult {
  provider: string;
  fixtures: number;
  leagues: number;
  teams: number;
  dryRun?: boolean;
}

/** In-play matches only. Cheap: run every minute or two during match windows. */
export async function syncLiveMatches(): Promise<MatchSyncResult> {
  const provider = getFixturesProvider();
  return { provider: provider.name, ...(await upsertFixtures(await provider.getLive())) };
}

/** Recent results + upcoming fixtures. Run a few times a day. */
// 7 days each way keeps a full matchweek of results and fixtures on every league page. The Champions League
// plays only every 2-4 weeks, so cups also look further back, to always include the last matchday.
// About 100 ESPN requests per run.
export async function syncMatchWindow({ daysBack = 7, daysAhead = 7, cupDaysBack = 28, dryRun = false } = {}): Promise<MatchSyncResult> {
  const provider = getFixturesProvider();
  const from = offsetDay(-daysBack);
  const to = offsetDay(daysAhead);
  const cups = COMPETITIONS.filter((c) => c.kind === "cup");
  const [fixtures, olderCupFixtures] = await Promise.all([
    provider.getFixtures(from, to),
    cupDaysBack > daysBack ? provider.getFixtures(offsetDay(-cupDaysBack), offsetDay(-daysBack - 1), cups) : Promise.resolve([]),
  ]);
  fixtures.push(...olderCupFixtures);
  if (dryRun) return { provider: provider.name, fixtures: fixtures.length, leagues: 0, teams: 0, dryRun };
  return { provider: provider.name, ...(await upsertFixtures(fixtures)) };
}

async function upsertFixtures(fixtures: NormalizedFixture[]) {
  // Leagues are keyed by our own slug, so they survive a provider switch.
  const leagueIds = new Map<string, string>();
  for (const { league } of fixtures) {
    if (leagueIds.has(league.externalId)) continue;
    const { id } = await prisma.league.upsert({
      where: { slug: league.config.slug },
      create: {
        externalId: league.externalId,
        slug: league.config.slug,
        name: league.config.name,
        country: league.config.country,
        logoUrl: league.logoUrl,
        season: league.season,
      },
      update: { externalId: league.externalId, logoUrl: league.logoUrl, season: league.season },
      select: { id: true },
    });
    leagueIds.set(league.externalId, id);
  }

  const teams = new Map<string, { team: NormalizedTeam; leagueId: string }>();
  for (const f of fixtures) {
    const leagueId = leagueIds.get(f.league.externalId)!;
    for (const team of [f.home, f.away]) teams.set(team.externalId, { team, leagueId });
  }
  const teamIds = new Map<string, string>();
  await Promise.all(
    [...teams.values()].map(async ({ team, leagueId }) => {
      const { id } = await prisma.team.upsert({
        where: { externalId: team.externalId },
        create: {
          externalId: team.externalId,
          name: team.name,
          shortName: team.shortName,
          slug: slugify(team.name),
          logoUrl: team.logoUrl,
          leagueId,
        },
        update: { name: team.name, shortName: team.shortName, logoUrl: team.logoUrl },
        select: { id: true },
      });
      teamIds.set(team.externalId, id);
    }),
  );

  await Promise.all(
    fixtures.map((f) => {
      const data = {
        leagueId: leagueIds.get(f.league.externalId)!,
        season: f.league.season,
        round: f.round,
        kickoffAt: f.kickoffAt,
        status: f.status,
        minute: f.minute,
        venue: f.venue,
        homeTeamId: teamIds.get(f.home.externalId)!,
        awayTeamId: teamIds.get(f.away.externalId)!,
        homeScore: f.homeScore,
        awayScore: f.awayScore,
        rawPayload: f.raw as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
      };
      return prisma.match.upsert({
        where: { externalId: f.externalId },
        create: { externalId: f.externalId, ...data },
        update: data,
      });
    }),
  );

  return { fixtures: fixtures.length, leagues: leagueIds.size, teams: teamIds.size };
}

function offsetDay(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
