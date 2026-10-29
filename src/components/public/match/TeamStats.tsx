type Stats = Record<string, string>;

// ESPN team-stat keys we show, in order. Percent-style values arrive as fractions ("0.9") except possession.
const ROWS: { key: string; label: string; format?: (v: number) => string; lowerIsBetter?: boolean }[] = [
  { key: "possessionPct", label: "Penguasaan bola", format: (v) => `${Math.round(v)}%` },
  { key: "totalShots", label: "Percubaan" },
  { key: "shotsOnTarget", label: "Tepat ke sasaran" },
  { key: "wonCorners", label: "Sepakan sudut" },
  { key: "totalPasses", label: "Hantaran" },
  { key: "passPct", label: "Ketepatan hantaran", format: (v) => `${Math.round(v * 100)}%` },
  { key: "totalTackles", label: "Terjahan" },
  { key: "interceptions", label: "Pintasan" },
  { key: "saves", label: "Selamatan" },
  { key: "foulsCommitted", label: "Kekasaran", lowerIsBetter: true },
  { key: "offsides", label: "Ofsaid", lowerIsBetter: true },
  { key: "yellowCards", label: "Kad kuning", lowerIsBetter: true },
  { key: "redCards", label: "Kad merah", lowerIsBetter: true },
];

export function TeamStats({ home, away }: { home?: Stats; away?: Stats }) {
  if (!home || !away) return <p className="px-5 py-8 text-center text-sm text-neutral-500">Statistik akan muncul beberapa jam selepas wisel penamat.</p>;

  const rows = ROWS.filter((r) => home[r.key] != null && away[r.key] != null);
  return (
    <div className="space-y-4 p-5">
      {rows.map((r) => {
        const h = Number(home[r.key]) || 0;
        const a = Number(away[r.key]) || 0;
        const total = h + a;
        const homeShare = total ? (h / total) * 100 : 50;
        const homeLeads = r.lowerIsBetter ? h < a : h > a;
        const awayLeads = r.lowerIsBetter ? a < h : a > h;
        const show = r.format ?? String;
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className={`tabular-nums ${homeLeads ? "font-semibold text-white" : "text-neutral-400"}`}>{show(h)}</span>
              <span className="text-xs text-neutral-500">{r.label}</span>
              <span className={`tabular-nums ${awayLeads ? "font-semibold text-white" : "text-neutral-400"}`}>{show(a)}</span>
            </div>
            <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
              <div className={`rounded-full ${homeLeads ? "bg-emerald-500" : "bg-neutral-700"}`} style={{ width: `${homeShare}%` }} />
              <div className={`flex-1 rounded-full ${awayLeads ? "bg-sky-500" : "bg-neutral-700"}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
