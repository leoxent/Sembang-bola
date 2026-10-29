import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { publicArticleWhere } from "@/server/queries/articles";

export const revalidate = 3600;

// /sitemap.xml: tells search engines which pages exist. Matches are left out: they're many, short-lived and thin.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, leagues, categories, teams] = await Promise.all([
    prisma.article.findMany({ where: publicArticleWhere(), select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" }, take: 5000 }),
    prisma.league.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.team.findMany({ select: { slug: true } }),
  ]);
  const url = siteUrl();
  return [
    { url, changeFrequency: "hourly", priority: 1 },
    { url: `${url}/berita`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${url}/artikel`, changeFrequency: "daily", priority: 0.8 },
    { url: `${url}/tentang`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${url}/privasi`, changeFrequency: "yearly", priority: 0.1 },
    ...categories.map((c) => ({ url: `${url}/kategori/${c.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...leagues.map((l) => ({ url: `${url}/leagues/${l.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...teams.map((t) => ({ url: `${url}/kelab/${t.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: `${url}/artikel/${a.slug}`, lastModified: a.updatedAt, priority: 0.6 })),
  ];
}
