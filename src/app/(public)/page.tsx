import { LeagueLogo } from "@/components/public/LeagueLogo";
import Link from "next/link";
import { ArticleCard, ArticleHero } from "@/components/public/ArticleCard";
import { AutoRefresh } from "@/components/public/AutoRefresh";
import { MatchList } from "@/components/public/MatchList";
import { SectionHeading } from "@/components/public/SectionHeading";
import { getCategories, getLatestArticles } from "@/server/queries/articles";
import { getHomeMatches, getLeagues } from "@/server/queries/matches";

export const revalidate = 60;

export default async function HomePage() {
  const [{ live, results, upcoming }, [lead], leagues, categories] = await Promise.all([
    getHomeMatches(),
    getLatestArticles({ take: 1 }),
    getLeagues(),
    getCategories(),
  ]);
  const [allNews, allFeatures] = await Promise.all([
    getLatestArticles({ take: 7, section: "BERITA" }),
    getLatestArticles({ take: 4, section: "RENCANA" }),
  ]);
  // The banner article isn't repeated in its section, unless it's the only one there:
  // better to show it twice than to say the section is empty.
  const withoutLead = <T extends { id: string }>(list: T[], take: number) => {
    const rest = list.filter((a) => a.id !== lead?.id);
    return (rest.length > 0 ? rest : list).slice(0, take);
  };
  const news = withoutLead(allNews, 6);
  const features = withoutLead(allFeatures, 3);
  const featureCategories = categories.filter((c) => c.section === "RENCANA");
  // Keep scores moving while anything is live, or kicks off within 15 minutes.
  const kickoffSoon = upcoming.some((m) => Math.abs(m.kickoffAt.getTime() - Date.now()) < 15 * 60_000);

  return (
    <div className="space-y-12">
      {(live.length > 0 || kickoffSoon) && <AutoRefresh seconds={60} />}
      {lead ? (
        <ArticleHero article={lead} />
      ) : (
        <section className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-emerald-950 via-neutral-950 to-neutral-950 px-6 py-12 sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">5 liga utama Eropah + Liga Juara-Juara</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            Semua keputusan, semua perlawanan, semua drama.
          </h1>
          <p className="mt-4 max-w-xl text-neutral-400">
            Premier League, La Liga, Serie A, Bundesliga, Ligue 1 dan Liga Juara-Juara: skor langsung, statistik perlawanan dan
            ulasan santai, semua dalam satu tempat.
          </p>
        </section>
      )}

      <nav className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {leagues.map((l) => (
          <Link
            key={l.slug}
            href={`/leagues/${l.slug}`}
            className="card flex flex-col items-center gap-2 px-2 py-4 text-center transition hover:border-emerald-500/40 hover:bg-neutral-900"
          >
            {l.logoUrl && <LeagueLogo src={l.logoUrl} alt="" width={40} height={40} className="h-8 w-8 sm:h-10 sm:w-10" />}
            <span className="text-xs font-medium text-neutral-300">{l.shortName}</span>
          </Link>
        ))}
      </nav>

      {live.length > 0 && (
        <section>
          <SectionHeading title="Sedang berlangsung">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </SectionHeading>
          <MatchList matches={live} empty="" />
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <SectionHeading title="Keputusan terkini" />
          <MatchList matches={results} empty="Tiada keputusan dalam beberapa hari lepas." />
        </section>
        <section>
          <SectionHeading title="Perlawanan akan datang" />
          <MatchList matches={upcoming} empty="Tiada perlawanan dalam minggu ini." />
        </section>
      </div>

      {news.length > 0 && (
        <section>
          <SectionHeading title="Berita terkini" href="/berita" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-amber-500/15 bg-gradient-to-br from-amber-950/30 via-neutral-950 to-neutral-950 p-5 sm:p-8">
        <SectionHeading title="Artikel" href="/artikel" />
        <p className="-mt-2 mb-5 max-w-2xl text-sm text-neutral-400">
          Bukan sekadar skor: kisah legenda, peraturan bola yang lama dan baru, dan sejarah kelab serta pemain.
        </p>
        <nav className="mb-5 flex flex-wrap gap-2">
          {featureCategories.map((c) => (
            <Link key={c.slug} href={`/kategori/${c.slug}`} className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-200 ring-1 ring-amber-500/20 hover:bg-amber-500/20">
              {c.name}
            </Link>
          ))}
        </nav>
        {features.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Artikel pertama akan muncul tak lama lagi.</p>
        )}
      </section>
    </div>
  );
}
