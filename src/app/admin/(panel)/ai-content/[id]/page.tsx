import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Markdown } from "@/components/public/Markdown";
import { draftCost } from "@/lib/ai/client";
import { prisma } from "@/lib/prisma";
import { approveAiContent, rejectAiContent } from "@/server/actions/ai";

interface Extras {
  excerpt?: string;
  tags?: string[];
  playerOfTheMatch?: { name: string; reason: string };
  keyStats?: { label: string; value: string }[];
  winner?: { name: string };
  runnersUp?: { name: string; reason: string }[];
  shortlist?: { name: string; team: string; score: number }[];
  scope?: string;
  period?: { from: string; to: string };
}

export default async function AiDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await prisma.aiContent.findUnique({
    where: { id },
    include: {
      match: { include: { homeTeam: true, awayTeam: true, league: true } },
      article: { select: { id: true } },
      reviewedBy: { select: { name: true } },
    },
  });
  if (!draft) notFound();
  const x = (draft.structured ?? {}) as Extras;
  const pending = draft.status === "GENERATED";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/ai-content" className="text-sm text-neutral-500 hover:text-neutral-300">← AI drafts</Link>
          <h1 className="mt-2 text-2xl font-semibold">Review draft</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {draft.match
              ? `${draft.match.league.name}: ${draft.match.homeTeam.name} ${draft.match.homeScore}–${draft.match.awayScore} ${draft.match.awayTeam.name}`
              : `${x.scope ?? "Player of the Week"}${x.period ? `, ${x.period.from} to ${x.period.to}` : ""}`}
          </p>
        </div>
        {pending ? (
          <div className="flex gap-2">
            <ConfirmButton action={rejectAiContent.bind(null, draft.id)} confirm="Reject this draft?" className="btn-secondary">
              Reject
            </ConfirmButton>
            <form action={approveAiContent.bind(null, draft.id)}>
              <SubmitButton className="btn-primary" pendingText="Creating article…">Approve &amp; edit</SubmitButton>
            </form>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">
            {draft.status === "APPROVED" ? "Approved" : "Rejected"} by {draft.reviewedBy?.name ?? "—"}
            {draft.article && (
              <Link href={`/admin/articles/${draft.article.id}/edit`} className="ml-3 text-emerald-400 hover:underline">Open article →</Link>
            )}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <article className="card p-6 sm:p-8">
          <h2 className="text-2xl font-bold leading-tight">{draft.title}</h2>
          {x.excerpt && <p className="mt-3 text-neutral-400">{x.excerpt}</p>}
          <div className="mt-6 border-t border-neutral-800 pt-6">
            <Markdown>{draft.body}</Markdown>
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {x.playerOfTheMatch && (
            <div className="card p-4">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Player of the match</p>
              <p className="mt-1 font-semibold">{x.playerOfTheMatch.name}</p>
              <p className="mt-1 text-sm text-neutral-400">{x.playerOfTheMatch.reason}</p>
            </div>
          )}
          {x.winner && (
            <div className="card p-4">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Player of the Week</p>
              <p className="mt-1 font-semibold text-emerald-400">{x.winner.name}</p>
              {x.runnersUp && x.runnersUp.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-neutral-800 pt-3 text-sm">
                  {x.runnersUp.map((r) => (
                    <li key={r.name}>
                      <span className="font-medium">{r.name}</span> <span className="text-neutral-400">· {r.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {x.keyStats && x.keyStats.length > 0 && (
            <div className="card p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Key stats</p>
              <dl className="space-y-1.5 text-sm">
                {x.keyStats.map((s) => (
                  <div key={s.label} className="flex justify-between gap-3">
                    <dt className="text-neutral-400">{s.label}</dt>
                    <dd className="text-right font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {x.shortlist && (
            <div className="card p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Shortlist (by score)</p>
              <ol className="space-y-1 text-sm">
                {x.shortlist.map((c) => (
                  <li key={c.name} className="flex justify-between gap-3">
                    <span className="truncate">{c.name} <span className="text-neutral-500">· {c.team}</span></span>
                    <span className="tabular-nums text-neutral-400">{c.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="card space-y-1 p-4 text-xs text-neutral-500">
            <p>Model: {draft.model}</p>
            <p>Prompt: {draft.promptVersion}</p>
            {draft.inputTokens != null && draft.outputTokens != null && (
              <p>
                Tokens: {draft.inputTokens.toLocaleString()} in / {draft.outputTokens.toLocaleString()} out · ≈ $
                {draftCost(draft)?.toFixed(4)}
              </p>
            )}
            {x.tags && <p>Tags: {x.tags.join(", ")}</p>}
          </div>
          {pending && (
            <p className="px-1 text-xs text-neutral-500">
              Approving creates an unpublished article with this text, linked to the match, so you can edit it before publishing.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
