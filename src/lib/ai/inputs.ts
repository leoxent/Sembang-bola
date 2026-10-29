import { createHash } from "node:crypto";
import { MatchStatus } from "@prisma/client";
import { toTimeline } from "@/lib/match-events";
import { prisma } from "@/lib/prisma";
import { performanceScore, statNum } from "@/lib/scoring";

// Builds the compact, fact-only JSON the model writes from. Everything the model may state must be in here.

export const hashInput = (input: unknown, promptVersion: string) =>
  createHash("sha256").update(promptVersion).update(JSON.stringify(input)).digest("hex");

const TEAM_STAT_KEYS = [
  "possessionPct", "totalShots", "shotsOnTarget", "wonCorners", "totalPasses", "passPct",
  "totalTackles", "interceptions", "saves", "foulsCommitted", "offsides", "yellowCards", "redCards",
];

export async function buildMatchInput(matchId: string) {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      league: true,
      homeTeam: true,
      awayTeam: true,
      playerStats: { include: { player: { select: { name: true, position: true } } } },
    },
  });
  if (!m) throw new Error(`Match ${matchId} not found`);
  if (m.status !== MatchStatus.FINISHED) throw new Error("Match is not finished yet");
  if (m.playerStats.length === 0) throw new Error("Player stats not synced yet");

  const teamByExternal = (ext: string | null) =>
    ext === m.homeTeam.externalId ? m.homeTeam.name : ext === m.awayTeam.externalId ? m.awayTeam.name : null;
  const stats = (m.teamStats ?? {}) as Record<string, Record<string, string>>;
  const pick = (ext: string) =>
    Object.fromEntries(TEAM_STAT_KEYS.filter((k) => stats[ext]?.[k] != null).map((k) => [k, stats[ext][k]]));

  const input = {
    competition: m.league.name,
    season: `${m.season}/${String(m.season + 1).slice(-2)}`,
    round: m.round,
    kickoffUtc: m.kickoffAt.toISOString(),
    venue: m.venue,
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    finalScore: { [m.homeTeam.name]: m.homeScore, [m.awayTeam.name]: m.awayScore },
    timeline: toTimeline(m.events).map(({ team, ...e }) => ({ ...e, team: teamByExternal(team) })),
    teamStats: { [m.homeTeam.name]: pick(m.homeTeam.externalId), [m.awayTeam.name]: pick(m.awayTeam.externalId) },
    teamStatNotes: "passPct is a fraction (0.9 = 90%). possessionPct is a percentage.",
    players: m.playerStats.map((s) => {
      const x = (s.extra ?? {}) as Record<string, unknown>;
      return {
        name: s.player.name,
        team: s.teamId === m.homeTeamId ? m.homeTeam.name : m.awayTeam.name,
        position: s.player.position,
        started: Boolean(x.starter),
        cameOffBench: Boolean(x.subbedIn),
        goals: s.goals,
        assists: s.assists,
        shots: statNum(x, "totalShots"),
        shotsOnTarget: statNum(x, "shotsOnTarget"),
        ...(s.player.position?.startsWith("G") && { saves: statNum(x, "saves"), goalsConceded: statNum(x, "goalsConceded") }),
        yellowCards: statNum(x, "yellowCards"),
        redCards: statNum(x, "redCards"),
      };
    }),
    dataNotes: "Playing minutes, xG, passes and tackles per player are not available.",
  };
  return { match: m, input };
}

export const POTW_SHORTLIST_SIZE = 8;

/** Aggregates every finished match in the window and shortlists the top players by performance score. */
export async function buildPotwInput({ from, to, leagueId }: { from: Date; to: Date; leagueId?: string }) {
  const lines = await prisma.playerMatchStat.findMany({
    where: { match: { status: MatchStatus.FINISHED, kickoffAt: { gte: from, lt: to }, ...(leagueId && { leagueId }) } },
    include: {
      player: { select: { id: true, name: true, position: true } },
      match: {
        select: {
          kickoffAt: true,
          homeScore: true,
          awayScore: true,
          homeTeamId: true,
          league: { select: { name: true } },
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      },
    },
  });

  type Candidate = {
    id: string;
    name: string;
    position: string | null;
    team: string;
    score: number;
    totals: { goals: number; assists: number; shotsOnTarget: number; saves: number };
    matches: Record<string, unknown>[];
  };
  const byPlayer = new Map<string, Candidate>();

  for (const l of lines) {
    const x = (l.extra ?? {}) as Record<string, unknown>;
    const isHome = l.teamId === l.match.homeTeamId;
    const team = isHome ? l.match.homeTeam.name : l.match.awayTeam.name;
    const [gf, ga] = isHome ? [l.match.homeScore ?? 0, l.match.awayScore ?? 0] : [l.match.awayScore ?? 0, l.match.homeScore ?? 0];
    const c = byPlayer.get(l.player.id) ?? {
      id: l.player.id,
      name: l.player.name,
      position: l.player.position,
      team,
      score: 0,
      totals: { goals: 0, assists: 0, shotsOnTarget: 0, saves: 0 },
      matches: [],
    };
    c.score += performanceScore(l);
    c.totals.goals += l.goals;
    c.totals.assists += l.assists;
    c.totals.shotsOnTarget += statNum(x, "shotsOnTarget");
    c.totals.saves += statNum(x, "saves");
    c.matches.push({
      competition: l.match.league.name,
      dateUtc: l.match.kickoffAt.toISOString().slice(0, 10),
      opponent: isHome ? l.match.awayTeam.name : l.match.homeTeam.name,
      venue: isHome ? "home" : "away",
      result: `${gf > ga ? "W" : gf < ga ? "L" : "D"} ${gf}-${ga}`,
      started: Boolean(x.starter),
      goals: l.goals,
      assists: l.assists,
      shots: statNum(x, "totalShots"),
      shotsOnTarget: statNum(x, "shotsOnTarget"),
      ...(l.player.position?.startsWith("G") && { saves: statNum(x, "saves"), goalsConceded: statNum(x, "goalsConceded") }),
      cards: statNum(x, "yellowCards") + statNum(x, "redCards") * 10 > 0 ? { yellow: statNum(x, "yellowCards"), red: statNum(x, "redCards") } : undefined,
    });
    byPlayer.set(l.player.id, c);
  }

  const candidates = [...byPlayer.values()]
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, POTW_SHORTLIST_SIZE)
    .map((c) => ({ ...c, score: Math.round(c.score * 10) / 10 }));

  const input = {
    periodUtc: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    matchesConsidered: new Set(lines.map((l) => l.matchId)).size,
    shortlistMethod:
      "Top players by a simple score: goals×3 + assists×2 + shots on target×0.5 + saves×0.4 − yellow×0.5 − red×2, summed over the period.",
    candidates,
    dataNotes: "Playing minutes, xG, passes and tackles per player are not available.",
  };
  return { candidates, input };
}
