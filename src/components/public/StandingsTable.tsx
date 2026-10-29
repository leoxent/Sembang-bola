import Link from "next/link";
import type { StandingRow, Zone } from "@/lib/providers/espn-standings";
import { TeamLogo } from "./TeamLogo";

const ZONES: Record<Zone, { label: string; bar: string }> = {
  ucl: { label: "Liga Juara-Juara", bar: "bg-emerald-500" },
  uel: { label: "Liga Europa", bar: "bg-sky-500" },
  uecl: { label: "Liga Konferens", bar: "bg-violet-500" },
  playoff: { label: "Playoff penyingkiran", bar: "bg-amber-500" },
  relegation: { label: "Penyingkiran", bar: "bg-red-500" },
  r16: { label: "Terus ke pusingan 16", bar: "bg-emerald-500" },
  koPlayoff: { label: "Playoff kalah mati", bar: "bg-amber-500" },
  eliminated: { label: "Tersingkir", bar: "bg-red-500" },
};

export function StandingsTable({
  rows,
  teamSlugs,
  highlightExternalId,
}: {
  rows: StandingRow[];
  /** Links each team to its club page when we know it. */
  teamSlugs?: Map<string, string>;
  /** Marks one team's row, e.g. on that club's own page. */
  highlightExternalId?: string;
}) {
  if (rows.length === 0) return <p className="card px-5 py-10 text-center text-sm text-neutral-500">Jadual liga tak dapat dimuatkan sekarang.</p>;
  const zonesUsed = [...new Set(rows.map((r) => r.zone).filter(Boolean))] as Zone[];

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-xs text-neutral-500">
            <th className="w-10 py-2.5 pl-4 text-left font-medium">#</th>
            <th className="py-2.5 text-left font-medium">Pasukan</th>
            <th className="w-9 py-2.5 font-medium" title="Main">P</th>
            <th className="hidden w-9 py-2.5 font-medium sm:table-cell" title="Menang">M</th>
            <th className="hidden w-9 py-2.5 font-medium sm:table-cell" title="Seri">S</th>
            <th className="hidden w-9 py-2.5 font-medium sm:table-cell" title="Kalah">K</th>
            <th className="hidden w-16 py-2.5 font-medium md:table-cell" title="Gol jaring : bolos">Gol</th>
            <th className="w-10 py-2.5 font-medium" title="Beza gol">BG</th>
            <th className="w-12 py-2.5 pr-4 font-medium" title="Mata">Mata</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {rows.map((r) => {
            const slug = teamSlugs?.get(r.teamExternalId);
            const names = (
              <>
                <span className="truncate sm:hidden">{r.shortName}</span>
                <span className="hidden truncate sm:inline">{r.name}</span>
              </>
            );
            return (
            <tr key={r.name} className={r.teamExternalId === highlightExternalId ? "bg-emerald-500/10" : "hover:bg-white/[0.02]"}>
              <td className="relative py-2.5 pl-4 tabular-nums text-neutral-400">
                {r.zone && <span className={`absolute inset-y-1 left-0 w-1 rounded-r ${ZONES[r.zone].bar}`} title={ZONES[r.zone].label} />}
                {r.rank}
              </td>
              <td className="max-w-0 py-2.5">
                <div className="flex items-center gap-2.5">
                  <TeamLogo src={r.logoUrl} name={r.name} size={20} />
                  {slug ? (
                    <Link href={`/kelab/${slug}`} className="flex min-w-0 hover:text-emerald-400">{names}</Link>
                  ) : (
                    names
                  )}
                </div>
              </td>
              <td className="text-center tabular-nums text-neutral-400">{r.played}</td>
              <td className="hidden text-center tabular-nums text-neutral-400 sm:table-cell">{r.won}</td>
              <td className="hidden text-center tabular-nums text-neutral-400 sm:table-cell">{r.drawn}</td>
              <td className="hidden text-center tabular-nums text-neutral-400 sm:table-cell">{r.lost}</td>
              <td className="hidden text-center tabular-nums text-neutral-500 md:table-cell">
                {r.goalsFor}:{r.goalsAgainst}
              </td>
              <td className="text-center tabular-nums text-neutral-400">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
              <td className="pr-4 text-center font-bold tabular-nums">{r.points}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {zonesUsed.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400">
          {zonesUsed.map((z) => (
            <span key={z} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-1 rounded ${ZONES[z].bar}`} />
              {ZONES[z].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
