// Shared, transparent performance score used to rank players (match page "Top" badge, Player of the Week shortlist).
// Built from what ESPN provides: no minutes, passes or tackles per player, so it favours decisive contributions.

type Extra = Record<string, unknown>;

const num = (extra: Extra, key: string) => (typeof extra[key] === "number" ? (extra[key] as number) : 0);

export function performanceScore(line: { goals: number; assists: number; extra: unknown }): number {
  const x = (line.extra ?? {}) as Extra;
  return (
    line.goals * 3 +
    line.assists * 2 +
    num(x, "shotsOnTarget") * 0.5 +
    num(x, "saves") * 0.4 -
    num(x, "yellowCards") * 0.5 -
    num(x, "redCards") * 2
  );
}

export const statNum = num;
