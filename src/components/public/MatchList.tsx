import Link from "next/link";
import { formatDayHeading, groupByDay } from "@/lib/site";
import { LeagueLogo } from "./LeagueLogo";
import type { MatchListItem } from "@/server/queries/matches";
import { MatchStatus } from "./MatchStatus";
import { TeamLogo } from "./TeamLogo";

export function MatchRow({ match, showLeague = true }: { match: MatchListItem; showLeague?: boolean }) {
  const started = match.status !== "SCHEDULED" && match.status !== "POSTPONED" && match.status !== "CANCELLED";
  const homeWon = started && match.status === "FINISHED" && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = started && match.status === "FINISHED" && (match.awayScore ?? 0) > (match.homeScore ?? 0);
  const teamClass = (won: boolean, lost: boolean) => (won ? "font-semibold text-white" : lost ? "text-neutral-400" : "text-neutral-200");

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group grid grid-cols-[3.25rem_1fr_auto_1fr] items-center gap-2 px-4 py-3 transition hover:bg-white/[0.03] sm:grid-cols-[4rem_1fr_auto_1fr_1.5rem] sm:gap-3"
    >
      <MatchStatus status={match.status} minute={match.minute} kickoffAt={match.kickoffAt} />
      <span className={`flex min-w-0 items-center justify-end gap-2 text-right text-sm ${teamClass(homeWon, awayWon)}`}>
        <span className="truncate">{match.homeTeam.shortName ?? match.homeTeam.name}</span>
        <TeamLogo src={match.homeTeam.logoUrl} name={match.homeTeam.name} size={22} />
      </span>
      <span className="min-w-14 rounded-md bg-neutral-900 px-2 py-1 text-center text-sm font-bold tabular-nums ring-1 ring-white/5 group-hover:ring-white/10">
        {started ? `${match.homeScore ?? 0} – ${match.awayScore ?? 0}` : "vs"}
      </span>
      <span className={`flex min-w-0 items-center gap-2 text-sm ${teamClass(awayWon, homeWon)}`}>
        <TeamLogo src={match.awayTeam.logoUrl} name={match.awayTeam.name} size={22} />
        <span className="truncate">{match.awayTeam.shortName ?? match.awayTeam.name}</span>
      </span>
      {showLeague && match.league.logoUrl ? (
        <LeagueLogo src={match.league.logoUrl} alt={match.league.name} title={match.league.name} width={20} height={20} className="hidden opacity-70 sm:block" />
      ) : (
        <span className="hidden sm:block" />
      )}
    </Link>
  );
}

export function MatchList({ matches, showLeague = true, empty }: { matches: MatchListItem[]; showLeague?: boolean; empty: string }) {
  if (matches.length === 0) return <p className="card px-5 py-10 text-center text-sm text-neutral-500">{empty}</p>;

  return (
    <div className="space-y-4">
      {groupByDay(matches).map((group) => (
        <div key={group.day} className="card overflow-hidden">
          <h3 className="border-b border-neutral-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {formatDayHeading(group.date)}
          </h3>
          <div className="divide-y divide-neutral-800/70">
            {group.items.map((m) => (
              <MatchRow key={m.id} match={m} showLeague={showLeague} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
