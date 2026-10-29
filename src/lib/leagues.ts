// Every competition the site covers, with each data provider's identifier.
// `kind` separates domestic leagues from the Champions League (a cup with a league phase).
export const COMPETITIONS = [
  { slug: "premier-league", name: "Premier League", shortName: "EPL", country: "England", espn: "eng.1", footballData: "PL", kind: "league" },
  { slug: "la-liga", name: "La Liga", shortName: "La Liga", country: "Spain", espn: "esp.1", footballData: "PD", kind: "league" },
  { slug: "serie-a", name: "Serie A", shortName: "Serie A", country: "Italy", espn: "ita.1", footballData: "SA", kind: "league" },
  { slug: "bundesliga", name: "Bundesliga", shortName: "Bundesliga", country: "Germany", espn: "ger.1", footballData: "BL1", kind: "league" },
  { slug: "ligue-1", name: "Ligue 1", shortName: "Ligue 1", country: "France", espn: "fra.1", footballData: "FL1", kind: "league" },
  { slug: "liga-juara-juara", name: "Liga Juara-Juara", shortName: "UCL", country: "Eropah", espn: "uefa.champions", footballData: "CL", kind: "cup" },
] as const;

export type LeagueConfig = (typeof COMPETITIONS)[number];
