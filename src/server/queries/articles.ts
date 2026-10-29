import { cache } from "react";
import { ArticleStatus, CategorySection, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Published now, or scheduled for a time that has passed. */
export const publicArticleWhere = (): Prisma.ArticleWhereInput => ({
  OR: [
    { status: ArticleStatus.PUBLISHED },
    { status: ArticleStatus.SCHEDULED, publishedAt: { lte: new Date() } },
  ],
});

export const articleCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  publishedAt: true,
  updatedAt: true,
  origin: true,
  category: { select: { name: true, slug: true, section: true } },
  league: { select: { name: true, slug: true } },
  author: { select: { name: true, avatarUrl: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleCardData = Prisma.ArticleGetPayload<{ select: typeof articleCardSelect }>;

/** Articles with no category count as news. */
const sectionWhere = (section: CategorySection): Prisma.ArticleWhereInput =>
  section === CategorySection.BERITA ? { OR: [{ category: { section } }, { categoryId: null }] } : { category: { section } };

export function getLatestArticles({
  take = 6,
  leagueId,
  matchId,
  team,
  excludeId,
  section,
  categorySlug,
}: {
  take?: number;
  leagueId?: string;
  matchId?: string;
  /** Reports on one of this team's matches, or any story naming the team in its title. */
  team?: { id: string; name: string };
  excludeId?: string;
  section?: CategorySection;
  categorySlug?: string;
} = {}) {
  return prisma.article.findMany({
    where: {
      AND: [
        publicArticleWhere(),
        {
          ...(leagueId && { leagueId }),
          ...(matchId && { matchId }),
          ...(excludeId && { id: { not: excludeId } }),
          ...(categorySlug && { category: { slug: categorySlug } }),
        },
        section ? sectionWhere(section) : {},
        team
          ? {
              OR: [
                { match: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] } },
                { title: { contains: team.name, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: { publishedAt: "desc" },
    take,
    select: articleCardSelect,
  });
}

export const getPublicArticle = cache((slug: string) =>
  prisma.article.findFirst({
    where: { AND: [publicArticleWhere(), { slug }] },
    include: {
      category: { select: { name: true, slug: true, section: true } },
      league: { select: { id: true, name: true, slug: true } },
      author: { select: { name: true, title: true, bio: true, avatarUrl: true, isBot: true } },
      match: { select: { id: true } },
      aiContent: { select: { reviewedBy: { select: { name: true } } } },
    },
  }),
);

export const getCategories = cache(() =>
  prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, section: true, description: true },
  }),
);
