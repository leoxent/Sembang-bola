import type { Metadata } from "next";
import { LeagueLogo } from "@/components/public/LeagueLogo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/public/ArticleCard";
import { AutoRefresh } from "@/components/public/AutoRefresh";
import { MatchStatus } from "@/components/public/MatchStatus";
import { MatchTimeline } from "@/components/public/match/MatchTimeline";
import { PlayerStats } from "@/components/public/match/PlayerStats";
import { TeamStats } from "@/components/public/match/TeamStats";
import { TeamLogo } from "@/components/public/TeamLogo";
import { toTimeline } from "@/lib/match-events";
import { formatDateTime, formatTime } from "@/lib/site";
import { getLatestArticles } from "@/server/queries/articles";
import { getMatch } from "@/server/queries/matches";

export const revalidate = 30;

type Props = { params: Promise<{ matchId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const match = await getMatch((await params).matchId);
  if (!match) return {};
  const played = match.homeScore != null && match.awayScore != null;
  const title = played
    ? `${match.homeTeam.name} ${match.homeScore}–${match.awayScore} ${match.awayTeam.name}`
    : `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  return { title, description: `${match.league.name}, ${formatDateTime(match.kickoffAt)}. Skor, detik penting, statistik pasukan dan pemain.` };
}

export default async function MatchPage({ params }: Props) {
  const match = await getMatch((await params).matchId);
  if (!match) notFound();
  const articles = await getLatestArticles({ matchId: match.id, take: 3 });

  const started = !["SCHEDULED", "POSTPONED", "CANCELLED"].includes(match.status);
  const live =
    match.status === "LIVE" ||
    match.status === "HALFTIME" ||
    (match.status === "SCHEDULED" && Math.abs(match.kickoffAt.getTime() - Date.now()) < 15 * 60_000);
  const stats = (match.teamStats ?? {}) as Record<string, Record<string, string>>;
  const timeline = toTimeline(match.events);

  return (
    <div className="space-y-6">
      {live && <AutoRefresh seconds={60} />}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 px-4 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <Link href={`/leagues/${match.league.slug}`} className="relative mx-auto flex w-fit items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-400 hover:text-white">
          {match.league.logoUrl && <LeagueLogo src={match.league.logoUrl} alt="" width={18} height={18} />}
          {match.league.name}
          {match.round && <span className="text-neutral-600">· {match.round}</span>}
        </Link>

        <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <TeamLogo src={match.homeTeam.logoUrl} name={match.homeTeam.name} size={72} />
            <h1 className="text-sm font-bold sm:text-xl">{match.homeTeam.name}</h1>
          </div>
          <div className="flex flex-col items-center gap-2">
            {started ? (
              <p className="text-4xl font-black tabular-nums tracking-tight sm:text-6xl">
                {match.homeScore ?? 0}
                <span className="mx-2 text-neutral-600 sm:mx-3">–</span>
                {match.awayScore ?? 0}
              </p>
            ) : (
              <p className="text-3xl font-black tabular-nums sm:text-5xl">{formatTime(match.kickoffAt)}</p>
            )}
            <MatchStatus status={match.status} minute={match.minute} kickoffAt={match.kickoffAt} large />
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <TeamLogo src={match.awayTeam.logoUrl} name={match.awayTeam.name} size={72} />
            <h2 className="text-sm font-bold sm:text-xl">{match.awayTeam.name}</h2>
          </div>
        </div>

        <p className="relative mt-6 text-center text-xs text-neutral-500">
          {formatDateTime(match.kickoffAt)}
          {match.venue && ` · ${match.venue}`}
        </p>
      </section>

      {started ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="card overflow-hidden">
            <h2 className="border-b border-neutral-800 px-5 py-3 font-semibold">Detik penting</h2>
            <MatchTimeline events={timeline} homeExternalId={match.homeTeam.externalId} />
          </section>
          <section className="card self-start overflow-hidden">
            <h2 className="border-b border-neutral-800 px-5 py-3 font-semibold">Statistik pasukan</h2>
            <TeamStats home={stats[match.homeTeam.externalId]} away={stats[match.awayTeam.externalId]} />
          </section>
          <section className="card overflow-hidden lg:col-span-2">
            <h2 className="border-b border-neutral-800 px-5 py-3 font-semibold">Statistik pemain</h2>
            <PlayerStats match={match} />
          </section>
        </div>
      ) : (
        <p className="card px-5 py-10 text-center text-sm text-neutral-400">
          Sepak mula {formatDateTime(match.kickoffAt)}. Skor langsung, detik penting dan statistik akan muncul di sini sebaik perlawanan bermula.
        </p>
      )}

      {articles.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">Liputan perlawanan</h2>
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
