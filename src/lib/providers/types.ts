import type { MatchStatus } from "@prisma/client";
import type { LeagueConfig } from "@/lib/leagues";

// Provider-neutral shapes. External ids are always prefixed: "espn:384", "fd:57".

export interface NormalizedTeam {
  externalId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}

export interface NormalizedFixture {
  externalId: string;
  league: { config: LeagueConfig; externalId: string; logoUrl: string | null; season: number };
  round: string | null;
  kickoffAt: Date;
  status: MatchStatus;
  minute: number | null;
  venue: string | null;
  home: NormalizedTeam;
  away: NormalizedTeam;
  homeScore: number | null;
  awayScore: number | null;
  raw: unknown;
}

export interface FixturesProvider {
  name: string;
  /** Fixtures with kickoff between two UTC dates (inclusive), for all competitions or the ones given. */
  getFixtures(from: Date, to: Date, competitions?: readonly LeagueConfig[]): Promise<NormalizedFixture[]>;
  /** Fixtures currently in play, in every competition. */
  getLive(): Promise<NormalizedFixture[]>;
}

export interface NormalizedPlayerStat {
  player: { externalId: string; name: string; position: string | null; photoUrl: string | null };
  teamExternalId: string;
  goals: number;
  assists: number;
  stats: Record<string, number | boolean>; // shots, saves, cards, starter, subbedIn...
}

export interface MatchEvent {
  type: string; // "goal", "yellow-card", "substitution"...
  minute: string | null;
  text: string | null;
  teamExternalId: string | null;
}

export interface MatchDetail {
  players: NormalizedPlayerStat[];
  teamStats: Record<string, Record<string, string>>; // teamExternalId → stat name → value
  events: MatchEvent[];
}
