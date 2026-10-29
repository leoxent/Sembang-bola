// League tables from ESPN's public standings API. Not stored in our DB: fetched on demand and cached for 15 minutes.

const HEADERS = { "User-Agent": "SembangBola (personal non-commercial site)" };

export type Zone = "ucl" | "uel" | "uecl" | "playoff" | "relegation" | "r16" | "koPlayoff" | "eliminated";

export interface StandingRow {
  rank: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  zone: Zone | null;
}

interface EspnEntry {
  team: { displayName: string; shortDisplayName?: string; logos?: { href: string }[] };
  note?: { description?: string };
  stats: { name: string; value?: number }[];
}

// ESPN describes zones in English text (its colour codes are sometimes malformed), so map by description.
function toZone(description?: string): Zone | null {
  if (!description) return null;
  const d = description.toLowerCase();
  if (d.includes("relegation") && d.includes("playoff")) return "playoff";
  if (d.includes("relegation")) return "relegation";
  // Champions League league phase
  if (d.includes("round of 16")) return "r16";
  if (d.includes("knockout") && d.includes("playoff")) return "koPlayoff";
  if (d.includes("eliminated")) return "eliminated";
  if (d.includes("champions league")) return "ucl";
  if (d.includes("europa league")) return "uel";
  if (d.includes("conference")) return "uecl";
  return null;
}

export async function getStandings(espnSlug: string): Promise<StandingRow[]> {
  const res = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/${espnSlug}/standings`, {
    headers: HEADERS,
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`ESPN standings ${res.status}`);
  const data = (await res.json()) as { children?: { standings?: { entries?: EspnEntry[] } }[] };

  return (data.children?.[0]?.standings?.entries ?? [])
    .map((e) => {
      const stat = (name: string) => e.stats.find((s) => s.name === name)?.value ?? 0;
      return {
        rank: stat("rank"),
        name: e.team.displayName,
        shortName: e.team.shortDisplayName ?? e.team.displayName,
        logoUrl: e.team.logos?.[0]?.href ?? null,
        played: stat("gamesPlayed"),
        won: stat("wins"),
        drawn: stat("ties"),
        lost: stat("losses"),
        goalsFor: stat("pointsFor"),
        goalsAgainst: stat("pointsAgainst"),
        goalDiff: stat("pointDifferential"),
        points: stat("points"),
        zone: toZone(e.note?.description),
      };
    })
    .sort((a, b) => a.rank - b.rank);
}
