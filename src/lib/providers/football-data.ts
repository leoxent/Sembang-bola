import { MatchStatus } from "@prisma/client";
import { COMPETITIONS, type LeagueConfig } from "@/lib/leagues";
import type { FixturesProvider, NormalizedFixture } from "./types";

// football-data.org v4 — official, free tier (10 requests/min). Fixtures and results only:
// no per-player match stats, so Player of the Week data needs ESPN.
const BASE_URL = "https://api.football-data.org/v4";

interface FdTeam {
  id: number;
  name: string;
  shortName?: string | null;
  crest?: string | null;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  minute?: number | string | null;
  venue?: string | null;
  competition: { code: string; emblem?: string | null };
  season: { startDate: string };
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

const STATUS_MAP: Record<string, MatchStatus> = {
  SCHEDULED: MatchStatus.SCHEDULED,
  TIMED: MatchStatus.SCHEDULED,
  IN_PLAY: MatchStatus.LIVE,
  PAUSED: MatchStatus.HALFTIME,
  FINISHED: MatchStatus.FINISHED,
  AWARDED: MatchStatus.FINISHED,
  POSTPONED: MatchStatus.POSTPONED,
  SUSPENDED: MatchStatus.POSTPONED,
  CANCELLED: MatchStatus.CANCELLED,
};

const id = (raw: number | string) => `fd:${raw}`;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

async function getMatches(from: Date, to: Date, competitions: readonly LeagueConfig[] = COMPETITIONS): Promise<FdMatch[]> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is not set");

  // dateTo is padded by a day so the range is inclusive whatever the API's convention.
  const toPadded = new Date(to);
  toPadded.setUTCDate(toPadded.getUTCDate() + 1);
  const params = new URLSearchParams({
    competitions: competitions.map((l) => l.footballData).join(","),
    dateFrom: isoDate(from),
    dateTo: isoDate(toPadded),
  });

  const res = await fetch(`${BASE_URL}/matches?${params}`, { headers: { "X-Auth-Token": key }, cache: "no-store" });
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { matches: FdMatch[] }).matches;
}

function toFixture(m: FdMatch): NormalizedFixture | null {
  const league = COMPETITIONS.find((l) => l.footballData === m.competition.code);
  if (!league) return null;
  const status = STATUS_MAP[m.status] ?? MatchStatus.SCHEDULED;
  const team = (t: FdTeam) => ({
    externalId: id(t.id),
    name: t.name,
    shortName: t.shortName ?? null,
    logoUrl: t.crest ?? null,
  });

  return {
    externalId: id(m.id),
    league: {
      config: league,
      externalId: id(league.footballData),
      logoUrl: m.competition.emblem ?? null,
      season: Number(m.season.startDate.slice(0, 4)),
    },
    round: m.matchday != null ? `Matchday ${m.matchday}` : null,
    kickoffAt: new Date(m.utcDate),
    status,
    minute: status === MatchStatus.LIVE && m.minute != null ? Number(m.minute) || null : null,
    venue: m.venue ?? null,
    home: team(m.homeTeam),
    away: team(m.awayTeam),
    homeScore: m.score.fullTime.home,
    awayScore: m.score.fullTime.away,
    raw: m,
  };
}

export const footballDataProvider: FixturesProvider = {
  name: "football-data",

  async getFixtures(from, to, competitions = COMPETITIONS) {
    // The API caps a request at a 10-day window.
    const out: NormalizedFixture[] = [];
    for (let start = new Date(from); start <= to; start.setUTCDate(start.getUTCDate() + 10)) {
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 9);
      const matches = await getMatches(start, end < to ? end : to, competitions);
      out.push(...matches.map(toFixture).filter((f): f is NormalizedFixture => f !== null));
    }
    return out;
  },

  async getLive() {
    const today = new Date();
    const fixtures = (await getMatches(today, today)).map(toFixture);
    return fixtures.filter(
      (f): f is NormalizedFixture => f !== null && (f.status === MatchStatus.LIVE || f.status === MatchStatus.HALFTIME),
    );
  },
};
