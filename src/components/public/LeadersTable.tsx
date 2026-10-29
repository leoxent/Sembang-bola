import Link from "next/link";
import type { LeaderRow } from "@/lib/providers/espn-standings";
import { TeamLogo } from "./TeamLogo";

/** Top scorers or assist makers. `teamSlugs` links each club to its page when we know it. */
export function LeadersTable({
  title,
  unit,
  rows,
  teamSlugs,
  showTeam = true,
}: {
  title: string;
  unit: string;
  rows: LeaderRow[];
  teamSlugs: Map<string, string>;
  showTeam?: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <h3 className="border-b border-neutral-800 px-4 py-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-neutral-500">Belum ada data.</p>
      ) : (
        <ol className="divide-y divide-neutral-800/60">
          {rows.map((r, i) => {
            // Shared ranks: players level on the count share the position of the first of them.
            const rank = rows.findIndex((o) => o.value === r.value) + 1;
            const slug = r.teamExternalId ? teamSlugs.get(r.teamExternalId) : undefined;
            return (
              <li key={`${r.playerName}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-5 shrink-0 text-right tabular-nums text-neutral-500">{rank}</span>
                {showTeam && <TeamLogo src={r.teamLogoUrl} name={r.teamName ?? "?"} size={20} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.playerName}</span>
                  {showTeam && r.teamName && (
                    <span className="block truncate text-xs text-neutral-500">
                      {slug ? (
                        <Link href={`/kelab/${slug}`} className="hover:text-emerald-400">{r.teamName}</Link>
                      ) : (
                        r.teamName
                      )}
                    </span>
                  )}
                </span>
                {r.appearances != null && (
                  <span className="hidden text-xs tabular-nums text-neutral-500 sm:inline" title="Penampilan">{r.appearances} main</span>
                )}
                <span className="w-12 text-right font-bold tabular-nums">
                  {r.value}
                  <span className="ml-0.5 text-xs font-normal text-neutral-500">{unit}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
