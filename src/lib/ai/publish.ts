import { AiContentStatus, AiContentType, ArticleStatus, ContentOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRexId } from "./rex";

// Where each kind of Rex article is filed, unless the draft itself names a category (news, features).
const DEFAULT_CATEGORY: Record<AiContentType, string> = {
  MATCH_SUMMARY: "laporan-perlawanan",
  PLAYER_OF_THE_WEEK: "player-of-the-week",
  NEWS_ARTICLE: "berita",
  WEEKLY_ROUNDUP: "ringkasan-mingguan",
  FEATURE: "legenda",
};

/**
 * Turns an AI draft into an article written by Rex.
 * - Reviewed by an admin: `reviewerId` set, created as a DRAFT for them to edit and publish.
 * - Auto-published (featured match reports, weekly roundups): no reviewer, published straight away.
 * Returns the article id (the existing one if the draft was already turned into an article).
 */
export async function publishAiContent(contentId: string, opts: { reviewerId: string | null; publish: boolean }): Promise<string> {
  const content = await prisma.aiContent.findUniqueOrThrow({ where: { id: contentId }, include: { article: { select: { id: true } } } });
  if (content.article) return content.article.id;

  const extras = (content.structured ?? {}) as { excerpt?: string; tags?: string[]; leagueId?: string | null; categorySlug?: string };
  const [rexId, category] = await Promise.all([
    getRexId(),
    prisma.category.findUnique({ where: { slug: extras.categorySlug ?? DEFAULT_CATEGORY[content.type] }, select: { id: true } }),
  ]);

  const base = slugify(content.title) || `rex-${content.id.slice(-6)}`;
  let slug = base;
  for (let n = 2; await prisma.article.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;

  const now = new Date();
  const article = await prisma.article.create({
    data: {
      title: content.title,
      slug,
      excerpt: extras.excerpt?.slice(0, 300) || null,
      body: content.body,
      tags: (extras.tags ?? []).map((t) => t.toLowerCase()).slice(0, 10),
      status: opts.publish ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT,
      publishedAt: opts.publish ? now : null,
      origin: ContentOrigin.AI,
      authorId: rexId,
      categoryId: category?.id ?? null,
      leagueId: extras.leagueId ?? null,
      matchId: content.matchId,
      aiContentId: content.id,
    },
    select: { id: true },
  });
  await prisma.aiContent.update({
    where: { id: content.id },
    data: { status: AiContentStatus.APPROVED, reviewedById: opts.reviewerId, reviewedAt: now },
  });
  return article.id;
}

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}
