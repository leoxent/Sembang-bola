import Link from "next/link";
import { AiContentStatus, AiContentType, JobStatus, NewsTopicStatus } from "@prisma/client";
import { AiActionForm } from "@/components/admin/AiActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AI_DAILY_BUDGET_USD, aiSpendLast24hUsd } from "@/lib/ai/budget";
import { AI_MODEL, draftCost } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import {
  dismissTopic,
  findTopics,
  queueFeature,
  queuePlayerOfTheWeek,
  queueRecentSummaries,
  queueWeeklyRoundups,
  retryFailedJobs,
  runOneJob,
  writeTopicArticle,
} from "@/server/actions/ai";

const TYPE_LABEL: Record<AiContentType, string> = {
  MATCH_SUMMARY: "Match summary",
  PLAYER_OF_THE_WEEK: "Player of the Week",
  NEWS_ARTICLE: "News",
  WEEKLY_ROUNDUP: "Weekly roundup",
  FEATURE: "Artikel",
};

export default async function AiContentPage() {
  const topics = await prisma.newsTopic.findMany({
    where: { status: { in: [NewsTopicStatus.NEW, NewsTopicStatus.QUEUED] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const [drafts, reviewed, jobCounts, failedJobs, leagues] = await Promise.all([
    prisma.aiContent.findMany({
      where: { status: AiContentStatus.GENERATED },
      orderBy: { createdAt: "desc" },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
    }),
    prisma.aiContent.findMany({
      where: { status: { not: AiContentStatus.GENERATED } },
      orderBy: { reviewedAt: "desc" },
      take: 8,
      include: { reviewedBy: { select: { name: true } }, article: { select: { id: true } } },
    }),
    prisma.aiJob.groupBy({ by: ["status"], _count: true }),
    prisma.aiJob.findMany({ where: { status: JobStatus.FAILED }, orderBy: { finishedAt: "desc" }, take: 3 }),
    prisma.league.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  const spent = await aiSpendLast24hUsd();
  const jobs = (s: JobStatus) => jobCounts.find((j) => j.status === s)?._count ?? 0;
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">AI drafts</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Claude writes match summaries, Player of the Week and news articles in casual Malay. Nothing is published until you approve it.
          Model: <code className="text-neutral-300">{AI_MODEL}</code>
        </p>
      </header>

      {!hasKey && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <strong>ANTHROPIC_API_KEY</strong> isn&apos;t set in <code>.env</code>, so jobs will fail until you add it and restart the site.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card space-y-3 p-5">
          <h2 className="font-medium">Queue</h2>
          <p className="text-sm text-neutral-400">
            <span className="text-2xl font-semibold tabular-nums text-white">{jobs(JobStatus.PENDING) + jobs(JobStatus.RUNNING)}</span> waiting ·{" "}
            {jobs(JobStatus.FAILED)} failed
          </p>
          <p className={`text-xs ${spent >= AI_DAILY_BUDGET_USD ? "font-semibold text-red-400" : "text-neutral-500"}`}>
            Spent ${spent.toFixed(2)} of ${AI_DAILY_BUDGET_USD.toFixed(2)} in the last 24h
            {spent >= AI_DAILY_BUDGET_USD && ": budget reached, jobs are paused"}
          </p>
          <AiActionForm action={runOneJob} label="Run next job" pendingLabel="Writing… (up to ~90s)" primary />
          {jobs(JobStatus.FAILED) > 0 && <AiActionForm action={retryFailedJobs} label="Retry failed" pendingLabel="Re-queuing…" />}
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-medium">Match summaries</h2>
          <p className="text-sm text-neutral-400">Queued automatically when a match&apos;s stats arrive. Catch up on the last 7 days:</p>
          <AiActionForm action={queueRecentSummaries} label="Queue missing summaries" pendingLabel="Queuing…" />
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-medium">Player of the Week</h2>
          <p className="text-sm text-neutral-400">From every finished match in the last 7 days.</p>
          <AiActionForm action={queuePlayerOfTheWeek} label="Queue" pendingLabel="Queuing…">
            <select name="league" className="admin-input w-auto">
              <option value="">All 5 leagues</option>
              {leagues.map((l) => (
                <option key={l.slug} value={l.slug}>{l.name}</option>
              ))}
            </select>
          </AiActionForm>
        </div>
      </section>

      <section className="card flex flex-wrap items-start gap-5 p-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- Rex's generated avatar */}
        <img src="/rex/avatar" alt="" className="h-14 w-14 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-1 text-sm text-neutral-400">
          <h2 className="text-base font-medium text-white">Rex&apos;s jobs</h2>
          <p>
            <span className="text-emerald-400">Auto-published:</span> match reports for each league&apos;s top 6 (plus MU, Liverpool,
            Chelsea, Spurs and Man City), and weekly roundups.
          </p>
          <p>
            <span className="text-amber-400">Needs your review:</span> news, viral stories and Rex&apos;s weekly Artikel.
          </p>
          <p className="text-xs text-neutral-500">Once the site is online, the weekly jobs run every Monday by themselves.</p>
        </div>
        <div className="flex flex-col gap-2">
          <AiActionForm action={queueWeeklyRoundups} label="Queue weekly roundups" pendingLabel="Queuing…" />
          <AiActionForm action={queueFeature} label="Rex: write an Artikel" pendingLabel="Queuing…" />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="font-medium">Hot topics</h2>
            <p className="mt-1 text-sm text-neutral-500">Claude searches the web for the stories fans are talking about. Pick one to turn into an article.</p>
          </div>
          <AiActionForm action={findTopics} label="Cari topik hangat" pendingLabel="Searching the web… (up to ~90s)" primary />
        </div>
        {topics.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">No topics yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {topics.map((t) => {
              const sources = t.sources as { title: string; url: string }[];
              return (
                <li key={t.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{t.headline}</p>
                    <p className="text-sm text-neutral-400">{t.summary}</p>
                    <p className="text-sm text-violet-300">Angle: {t.angle}</p>
                    <p className="text-xs text-neutral-500">
                      {t.leagueSlug ?? "other"} · {sources.length} source{sources.length === 1 ? "" : "s"}
                      {sources.slice(0, 3).map((s) => (
                        <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="ml-2 underline hover:text-neutral-300">
                          {new URL(s.url).hostname.replace(/^www\./, "")}
                        </a>
                      ))}
                    </p>
                  </div>
                  {t.status === NewsTopicStatus.QUEUED ? (
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">queued: run the queue</span>
                  ) : (
                    <div className="flex gap-2">
                      <form action={dismissTopic.bind(null, t.id)}>
                        <SubmitButton>Buang</SubmitButton>
                      </form>
                      <form action={writeTopicArticle.bind(null, t.id)}>
                        <SubmitButton pendingText="Queuing…">Tulis artikel</SubmitButton>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {failedJobs.length > 0 && (
        <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm">
          <h2 className="mb-2 font-medium text-red-300">Recent failures</h2>
          <ul className="space-y-1 text-red-200/80">
            {failedJobs.map((j) => (
              <li key={j.id} className="truncate">
                {TYPE_LABEL[j.type]}: {j.lastError}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card overflow-hidden">
        <h2 className="border-b border-neutral-800 px-5 py-3 font-medium">Waiting for review ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">No drafts yet. Queue something above, then run the queue.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/ai-content/${d.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-900">
                  <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">{TYPE_LABEL[d.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {d.match ? `${d.match.homeTeam.name} ${d.match.homeScore}–${d.match.awayScore} ${d.match.awayTeam.name} · ` : ""}
                      {d.createdAt.toLocaleString("en-GB")}
                      {draftCost(d) != null && ` · ≈ $${draftCost(d)!.toFixed(4)}`}
                    </p>
                  </div>
                  <span className="text-sm text-neutral-400">Review →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewed.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="border-b border-neutral-800 px-5 py-3 font-medium">Recently reviewed</h2>
          <ul className="divide-y divide-neutral-800 text-sm">
            {reviewed.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className={r.status === "APPROVED" ? "text-emerald-400" : "text-neutral-500"}>
                  {r.status === "REJECTED" ? "Rejected" : r.reviewedBy ? "Approved" : "Auto-published"}
                </span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="text-xs text-neutral-500">{r.reviewedBy?.name ?? "Rex"}</span>
                {r.article && (
                  <Link href={`/admin/articles/${r.article.id}/edit`} className="text-xs text-neutral-400 hover:text-white">Article →</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
