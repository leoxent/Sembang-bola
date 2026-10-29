// An article's cover: the editor's own image if set, otherwise the automatic card from /og/article/:id.
// `?v=` changes whenever the article is saved, so browsers and CDNs never show a stale card.

// Bump when the cover design changes (e.g. a rebrand), so already-cached covers are refetched everywhere.
const COVER_DESIGN = 2;

export const autoCoverUrl = (a: { id: string; updatedAt: Date | string }) =>
  `/og/article/${a.id}?v=${new Date(a.updatedAt).getTime()}-${COVER_DESIGN}`;

export const coverFor = (a: { id: string; coverImageUrl: string | null; updatedAt: Date | string }) =>
  a.coverImageUrl || autoCoverUrl(a);
