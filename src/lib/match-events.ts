// Turns ESPN's key-event commentary into short facts for the match timeline.
// Only derived facts are shown (scorer, assister, players), not ESPN's commentary text.

export interface StoredEvent {
  type: string;
  minute: string | null;
  text: string | null;
  teamExternalId: string | null;
}

export type TimelineEvent =
  | { kind: "goal"; minute: string; team: string | null; player: string; detail: string | null; score: string | null }
  | { kind: "card"; minute: string; team: string | null; player: string; color: "yellow" | "red" }
  | { kind: "sub"; minute: string; team: string | null; playerIn: string; playerOut: string | null };

export function toTimeline(events: unknown): TimelineEvent[] {
  if (!Array.isArray(events)) return [];
  const out: TimelineEvent[] = [];

  for (const e of events as StoredEvent[]) {
    const text = e.text ?? "";
    const minute = e.minute ?? "";
    const team = e.teamExternalId;

    if (e.type.includes("goal") || e.type.includes("penalty---scored")) {
      const own = /Own Goal by (.+?),/i.exec(text);
      const scorer = own ? own[1] : /^Goal!.*?\d+\.\s(.+?)\s\(/.exec(text)?.[1];
      const assist = /Assisted by (.+?)(?:\swith|\sfollowing|\.|$)/.exec(text)?.[1];
      const score = /^Goal!\s.+?\s(\d+),\s.+?\s(\d+)\./.exec(text);
      out.push({
        kind: "goal",
        minute,
        team,
        player: scorer ?? "Goal",
        detail: own ? "Gol sendiri" : /penalty/i.test(text) ? "Penalti" : assist ? `Assist: ${assist}` : null,
        score: score ? `${score[1]}–${score[2]}` : null,
      });
    } else if (e.type.includes("card")) {
      out.push({
        kind: "card",
        minute,
        team,
        player: /^(.+?)\s\(/.exec(text)?.[1] ?? "Booking",
        color: e.type.includes("red") ? "red" : "yellow",
      });
    } else if (e.type === "substitution") {
      const m = /\.\s(.+?) replaces (.+?)(?:\sbecause|\.|$)/.exec(text);
      if (m) out.push({ kind: "sub", minute, team, playerIn: m[1], playerOut: m[2] });
    }
  }
  return out;
}
