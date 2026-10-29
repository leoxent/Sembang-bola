import Link from "next/link";
import { AiContentStatus, ArticleStatus, MatchStatus } from "@prisma/client";
import { StatusBadge, OriginBadge } from "@/components/admin/StatusBadge";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [byStatus, pendingAi, matchCount, liveCount, lastSync, recent] = await Promise.all([
    prisma.article.groupBy({ by: ["status"], _count: true }),
    prisma.aiContent.count({ where: { status: AiContentStatus.GENERATED } }),
    prisma.match.count(),
    prisma.match.count({ where: { status: { in: [MatchStatus.LIVE, MatchStatus.HALFTIME] } } }),
    prisma.match.aggregate({ _max: { lastSyncedAt: true } }),
    prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, status: true, origin: true, updatedAt: true },
    }),
  ]);
  const count = (s: ArticleStatus) => byStatus.find((g) => g.status === s)?._count ?? 0;

  const stats = [
    { label: "Published", value: count(ArticleStatus.PUBLISHED), href: "/admin/articles?status=PUBLISHED" },
    { label: "Drafts", value: count(ArticleStatus.DRAFT), href: "/admin/articles?status=DRAFT" },
    { label: "Scheduled", value: count(ArticleStatus.SCHEDULED), href: "/admin/articles?status=SCHEDULED" },
    { label: "AI drafts to review", value: pendingAi, href: "/admin/ai-content" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {matchCount} matches synced
            {liveCount > 0 && <span className="text-emerald-400"> · {liveCount} live now</span>}
            {lastSync._max.lastSyncedAt && <> · last sync {formatRelative(lastSync._max.lastSyncedAt)}</>}
          </p>
        </div>
        <Link href="/admin/articles/new" className="btn-primary">New article</Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 transition hover:border-neutral-700">
            <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
          </Link>
        ))}
      </section>

      <section className="card">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <h2 className="font-medium">Recently edited</h2>
          <Link href="/admin/articles" className="text-sm text-neutral-400 hover:text-white">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">No articles yet. Write your first one.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {recent.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/articles/${a.id}/edit`} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-900">
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                  <OriginBadge origin={a.origin} />
                  <StatusBadge status={a.status} />
                  <span className="hidden w-24 text-right text-xs text-neutral-500 sm:block">{formatRelative(a.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatRelative(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
