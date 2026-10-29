import Link from "next/link";
import { coverFor } from "@/lib/cover";
import { formatDate } from "@/lib/site";
import type { ArticleCardData } from "@/server/queries/articles";

function Cover({ article, className }: { article: ArticleCardData; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- custom covers can come from any host; auto covers are our own PNGs
  return <img src={coverFor(article)} alt="" className={`${className} object-cover`} loading="lazy" />;
}

function Meta({ article }: { article: ArticleCardData }) {
  return (
    <p className="text-xs text-neutral-500">
      {[article.league?.name, article.author?.name, article.publishedAt && formatDate(article.publishedAt)].filter(Boolean).join(" · ")}
    </p>
  );
}

function CategoryChip({ article }: { article: ArticleCardData }) {
  if (!article.category) return null;
  const rencana = article.category.section === "RENCANA";
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wider ${rencana ? "text-amber-400" : "text-emerald-400"}`}>
      {article.category.name}
    </span>
  );
}

export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <Link href={`/artikel/${article.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 transition hover:border-neutral-700">
      <div className="overflow-hidden">
        <Cover article={article} className="aspect-[1200/630] w-full transition duration-500 group-hover:scale-[1.02]" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <CategoryChip article={article} />
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-emerald-300">{article.title}</h3>
        {article.excerpt && <p className="line-clamp-2 text-sm text-neutral-400">{article.excerpt}</p>}
        <div className="mt-auto pt-2">
          <Meta article={article} />
        </div>
      </div>
    </Link>
  );
}

export function ArticleHero({ article }: { article: ArticleCardData }) {
  // The automatic cover already shows the headline, so it's displayed whole, without the text overlay.
  if (!article.coverImageUrl) {
    return (
      <Link href={`/artikel/${article.slug}`} className="group block overflow-hidden rounded-3xl border border-neutral-800">
        <Cover article={article} className="aspect-[1200/630] w-full transition duration-700 group-hover:scale-[1.01]" />
      </Link>
    );
  }
  return (
    <Link href={`/artikel/${article.slug}`} className="group relative block overflow-hidden rounded-3xl border border-neutral-800">
      <Cover article={article} className="aspect-[16/10] w-full transition duration-700 group-hover:scale-[1.02] sm:aspect-[21/9]" />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-8">
        {(article.category || article.league) && (
          <span className="inline-block rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-neutral-950">
            {article.category?.name ?? article.league?.name}
          </span>
        )}
        <h2 className="max-w-3xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{article.title}</h2>
        {article.excerpt && <p className="line-clamp-2 max-w-2xl text-sm text-neutral-300 sm:text-base">{article.excerpt}</p>}
        <Meta article={article} />
      </div>
    </Link>
  );
}
