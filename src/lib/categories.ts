// Categories that approved AI drafts are filed under (see approveAiContent), so they must always exist.
export const PROTECTED_CATEGORY_SLUGS = ["berita", "laporan-perlawanan", "player-of-the-week"];

// The RENCANA section is shown to readers as "Artikel" (features: legends, rules, history...).
export const SECTION_LABEL = { BERITA: "Berita", RENCANA: "Artikel" } as const;
export const SECTION_PATH = { BERITA: "/berita", RENCANA: "/artikel" } as const;
