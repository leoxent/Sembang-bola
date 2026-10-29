import type { TimelineEvent } from "@/lib/match-events";

function Icon({ event }: { event: TimelineEvent }) {
  if (event.kind === "goal") return <span aria-label="Gol">⚽</span>;
  if (event.kind === "card")
    return <span aria-label={`${event.color} card`} className={`inline-block h-3.5 w-2.5 rounded-[2px] ${event.color === "red" ? "bg-red-500" : "bg-yellow-400"}`} />;
  return <span aria-label="Substitution" className="text-xs text-sky-400">⇄</span>;
}

function Body({ event, align }: { event: TimelineEvent; align: "left" | "right" }) {
  const row = `flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`;
  if (event.kind === "sub") {
    return (
      <div className={row}>
        <Icon event={event} />
        <div className="min-w-0">
          <p className="truncate text-sm text-neutral-200">{event.playerIn}</p>
          {event.playerOut && <p className="truncate text-xs text-neutral-500">ganti {event.playerOut}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className={row}>
      <Icon event={event} />
      <div className="min-w-0">
        <p className={`truncate text-sm ${event.kind === "goal" ? "font-semibold text-white" : "text-neutral-200"}`}>
          {event.player}
          {event.kind === "goal" && event.score && <span className="ml-2 font-normal tabular-nums text-neutral-500">{event.score}</span>}
        </p>
        {event.kind === "goal" && event.detail && <p className="truncate text-xs text-neutral-500">{event.detail}</p>}
      </div>
    </div>
  );
}

export function MatchTimeline({ events, homeExternalId }: { events: TimelineEvent[]; homeExternalId: string }) {
  if (events.length === 0) return <p className="px-5 py-8 text-center text-sm text-neutral-500">Tiada detik penting direkodkan.</p>;

  return (
    <ol className="divide-y divide-neutral-800/60">
      {events.map((e, i) => {
        const home = e.team === homeExternalId;
        return (
          <li key={i} className="grid grid-cols-[1fr_3.5rem_1fr] items-center gap-2 px-4 py-2.5">
            <div>{home && <Body event={e} align="right" />}</div>
            <span className="mx-auto rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-300">
              {e.minute}
            </span>
            <div>{!home && <Body event={e} align="left" />}</div>
          </li>
        );
      })}
    </ol>
  );
}
