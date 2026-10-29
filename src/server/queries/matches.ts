import { cache } from "react";
import { MatchStatus, type Prisma } from "@prisma/client";
import { COMPETITIONS } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;

export const matchListSelect = {
  id: true,
  kickoffAt: true,
  status: true,
  minute: true,
  homeScore: true,
  awayScore: true,
  league: { select: { name: true, slug: true, logoUrl: true } },
  homeTeam: { select: { name: true, shortName: true, logoUrl: true } },
  awayTeam: { select: { name: true, shortName: true, logoUrl: true } },
} satisfies Prisma.MatchSelect;

export type MatchListItem = Prisma.MatchGetPayload<{ select: typeof matchListSelect }>;

const LIVE = [MatchStatus.LIVE, MatchStatus.HALFTIME];

export async function getHomeMatches() {
  const now = Date.now();
  const [live, results, upcoming] = await Promise.all([
    prisma.match.findMany({ where: { status: { in: LIVE } }, orderBy: { kickoffAt: "asc" }, select: matchListSelect }),
    prisma.match.findMany({
      where: { status: MatchStatus.FINISHED, kickoffAt: { gte: new Date(now - 4 * DAY) } },
      orderBy: { kickoffAt: "desc" },
      take: 30,
      select: matchListSelect,
    }),
    prisma.match.findMany({
      where: { status: MatchStatus.SCHEDULED, kickoffAt: { gte: new Date(now - 3 * 3_600_000), lte: new Date(now + 7 * DAY) } },
      orderBy: { kickoffAt: "asc" },
      take: 30,
      select: matchListSelect,
    }),
  ]);
  return { live, results, upcoming };
}

export const getLeagues = cache(() =>
  prisma.league
    .findMany({ select: { id: true, name: true, slug: true, country: true, logoUrl: true, season: true } })
    .then((leagues) => {
      // Site order: the five leagues, then the Champions League; with each one's short name and kind.
      const order = (slug: string) => COMPETITIONS.findIndex((c) => c.slug === slug);
      return leagues
        .sort((a, b) => order(a.slug) - order(b.slug))
        .map((l) => {
          const config = COMPETITIONS.find((c) => c.slug === l.slug);
          return { ...l, shortName: config?.shortName ?? l.name, kind: config?.kind ?? "league" };
        });
    }),
);

export async function getLeagueMatches(leagueId: string) {
  const [results, fixtures] = await Promise.all([
    prisma.match.findMany({
      where: { leagueId, status: { in: [MatchStatus.FINISHED, ...LIVE] } },
      orderBy: { kickoffAt: "desc" },
      take: 30,
      select: matchListSelect,
    }),
    prisma.match.findMany({
      where: { leagueId, status: { in: [MatchStatus.SCHEDULED, MatchStatus.POSTPONED] }, kickoffAt: { gte: new Date(Date.now() - DAY) } },
      orderBy: { kickoffAt: "asc" },
      take: 30,
      select: matchListSelect,
    }),
  ]);
  return { results, fixtures };
}

/** Our club page slugs for teams known by provider id (standings and top scorers come from ESPN, not our DB). */
export async function getTeamSlugs(externalIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(externalIds.filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();
  const teams = await prisma.team.findMany({ where: { externalId: { in: ids } }, select: { externalId: true, slug: true } });
  return new Map(teams.map((t) => [t.externalId, t.slug]));
}

export const getTeam = cache((slug: string) =>
  prisma.team.findUnique({
    where: { slug },
    select: { id: true, externalId: true, name: true, shortName: true, slug: true, logoUrl: true, league: { select: { id: true, name: true, slug: true } } },
  }),
);

/** A club's matches in every competition: recent results and upcoming fixtures. */
export async function getTeamMatches(teamId: string) {
  const ofTeam = { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] };
  const [results, fixtures] = await Promise.all([
    prisma.match.findMany({
      where: { ...ofTeam, status: { in: [MatchStatus.FINISHED, ...LIVE] } },
      orderBy: { kickoffAt: "desc" },
      take: 10,
      select: matchListSelect,
    }),
    prisma.match.findMany({
      where: { ...ofTeam, status: { in: [MatchStatus.SCHEDULED, MatchStatus.POSTPONED] }, kickoffAt: { gte: new Date(Date.now() - DAY) } },
      orderBy: { kickoffAt: "asc" },
      take: 10,
      select: matchListSelect,
    }),
  ]);
  return { results, fixtures };
}

export const getMatch = cache((id: string) =>
  prisma.match.findUnique({
    where: { id },
    include: {
      league: { select: { name: true, slug: true, logoUrl: true } },
      homeTeam: { select: { id: true, externalId: true, name: true, shortName: true, slug: true, logoUrl: true } },
      awayTeam: { select: { id: true, externalId: true, name: true, shortName: true, slug: true, logoUrl: true } },
      playerStats: { include: { player: { select: { name: true, position: true } } } },
    },
  }),
);

export type MatchDetail = NonNullable<Awaited<ReturnType<typeof getMatch>>>;
