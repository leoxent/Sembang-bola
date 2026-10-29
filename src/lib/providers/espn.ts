import { MatchStatus } from "@prisma/client";
import { COMPETITIONS, type LeagueConfig } from "@/lib/leagues";
import type { FixturesProvider, MatchDetail, NormalizedFixture } from "./types";

// ESPN's public site API (undocumented, no key). Personal, non-commercial use only:
// keep request volume low and cache everything in our DB.
const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const HEADERS = { "User-Agent": "SembangBola (personal non-commercial site)" };

// ─── Response shapes (only the fields we read) ─────────────────────────────

interface EspnCompetitor {
  homeAway: "home" | "away";
  score?: string;
  team: { id: string; displayName: string; shortDisplayName?: string; logo?: string };
}

interface EspnEvent {
  id: string;
  date: string;
  season?: { year: number };
  status: { displayClock?: string; type: { name: string; state: "pre" | "in" | "post" } };
  competitions: { venue?: { fullName?: string }; competitors: EspnCompetitor[] }[];
}

interface EspnScoreboard {
  leagues?: { logos?: { href: string; rel?: string[] }[]; season?: { year: number } }[];
  events?: EspnEvent[];
}

interface EspnRosterEntry {
  athlete: { id: string; displayName: string; headshot?: { href?: string } };
  position?: { abbreviation?: string };
  starter?: boolean;
  subbedIn?: boolean;
  subbedOut?: boolean;
  stats?: { name: string; value: number }[];
}

interface EspnSummary {
  rosters?: { team: { id: string }; roster?: EspnRosterEntry[] }[];
  boxscore?: { teams?: { team: { id: string }; statistics?: { name: string; displayValue: string }[] }[] };
  keyEvents?: {
    type?: { type?: string };
    clock?: { displayValue?: string };
    text?: string;
    team?: { id: string };
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function espnGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${path}`);
  return (await res.json()) as T;
}

const id = (raw: string) => `espn:${raw}`;

function toStatus(type: EspnEvent["status"]["type"]): MatchStatus {
  if (type.name === "STATUS_HALFTIME") return MatchStatus.HALFTIME;
  if (type.name === "STATUS_POSTPONED" || type.name === "STATUS_SUSPENDED" || type.name === "STATUS_DELAYED")
    return MatchStatus.POSTPONED;
  if (type.name === "STATUS_CANCELED" || type.name === "STATUS_ABANDONED") return MatchStatus.CANCELLED;
  if (type.state === "in") return MatchStatus.LIVE;
  if (type.state === "post") return MatchStatus.FINISHED;
  return MatchStatus.SCHEDULED;
}

function toFixture(e: EspnEvent, league: LeagueConfig, board: EspnScoreboard): NormalizedFixture {
  const comp = e.competitions[0];
  const side = (homeAway: "home" | "away") => comp.competitors.find((c) => c.homeAway === homeAway)!;
  const [home, away] = [side("home"), side("away")];
  const status = toStatus(e.status.type);
  const started = e.status.type.state !== "pre";
  const logos = board.leagues?.[0]?.logos ?? [];
  const score = (c: EspnCompetitor) => (started && c.score != null ? Number(c.score) : null);
  const team = (c: EspnCompetitor) => ({
    externalId: id(c.team.id),
    name: c.team.displayName,
    shortName: c.team.shortDisplayName ?? null,
    logoUrl: c.team.logo ?? null,
  });

  return {
    externalId: id(e.id),
    league: {
      config: league,
      externalId: id(league.espn),
      // The site has a dark theme, so prefer ESPN's logo variant made for dark backgrounds.
      logoUrl: (logos.find((l) => l.rel?.includes("dark")) ?? logos[0])?.href ?? null,
      season: e.season?.year ?? board.leagues?.[0]?.season?.year ?? new Date(e.date).getUTCFullYear(),
    },
    round: null, // ESPN's scoreboard doesn't expose the matchweek
    kickoffAt: new Date(e.date),
    status,
    minute: status === MatchStatus.LIVE ? parseInt(e.status.displayClock ?? "", 10) || null : null,
    venue: comp.venue?.fullName ?? null,
    home: team(home),
    away: team(away),
    homeScore: score(home),
    awayScore: score(away),
    raw: e,
  };
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

// ─── Provider ───────────────────────────────────────────────────────────────

export const espnProvider: FixturesProvider = {
  name: "espn",

  // ESPN rejects date ranges, so this is one request per league per day.
  // Leagues run in parallel, days sequentially, to keep the request rate modest.
  async getFixtures(from, to, competitions = COMPETITIONS) {
    const days: Date[] = [];
    for (const d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) days.push(new Date(d));

    const perLeague = await Promise.all(
      competitions.map(async (league) => {
        const out: NormalizedFixture[] = [];
        for (const day of days) {
          const board = await espnGet<EspnScoreboard>(`${league.espn}/scoreboard?dates=${yyyymmdd(day)}`);
          out.push(...(board.events ?? []).map((e) => toFixture(e, league, board)));
        }
        return out;
      }),
    );
    return perLeague.flat();
  },

  async getLive() {
    const perLeague = await Promise.all(
      COMPETITIONS.map(async (league) => {
        const board = await espnGet<EspnScoreboard>(`${league.espn}/scoreboard`);
        return (board.events ?? [])
          .filter((e) => e.status.type.state === "in")
          .map((e) => toFixture(e, league, board));
      }),
    );
    return perLeague.flat();
  },
};

/** Per-player stats, team stats and key events for one finished match. */
export async function getEspnMatchDetail(matchExternalId: string, leagueExternalId: string): Promise<MatchDetail> {
  const eventId = matchExternalId.replace(/^espn:/, "");
  const leagueSlug = leagueExternalId.replace(/^espn:/, "");
  const s = await espnGet<EspnSummary>(`${leagueSlug}/summary?event=${eventId}`);

  const players = (s.rosters ?? []).flatMap((r) =>
    (r.roster ?? [])
      .filter((p) => p.starter || p.subbedIn) // skip unused substitutes
      .map((p) => {
        const stats = Object.fromEntries((p.stats ?? []).map((st) => [st.name, st.value]));
        return {
          player: {
            externalId: id(p.athlete.id),
            name: p.athlete.displayName,
            position: p.position?.abbreviation ?? null,
            photoUrl: p.athlete.headshot?.href ?? null,
          },
          teamExternalId: id(r.team.id),
          goals: stats.totalGoals ?? 0,
          assists: stats.goalAssists ?? 0,
          stats: { ...stats, starter: !!p.starter, subbedIn: !!p.subbedIn, subbedOut: !!p.subbedOut },
        };
      }),
  );

  const teamStats = Object.fromEntries(
    (s.boxscore?.teams ?? []).map((t) => [
      id(t.team.id),
      Object.fromEntries((t.statistics ?? []).map((st) => [st.name, st.displayValue])),
    ]),
  );

  const events = (s.keyEvents ?? []).map((k) => ({
    type: k.type?.type ?? "unknown",
    minute: k.clock?.displayValue || null,
    text: k.text ?? null,
    teamExternalId: k.team ? id(k.team.id) : null,
  }));

  return { players, teamStats, events };
}
