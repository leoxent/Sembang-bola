"use client";

import { useState, useTransition } from "react";
import type { EditorReview } from "@/lib/ai/prompts";
import { Spinner } from "@/components/ui/Spinner";
import { reviewDraft } from "@/server/actions/ai";

interface Props {
  getDraft: () => { title: string; excerpt: string; body: string };
  /** Replaces the first occurrence of `original`; returns false if the text is no longer in the draft. */
  onReplace: (original: string, suggestion: string) => boolean;
  onUseTitle: (title: string) => void;
  onUseExcerpt: (excerpt: string) => void;
  onUseTags: (tags: string[]) => void;
}

/** "Minta Rex semak": Rex proofreads the draft; every suggestion is applied only when the writer clicks it. */
export function RexReviewPanel({ getDraft, onReplace, onUseTitle, onUseExcerpt, onUseTags }: Props) {
  const [review, setReview] = useState<EditorReview | null>(null);
  const [error, setError] = useState<string>();
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [missing, setMissing] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const r = await reviewDraft(getDraft());
      setError(r.error);
      setReview(r.review ?? null);
      setApplied(new Set());
      setMissing(new Set());
    });

  const chip = "rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700";

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- Rex's generated avatar */}
          <img src="/rex/avatar" alt="" className="h-8 w-8 rounded-full" />
          <div>
            <p className="text-sm font-medium">Minta Rex semak</p>
            <p className="text-xs text-neutral-500">Ejaan, fakta meragukan, tajuk, ringkasan dan tag. Kurang RM0.01 setiap semakan.</p>
          </div>
        </div>
        <button type="button" onClick={run} disabled={pending} className="btn-secondary">
          {pending && <Spinner />}
          {pending ? "Rex tengah baca…" : review ? "Semak semula" : "Semak draf"}
        </button>
      </div>
      {error && <p className="border-t border-neutral-800 px-4 py-3 text-sm text-red-400">{error}</p>}

      {review && (
        <div className="space-y-5 border-t border-neutral-800 p-4 text-sm">
          <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-violet-200">{review.summary}</p>

          {review.ruleIssues.length > 0 && (
            <Section title="⚠️ Langgar peraturan laman">
              {review.ruleIssues.map((x) => (
                <li key={x} className="text-amber-300">{x}</li>
              ))}
            </Section>
          )}

          <Section title={`✍️ Pembetulan (${review.corrections.length})`}>
            {review.corrections.length === 0 && <li className="text-neutral-500">Tiada kesilapan ejaan atau bahasa. Padu!</li>}
            {review.corrections.map((c, i) => (
              <li key={i} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-neutral-800 p-2.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p>
                    <span className="text-red-300 line-through">{c.original}</span> → <span className="text-emerald-300">{c.suggestion}</span>
                  </p>
                  <p className="text-xs text-neutral-500">{c.reason}</p>
                </div>
                {applied.has(i) ? (
                  <span className="text-xs text-emerald-400">✓ Diguna</span>
                ) : missing.has(i) ? (
                  <span className="text-xs text-neutral-500">Teks tak dijumpai</span>
                ) : (
                  <button
                    type="button"
                    className={chip}
                    onClick={() =>
                      onReplace(c.original, c.suggestion)
                        ? setApplied((s) => new Set(s).add(i))
                        : setMissing((s) => new Set(s).add(i))
                    }
                  >
                    Guna
                  </button>
                )}
              </li>
            ))}
          </Section>

          {review.factChecks.length > 0 && (
            <Section title="🔎 Semak fakta ini">
              {review.factChecks.map((x) => (
                <li key={x} className="text-neutral-300">{x}</li>
              ))}
            </Section>
          )}

          <Section title="📰 Cadangan tajuk">
            {review.titleSuggestions.map((t) => (
              <li key={t} className="flex items-center justify-between gap-2">
                <span>{t}</span>
                <button type="button" className={chip} onClick={() => onUseTitle(t)}>Guna</button>
              </li>
            ))}
          </Section>

          <Section title="📝 Cadangan ringkasan">
            <li className="flex items-start justify-between gap-2">
              <span className="text-neutral-300">{review.excerpt}</span>
              <button type="button" className={chip} onClick={() => onUseExcerpt(review.excerpt)}>Guna</button>
            </li>
          </Section>

          <Section title="🏷️ Cadangan tag">
            <li className="flex items-center justify-between gap-2">
              <span className="text-neutral-300">{review.tags.join(", ")}</span>
              <button type="button" className={chip} onClick={() => onUseTags(review.tags)}>Guna</button>
            </li>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
