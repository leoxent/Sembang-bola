import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/public/ArticleCard";
import { SectionHeading } from "@/components/public/SectionHeading";
import { TeamLogo } from "@/components/public/TeamLogo";
import { SEARCH_MIN_LENGTH, searchSite } from "@/server/queries/search";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = queryOf(await searchParams);
  // Result pages are endless and thin: keep them out of search engines.
  return { title: q ? `Carian: ${q}` : "Carian", robots: { index: false, follow: true } };
}

const queryOf = ({ q }: { q?: string | string[] }) => (Array.isArray(q) ? q[0] : (q ?? "")).trim().slice(0, 100);

const SUGGESTIONS = ["Haaland", "Liverpool", "Real Madrid", "Mbappé", "Arsenal", "Legenda"];

export default async function SearchPage({ searchParams }: Props) {
  const q = queryOf(await searchParams);
  const tooShort = q.length > 0 && q.length < SEARCH_MIN_LENGTH;
  const { teams, articles } = q && !tooShort ? await searchSite(q) : { teams: [], articles: [] };
  const nothing = q && !tooShort && teams.length === 0 && articles.length === 0;

  return (
    <div className="space-y-8">
      <header className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Cari</h1>
        <form action="/cari" role="search" className="mt-4 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Kelab, pemain atau topik…"
            aria-label="Cari"
            autoFocus={!q}
            className="admin-input flex-1 py-3 text-base"
          />
          <button type="submit" className="btn-primary px-5">Cari</button>
        </form>
        {(!q || nothing) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-500">Cuba:</span>
            {SUGGESTIONS.map((s) => (
              <Link key={s} href={`/cari?q=${encodeURIComponent(s)}`} className="rounded-full bg-neutral-900 px-3 py-1 text-neutral-300 ring-1 ring-neutral-800 hover:text-white">
                {s}
              </Link>
            ))}
          </div>
        )}
      </header>

      {tooShort && <p className="text-center text-sm text-neutral-500">Taip sekurang-kurangnya {SEARCH_MIN_LENGTH} huruf.</p>}

      {nothing && (
        <p className="card mx-auto max-w-2xl px-5 py-10 text-center text-neutral-400">
          Tak jumpa apa-apa untuk <strong className="text-neutral-200">&ldquo;{q}&rdquo;</strong>. Cuba ejaan lain, atau satu perkataan je.
        </p>
      )}

      {teams.length > 0 && (
        <section>
          <SectionHeading title="Kelab" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {teams.map((t) => (
              <Link key={t.slug} href={`/kelab/${t.slug}`} className="card flex items-center gap-3 px-4 py-3 transition hover:border-emerald-500/40">
                <TeamLogo src={t.logoUrl} name={t.name} size={28} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{t.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{t.league.name}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section>
          <SectionHeading title={`Artikel & berita (${articles.length}${articles.length === 30 ? "+" : ""})`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
