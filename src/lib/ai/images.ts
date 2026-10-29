import { commonsMarkdown, searchCommons } from "@/lib/wikimedia";

const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Finds a free-licence photo of one of the named people on Wikimedia Commons.
 * Strict on purpose, because articles can publish without review: a result is only used when its file title
 * contains every part of the person's name, so an unrelated photo is never inserted.
 */
export async function findPhotoMarkdown(subjects: string[]): Promise<string | null> {
  for (const name of subjects.slice(0, 2)) {
    const parts = normalize(name).split(/\s+/).filter((p) => p.length > 1);
    if (parts.length === 0) continue;
    try {
      const results = await searchCommons(name, 10);
      const match = results.find((r) => {
        const title = normalize(r.title);
        return parts.every((p) => title.includes(p));
      });
      if (match) return commonsMarkdown(match, name);
    } catch {
      // Wikimedia unreachable: the article simply goes without a photo.
    }
  }
  return null;
}

/** Inserts a snippet after the body's first paragraph (or at the end of a one-paragraph body). */
export function insertAfterFirstParagraph(body: string, snippet: string): string {
  const breakAt = body.indexOf("\n\n");
  if (breakAt === -1) return `${body.trimEnd()}\n\n${snippet}\n`;
  return `${body.slice(0, breakAt)}\n\n${snippet}${body.slice(breakAt)}`;
}

/** Adds a photo of the article's main subject, if one is found. */
export async function withPhoto(body: string, subjects: string[] | undefined): Promise<string> {
  const photo = subjects?.length ? await findPhotoMarkdown(subjects) : null;
  return photo ? insertAfterFirstParagraph(body, photo) : body;
}
