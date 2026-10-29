import type { Metadata } from "next";
import { LeagueLogo } from "@/components/public/LeagueLogo";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/public/ArticleCard";
import { MatchList } from "@/components/public/MatchList";
import { SectionHeading } from "@/components/public/SectionHeading";
import { StandingsTable } from "@/components/public/StandingsTable";
import { COMPETITIONS } from "@/lib/leagues";
import { getStandings } from "@/lib/providers/espn-standings";
import { getLatestArticles } from "@/server/queries/articles";
import { getLeagueMatches, getLeagues } from "@/server/queries/matches";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function findLeague(slug: string) {
  return (await getLeagues()).find((l) => l.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const league = await findLeague((await params).slug);
  return league ? { title: league.name, description: `Kedudukan liga, keputusan, jadual perlawanan dan berita ${league.name}.` } : {};
}

export default async function LeaguePage({ params }: Props) {
  const league = await findLeague((await params).slug);
  if (!league) notFound();

  const espnSlug = COMPETITIONS.find((l) => l.slug === league.slug)?.espn;
  const [{ results, fixtures }, articles, standings] = await Promise.all([
    getLeagueMatches(league.id),
    getLatestArticles({ leagueId: league.id, take: 3 }),
    espnSlug ? getStandings(espnSlug).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-10">
      <header className="relative flex items-center gap-5 overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        {league.logoUrl && (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/10 sm:h-20 sm:w-20">
            <LeagueLogo src={league.logoUrl} alt="" width={64} height={64} className="h-full w-full object-contain" />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">{league.country}</p>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">{league.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Musim {league.season}/{String(league.season + 1).slice(-2)}
          </p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <section className="min-w-0">
          <SectionHeading title={COMPETITIONS.find((c) => c.slug === league.slug)?.kind === "cup" ? "Kedudukan fasa liga" : "Kedudukan liga"} />
          <StandingsTable rows={standings} />
        </section>
        <div className="min-w-0 space-y-10">
          <section>
            <SectionHeading title="Keputusan" />
            <MatchList matches={results} showLeague={false} empty="Tiada keputusan terkini." />
          </section>
          <section>
            <SectionHeading title="Jadual perlawanan" />
            <MatchList matches={fixtures} showLeague={false} empty="Belum ada perlawanan akan datang." />
          </section>
        </div>
      </div>

      {articles.length > 0 && (
        <section>
          <SectionHeading title={`Berita ${league.name}`} href="/berita" />
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
