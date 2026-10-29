import type { MatchStatus as Status } from "@prisma/client";
import { formatTime } from "@/lib/site";

export function MatchStatus({ status, minute, kickoffAt, large = false }: { status: Status; minute: number | null; kickoffAt: Date; large?: boolean }) {
  const base = large ? "text-sm font-semibold tracking-wide" : "text-xs font-semibold";
  switch (status) {
    case "LIVE":
      return (
        <span className={`${base} inline-flex items-center gap-1.5 text-emerald-400`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          {minute ? `${minute}'` : "LIVE"}
        </span>
      );
    case "HALFTIME":
      return <span className={`${base} text-emerald-400`}>HT</span>;
    case "FINISHED":
      return <span className={`${base} text-neutral-500`}>FT</span>;
    case "POSTPONED":
      return <span className={`${base} text-amber-400`}>Tangguh</span>;
    case "CANCELLED":
      return <span className={`${base} text-red-400`}>Batal</span>;
    default:
      return <span className={`${base} tabular-nums text-neutral-300`}>{formatTime(kickoffAt)}</span>;
  }
}
