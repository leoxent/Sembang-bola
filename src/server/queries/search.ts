import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { articleCardSelect, publicArticleWhere } from "./articles";

export const SEARCH_MIN_LENGTH = 2;

/**
 * Site search over published articles and clubs. Every word must appear somewhere (title, excerpt, tags or body),
 * so "haaland gol" finds articles about Haaland's goals, not every article that mentions either word.
 * Plain ILIKE matching: fine for a few thousand articles; a full-text index can come later if it gets slow.
 */
export async function searchSite(query: string) {
  const words = query.trim().split(/\s+/).filter((w) => w.length >= SEARCH_MIN_LENGTH).slice(0, 6);
  if (words.length === 0) return { teams: [], articles: [] };

  const contains = (w: string) => ({ contains: w, mode: "insensitive" as const });
  const articleWhere: Prisma.ArticleWhereInput = {
    AND: [
      publicArticleWhere(),
      ...words.map((w) => ({
        OR: [{ title: contains(w) }, { excerpt: contains(w) }, { body: contains(w) }, { tags: { has: w.toLowerCase() } }],
      })),
    ],
  };

  const [teams, articles] = await Promise.all([
    prisma.team.findMany({
      where: { AND: words.map((w) => ({ OR: [{ name: contains(w) }, { shortName: contains(w) }] })) },
      orderBy: { name: "asc" },
      take: 8,
      select: { name: true, slug: true, logoUrl: true, league: { select: { name: true } } },
    }),
    prisma.article.findMany({ where: articleWhere, orderBy: { publishedAt: "desc" }, take: 30, select: articleCardSelect }),
  ]);

  // Headline matches first, newest first within each group.
  const inTitle = (title: string) => words.every((w) => title.toLowerCase().includes(w.toLowerCase()));
  articles.sort((a, b) => Number(inTitle(b.title)) - Number(inTitle(a.title)));
  return { teams, articles };
}
