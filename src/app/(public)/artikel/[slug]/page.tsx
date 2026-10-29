import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/admin/Avatar";
import { AdminEditLink } from "@/components/public/AdminShortcuts";
import { ArticleCard } from "@/components/public/ArticleCard";
import { Markdown } from "@/components/public/Markdown";
import { MatchRow } from "@/components/public/MatchList";
import { coverFor } from "@/lib/cover";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/site";
import { getLatestArticles, getPublicArticle } from "@/server/queries/articles";
import { matchListSelect } from "@/server/queries/matches";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublicArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      images: [coverFor(article)],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getPublicArticle((await params).slug);
  if (!article) notFound();

  const [match, more] = await Promise.all([
    article.match ? prisma.match.findUnique({ where: { id: article.match.id }, select: matchListSelect }) : null,
    // "More stories": same category first (a legend piece suggests other legends), else same league.
    getLatestArticles(
      article.category
        ? { take: 3, excludeId: article.id, categorySlug: article.category.slug }
        : { take: 3, excludeId: article.id, leagueId: article.league?.id },
    ),
  ]);
  const minutes = Math.max(1, Math.round(article.body.split(/\s+/).length / 220));
  const aiAssisted = article.origin !== "HUMAN";
  const byRex = article.author?.isBot ?? false;
  const reviewer = article.aiContent?.reviewedBy?.name ?? null;
  // Transparency line: who checked it, or that it was published automatically from match data.
  const reviewNote = !aiAssisted ? null : reviewer ? `Disemak oleh ${reviewer}` : byRex ? "Diterbitkan automatik" : null;

  return (
    <article className="mx-auto max-w-3xl">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {article.category && (
            <Link
              href={`/kategori/${article.category.slug}`}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                article.category.section === "RENCANA"
                  ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                  : "bg-emerald-500 text-neutral-950 hover:bg-emerald-400"
              }`}
            >
              {article.category.name}
            </Link>
          )}
          {article.league && (
            <Link href={`/leagues/${article.league.slug}`} className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300 hover:bg-emerald-500/25">
              {article.league.name}
            </Link>
          )}
          {aiAssisted && (
            <Link href="/tentang#ai" className="rounded-full bg-violet-500/15 px-2.5 py-1 font-medium text-violet-300 hover:bg-violet-500/25">
              Dibantu AI
            </Link>
          )}
          {article.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-neutral-800 px-2.5 py-1 text-neutral-400">#{t}</span>
          ))}
          <AdminEditLink articleId={article.id} />
        </div>
        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">{article.title}</h1>
        {article.excerpt && <p className="text-lg text-neutral-400 sm:text-xl">{article.excerpt}</p>}
        <div className="flex items-center gap-3 border-y border-neutral-800 py-4">
          {article.author ? (
            <>
              <Avatar src={article.author.avatarUrl} name={article.author.name} />
              <div className="text-sm">
                <p className="font-semibold">
                  {article.author.name}
                  {byRex && <span className="ml-2 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">AI</span>}
                </p>
                <p className="text-neutral-500">
                  {[article.author.title, reviewNote, article.publishedAt && formatDate(article.publishedAt), `${minutes} min bacaan`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              {[article.publishedAt && formatDate(article.publishedAt), `${minutes} min bacaan`].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element -- custom covers can come from any host an editor pastes */}
      <img src={coverFor(article)} alt="" className="mt-8 aspect-[1200/630] w-full rounded-2xl object-cover" />

      {match && (
        <div className="card mt-8 overflow-hidden">
          <MatchRow match={match} />
        </div>
      )}

      <div className="mt-8">
        <Markdown>{article.body}</Markdown>
      </div>

      {aiAssisted && (
        <p className="mt-10 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-sm text-neutral-400">
          {reviewer || !byRex
            ? "Artikel ini ditulis dengan bantuan AI berdasarkan data dan sumber yang dinyatakan, kemudian disemak oleh editor kami sebelum diterbitkan."
            : "Artikel ini ditulis oleh Rex, penulis AI kami, dan diterbitkan secara automatik. Ia berasaskan data perlawanan rasmi sahaja."}{" "}
          <Link href="/tentang#ai" className="text-violet-300 underline">Ketahui lebih lanjut</Link>
        </p>
      )}

      {article.author?.bio && (
        <aside className="card mt-12 flex gap-4 p-5">
          <Avatar src={article.author.avatarUrl} name={article.author.name} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500">Ditulis oleh</p>
            <p className="font-semibold">{article.author.name}</p>
            {article.author.title && <p className="text-sm text-emerald-400">{article.author.title}</p>}
            <p className="mt-2 text-sm text-neutral-400">{article.author.bio}</p>
          </div>
        </aside>
      )}

      {more.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-bold">Cerita lain</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {more.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
