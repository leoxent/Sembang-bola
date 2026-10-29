import { COMPETITIONS } from "@/lib/leagues";
import { getStandings } from "@/lib/providers/espn-standings";

// Matches Rex reports on and publishes without review: every Champions League match, and in the domestic leagues
// anything involving a team currently in its league's top 6, plus the Premier League's big clubs whatever their
// position. Names are ESPN's, same as our Team rows.
const TOP_N = 6;
const ALWAYS_FEATURED: Record<string, string[]> = {
  "premier-league": ["Manchester United", "Liverpool", "Chelsea", "Tottenham Hotspur", "Manchester City"],
};

export async function featuredTeams(leagueSlug: string): Promise<Set<string>> {
  const teams = new Set(ALWAYS_FEATURED[leagueSlug] ?? []);
  const espn = COMPETITIONS.find((l) => l.slug === leagueSlug)?.espn;
  if (espn) {
    try {
      for (const row of (await getStandings(espn)).slice(0, TOP_N)) teams.add(row.name);
    } catch {
      // Standings unavailable: fall back to the always-featured clubs only.
    }
  }
  return teams;
}

export async function isFeaturedMatch(m: { leagueSlug: string; homeTeam: string; awayTeam: string }): Promise<boolean> {
  // Every Champions League match is big enough to report on.
  if (COMPETITIONS.find((c) => c.slug === m.leagueSlug)?.kind === "cup") return true;
  const teams = await featuredTeams(m.leagueSlug);
  return teams.has(m.homeTeam) || teams.has(m.awayTeam);
}
