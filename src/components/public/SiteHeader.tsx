import Link from "next/link";
import { LeagueLogo } from "@/components/public/LeagueLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SITE_NAME } from "@/lib/site";
import { getLeagues } from "@/server/queries/matches";

export async function SiteHeader() {
  const leagues = await getLeagues();
  const leagueLink = "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-neutral-400 transition hover:bg-white/5 hover:text-white";
  const mainLink = "rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-200 transition hover:bg-white/5 hover:text-white";

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-xs font-black text-neutral-950">SB</span>
          <span className="font-bold tracking-tight" aria-label={SITE_NAME}>
            Sembang <span className="text-emerald-400">Bola</span>
          </span>
        </Link>
        {/* Wide screens: leagues inline */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {leagues.map((l) => (
            <Link key={l.slug} href={`/leagues/${l.slug}`} className={leagueLink}>
              {l.logoUrl && <LeagueLogo src={l.logoUrl} alt="" width={16} height={16} />}
              {l.kind === "cup" ? l.shortName : l.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Link href="/berita" className={mainLink}>Berita</Link>
          <Link href="/artikel" className={mainLink}>Artikel</Link>
          <ThemeToggle />
        </div>
      </div>
      {/* Phones and tablets: leagues get their own scrollable row, so the main links always fit */}
      <nav className="-mt-1 flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:hidden">
        {leagues.map((l) => (
          <Link key={l.slug} href={`/leagues/${l.slug}`} className={`${leagueLink} bg-white/[0.03] text-xs`}>
            {l.logoUrl && <LeagueLogo src={l.logoUrl} alt="" width={14} height={14} />}
            {l.shortName}
          </Link>
        ))}
      </nav>
    </header>
  );
}
