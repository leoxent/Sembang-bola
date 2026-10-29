import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/public/ArticleCard";
import { LeadersTable } from "@/components/public/LeadersTable";
import { MatchList } from "@/components/public/MatchList";
import { SectionHeading } from "@/components/public/SectionHeading";
import { ShareButtons } from "@/components/public/ShareButtons";
import { TeamLogo } from "@/components/public/TeamLogo";
import { COMPETITIONS } from "@/lib/leagues";
import { getLeaders, getStandings } from "@/lib/providers/espn-standings";
import { SITE_NAME } from "@/lib/site";
import { getLatestArticles } from "@/server/queries/articles";
import { getTeam, getTeamMatches, getTeamSlugs, type MatchListItem } from "@/server/queries/matches";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await getTeam((await params).slug);
  if (!team) return {};
  return {
    title: `${team.name}: keputusan, jadual & berita`,
    description: `Keputusan terkini, jadual perlawanan, kedudukan liga, penjaring dan berita ${team.name}.`,
    alternates: { canonical: `/kelab/${team.slug}` },
  };
}

type FormResult = "M" | "S" | "K";
const FORM_STYLE: Record<FormResult, { title: string; className: string }> = {
  M: { title: "Menang", className: "bg-emerald-500 text-neutral-950" },
  S: { title: "Seri", className: "bg-neutral-600 text-white" },
  K: { title: "Kalah", className: "bg-red-500 text-white" },
};

function formOf(teamName: string, m: MatchListItem): FormResult | null {
  if (m.status !== "FINISHED" || m.homeScore == null || m.awayScore == null) return null;
  const [mine, theirs] = m.homeTeam.name === teamName ? [m.homeScore, m.awayScore] : [m.awayScore, m.homeScore];
  return mine > theirs ? "M" : mine < theirs ? "K" : "S";
}

export default async function ClubPage({ params }: Props) {
  const team = await getTeam((await params).slug);
  if (!team) notFound();

  const espnSlug = COMPETITIONS.find((c) => c.slug === team.league.slug)?.espn;
  const noLeaders = { goals: [], assists: [] };
  const [{ results, fixtures }, articles, standings, leaders] = await Promise.all([
    getTeamMatches(team.id),
    getLatestArticles({ team: { id: team.id, name: team.name }, take: 6 }),
    espnSlug ? getStandings(espnSlug).catch(() => []) : Promise.resolve([]),
    espnSlug ? getLeaders(espnSlug).catch(() => noLeaders) : Promise.resolve(noLeaders),
  ]);
  const row = standings.find((r) => r.teamExternalId === team.externalId);
  const scorers = leaders.goals.filter((l) => l.teamExternalId === team.externalId).slice(0, 5);
  const assisters = leaders.assists.filter((l) => l.teamExternalId === team.externalId).slice(0, 5);
  const teamSlugs = await getTeamSlugs([team.externalId]);
  // Oldest first, so the newest result sits on the right, as in most football apps.
  const form = results
    .map((m) => formOf(team.name, m))
    .filter((f): f is FormResult => f !== null)
    .slice(0, 5)
    .reverse();

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/5 p-2.5 ring-1 ring-white/10 sm:h-24 sm:w-24">
            <TeamLogo src={team.logoUrl} name={team.name} size={72} />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/leagues/${team.league.slug}`} className="text-xs font-semibold uppercase tracking-widest text-emerald-400 hover:underline">
              {team.league.name}
            </Link>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">{team.name}</h1>
            {form.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5" aria-label="Prestasi 5 perlawanan terakhir">
                <span className="mr-1 text-xs text-neutral-500">Prestasi:</span>
                {form.map((f, i) => (
                  <span key={i} title={FORM_STYLE[f].title} className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${FORM_STYLE[f].className}`}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {row && (
          <dl className="relative mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              ["Kedudukan", `#${row.rank}`],
              ["Mata", row.points],
              ["Main", row.played],
              ["M-S-K", `${row.won}-${row.drawn}-${row.lost}`],
              ["Gol", `${row.goalsFor}:${row.goalsAgainst}`],
              ["Beza gol", row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/5 px-3 py-2.5 text-center ring-1 ring-white/5">
                <dt className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <SectionHeading title="Keputusan terkini" />
          <MatchList matches={results} empty="Tiada keputusan terkini." />
        </section>
        <section className="min-w-0">
          <SectionHeading title="Perlawanan akan datang" />
          <MatchList matches={fixtures} empty="Belum ada perlawanan akan datang." />
        </section>
      </div>

      {(scorers.length > 0 || assisters.length > 0) && (
        <section>
          <SectionHeading title={`Bintang ${team.shortName ?? team.name} dalam ${team.league.name}`} />
          <div className="grid gap-4 md:grid-cols-2">
            <LeadersTable title="Penjaring" unit="gol" rows={scorers} teamSlugs={teamSlugs} showTeam={false} />
            <LeadersTable title="Assist" unit="ast" rows={assisters} teamSlugs={teamSlugs} showTeam={false} />
          </div>
        </section>
      )}

      {articles.length > 0 && (
        <section>
          <SectionHeading title={`Berita ${team.name}`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      <ShareButtons title={`${team.name} di ${SITE_NAME}`} path={`/kelab/${team.slug}`} className="justify-center" />
    </div>
  );
}
