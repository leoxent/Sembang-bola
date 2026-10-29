import Link from "next/link";

export function SectionHeading({ title, href, linkLabel = "Lihat semua", children }: { title: string; href?: string; linkLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
        {children}
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm text-neutral-400 transition hover:text-emerald-400">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
