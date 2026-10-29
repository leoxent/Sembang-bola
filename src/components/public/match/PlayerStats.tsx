import { performanceScore, statNum as num } from "@/lib/scoring";
import type { MatchDetail } from "@/server/queries/matches";
import { TeamLogo } from "../TeamLogo";

type PlayerStat = MatchDetail["playerStats"][number];
type Extra = Record<string, number | boolean | undefined>;

// G → D → M → F, from ESPN position codes like "G", "CD-R", "DM", "AM", "CF-L".
function positionOrder(pos: string | null): number {
  if (!pos) return 4;
  if (pos.startsWith("G")) return 0;
  if (/^(C?D|LB|RB|[LR]WB|SW)/.test(pos)) return 1;
  if (pos.includes("M")) return 2;
  return 3;
}

function PlayerRows({ rows, topId }: { rows: PlayerStat[]; topId?: string }) {
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="text-xs text-neutral-500">
          <th className="px-4 py-2 text-left font-medium">Pemain</th>
          <th className="w-8 py-2 font-medium" title="Gol">G</th>
          <th className="w-8 py-2 font-medium" title="Assist">A</th>
          <th className="w-14 py-2 font-medium" title="Percubaan (tepat ke sasaran)">Pc</th>
          <th className="w-10 py-2 pr-4 font-medium" title="Selamatan">Sl</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-800/50">
        {rows.map((s) => {
          const x = s.extra as Extra;
          const isGk = s.player.position?.startsWith("G");
          return (
            <tr key={s.id} className={s.id === topId ? "bg-emerald-500/[0.07]" : undefined}>
              <td className="px-4 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-9 shrink-0 text-xs text-neutral-500">{x.starter ? s.player.position : "↑"}</span>
                  <span className="truncate" title={s.player.name}>{s.player.name}</span>
                  {num(x, "yellowCards") > 0 && <span className="inline-block h-3 w-2 shrink-0 rounded-[1px] bg-yellow-400" title="Kad kuning" />}
                  {num(x, "redCards") > 0 && <span className="inline-block h-3 w-2 shrink-0 rounded-[1px] bg-red-500" title="Kad merah" />}
                  {s.id === topId && <span className="shrink-0 text-xs font-semibold text-emerald-400">★</span>}
                </div>
              </td>
              <td className={`text-center tabular-nums ${s.goals ? "font-semibold text-white" : "text-neutral-600"}`}>{s.goals}</td>
              <td className={`text-center tabular-nums ${s.assists ? "font-semibold text-white" : "text-neutral-600"}`}>{s.assists}</td>
              <td className="text-center tabular-nums text-neutral-400">
                {num(x, "totalShots")}
                <span className="text-neutral-600"> ({num(x, "shotsOnTarget")})</span>
              </td>
              <td className="pr-4 text-center tabular-nums text-neutral-400">{isGk ? num(x, "saves") : ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TeamTable({ team, stats, topId }: { team: MatchDetail["homeTeam"]; stats: PlayerStat[]; topId?: string }) {
  const byPosition = (a: PlayerStat, b: PlayerStat) => positionOrder(a.player.position) - positionOrder(b.player.position);
  const starters = stats.filter((s) => (s.extra as Extra).starter).sort(byPosition);
  const subs = stats.filter((s) => !(s.extra as Extra).starter).sort(byPosition);
  // Keep the bench open when a substitute was the match's top performer.
  const topIsSub = subs.some((s) => s.id === topId);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
        <TeamLogo src={team.logoUrl} name={team.name} size={20} />
        <h3 className="text-sm font-semibold">{team.name}</h3>
      </div>
      <PlayerRows rows={starters} topId={topId} />
      {subs.length > 0 && (
        <details open={topIsSub} className="border-t border-neutral-800">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-neutral-400 hover:text-white">
            Pemain simpanan yang turun padang ({subs.length})
          </summary>
          <PlayerRows rows={subs} topId={topId} />
        </details>
      )}
    </div>
  );
}

export function PlayerStats({ match }: { match: MatchDetail }) {
  if (match.playerStats.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-neutral-500">Statistik pemain akan muncul beberapa jam selepas wisel penamat.</p>;
  }
  const top = [...match.playerStats].sort((a, b) => performanceScore(b) - performanceScore(a))[0];
  const forTeam = (teamId: string) => match.playerStats.filter((s) => s.teamId === teamId);

  return (
    <>
      <div className="grid divide-y divide-neutral-800 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <TeamTable team={match.homeTeam} stats={forTeam(match.homeTeam.id)} topId={top?.id} />
        <TeamTable team={match.awayTeam} stats={forTeam(match.awayTeam.id)} topId={top?.id} />
      </div>
      <p className="border-t border-neutral-800 px-4 py-2.5 text-xs text-neutral-500">
        G gol · A assist · Pc percubaan (tepat ke sasaran) · Sl selamatan · ↑ masuk dari bangku simpanan · ★ pemain terbaik:{" "}
        <span className="text-emerald-400">{top?.player.name}</span>
      </p>
    </>
  );
}
