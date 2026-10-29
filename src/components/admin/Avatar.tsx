const SIZES = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-24 w-24 text-2xl" } as const;

export function Avatar({ src, name, size = "md" }: { src?: string | null; name: string; size?: keyof typeof SIZES }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- small data URL, next/image adds nothing
    <img src={src} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-neutral-800 font-semibold text-neutral-300`}>
      {initials || "?"}
    </span>
  );
}
