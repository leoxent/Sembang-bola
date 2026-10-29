export const SITE_NAME = "Sembang Bola";
export const SITE_DESCRIPTION = "Skor langsung, keputusan, jadual perlawanan dan cerita panas dari 5 liga utama Eropah dan Liga Juara-Juara.";

// All times are rendered on the server in one timezone so pages can be cached.
export const SITE_TIMEZONE = process.env.SITE_TIMEZONE ?? "Asia/Kuala_Lumpur";

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ms-MY", { timeZone: SITE_TIMEZONE, ...options });
const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = fmt({ weekday: "long", day: "numeric", month: "long" });
const shortDayFmt = fmt({ weekday: "short", day: "numeric", month: "short" });
const dateFmt = fmt({ day: "numeric", month: "long", year: "numeric" });
const keyFmt = new Intl.DateTimeFormat("en-GB", { timeZone: SITE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export const formatTime = (d: Date) => timeFmt.format(d);
export const formatShortDay = (d: Date) => shortDayFmt.format(d);
export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateTime = (d: Date) => `${shortDayFmt.format(d)}, ${timeFmt.format(d)}`;

/** Calendar day in the site timezone, e.g. "2026-10-29" — used to group matches by day. */
export const dayKey = (d: Date) => keyFmt.format(d).split("/").reverse().join("-");

export function formatDayHeading(d: Date): string {
  const today = dayKey(new Date());
  const key = dayKey(d);
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000));
  if (key === today) return "Hari ini";
  if (key === yesterday) return "Semalam";
  if (key === tomorrow) return "Esok";
  return dayFmt.format(d);
}

export function groupByDay<T extends { kickoffAt: Date }>(items: T[]): { day: string; date: Date; items: T[] }[] {
  const groups = new Map<string, { day: string; date: Date; items: T[] }>();
  for (const item of items) {
    const key = dayKey(item.kickoffAt);
    if (!groups.has(key)) groups.set(key, { day: key, date: item.kickoffAt, items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()];
}
