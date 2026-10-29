"use client";

import { useActionState, useRef, useState } from "react";
import type { ArticleStatus } from "@prisma/client";
import { autoCoverUrl } from "@/lib/cover";
import { saveArticle, type ArticleFormState } from "@/server/actions/articles";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ImagePicker } from "./ImagePicker";
import { RexReviewPanel } from "./RexReviewPanel";
import { StatusBadge } from "./StatusBadge";

export interface ArticleFormValues {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  tags: string;
  categoryId: string;
  leagueId: string;
  status: ArticleStatus;
  scheduledFor: string | null; // ISO
  updatedAt: string; // ISO, versions the automatic cover URL
}

interface Props {
  article?: ArticleFormValues;
  leagues: { id: string; name: string }[];
  categories: { id: string; name: string; slug: string; section: "BERITA" | "RENCANA" }[];
  notice?: string;
}

export function ArticleForm({ article, leagues, categories, notice }: Props) {
  const [state, action] = useActionState<ArticleFormState, FormData>(
    saveArticle.bind(null, article?.id ?? null),
    { message: notice },
  );

  // Controlled fields: React resets uncontrolled forms after an action, which would wipe input on a validation error.
  const [values, setValues] = useState({
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    body: article?.body ?? "",
    coverImageUrl: article?.coverImageUrl ?? "",
    tags: article?.tags ?? "",
    categoryId: article?.categoryId || categories.find((c) => c.slug === "berita")?.id || "",
    leagueId: article?.leagueId ?? "",
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [scheduleLocal, setScheduleLocal] = useState(article?.scheduledFor ? toLocalInput(article.scheduledFor) : "");

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }));
  };

  // Inserts text at the body's cursor (or at the end), on its own paragraph.
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const insertIntoBody = (snippet: string) => {
    const el = bodyRef.current;
    setValues((v) => {
      const at = el ? el.selectionEnd : v.body.length;
      const before = v.body.slice(0, at).replace(/\s*$/, "");
      const after = v.body.slice(at).replace(/^\s*/, "");
      const body = `${before}${before ? "\n\n" : ""}${snippet}${after ? `\n\n${after}` : "\n"}`;
      const cursor = before.length + (before ? 2 : 0) + snippet.length;
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(cursor, cursor);
      });
      return { ...v, body };
    });
  };
  const imageSuggestions = values.tags
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 2)
    .slice(0, 8);

  const status = article?.status ?? "DRAFT";
  const isLive = status === "PUBLISHED";
  const errors = state.errors ?? {};
  const words = values.body.trim() ? values.body.trim().split(/\s+/).length : 0;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="scheduledFor" value={scheduleLocal ? new Date(scheduleLocal).toISOString() : ""} />

      <div className="space-y-5">
        <Field label="Title" error={errors.title}>
          <input name="title" value={values.title} onChange={onTitle} className="admin-input text-lg font-medium" placeholder="Napoli run riot in Monza" />
        </Field>
        <Field label="URL slug" error={errors.slug} hint={`/artikel/${values.slug || "…"}`}>
          <input
            name="slug"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug")(e);
            }}
            className="admin-input font-mono"
          />
        </Field>
        <Field label="Excerpt" error={errors.excerpt} hint={`${values.excerpt.length}/300 · shown on cards and in search results`}>
          <textarea name="excerpt" value={values.excerpt} onChange={set("excerpt")} rows={2} className="admin-input resize-y" />
        </Field>
        <Field label="Body" error={errors.body} hint={`Markdown supported · ${words} words`}>
          <textarea
            ref={bodyRef}
            name="body"
            value={values.body}
            onChange={set("body")}
            rows={22}
            className="admin-input resize-y font-mono text-[13px] leading-relaxed"
            placeholder={"## Match report\n\nWrite in **Markdown**…"}
          />
        </Field>
        <ImagePicker suggestions={imageSuggestions} onInsert={insertIntoBody} />
        <RexReviewPanel
          getDraft={() => ({ title: values.title, excerpt: values.excerpt, body: values.body })}
          onReplace={(original, suggestion) => {
            // Corrections can point at the body, title or excerpt: fix the first place the text appears.
            for (const key of ["body", "title", "excerpt"] as const) {
              if (values[key].includes(original)) {
                setValues((v) => ({ ...v, [key]: v[key].replace(original, suggestion) }));
                return true;
              }
            }
            return false;
          }}
          onUseTitle={(title) => setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }))}
          onUseExcerpt={(excerpt) => setValues((v) => ({ ...v, excerpt: excerpt.slice(0, 300) }))}
          onUseTags={(tags) => setValues((v) => ({ ...v, tags: tags.join(", ") }))}
        />
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card space-y-4 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Status</span>
            <StatusBadge status={status} />
          </div>
          {state.message && (
            <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{state.message}</p>
          )}
          <div className="grid gap-2">
            {!isLive && (
              <SubmitButton name="intent" value="publish" className="btn-primary" pendingText="Publishing…">
                {status === "SCHEDULED" ? "Publish now" : "Publish"}
              </SubmitButton>
            )}
            <SubmitButton name="intent" value="save" className={isLive ? "btn-primary" : "btn-secondary"} pendingText="Saving…">
              {isLive ? "Update" : article ? "Save" : "Save draft"}
            </SubmitButton>
            {(isLive || status === "SCHEDULED") && (
              <SubmitButton name="intent" value="unpublish" pendingText="Unpublishing…">Unpublish</SubmitButton>
            )}
            {article && status !== "ARCHIVED" && (
              <SubmitButton name="intent" value="archive" pendingText="Archiving…">Archive</SubmitButton>
            )}
          </div>
          {!isLive && (
            <div className="space-y-2 border-t border-neutral-800 pt-4">
              <Field label="Schedule for later" error={errors.scheduledFor}>
                <input type="datetime-local" value={scheduleLocal} onChange={(e) => setScheduleLocal(e.target.value)} className="admin-input" />
              </Field>
              <SubmitButton name="intent" value="schedule" disabled={!scheduleLocal} className="btn-secondary w-full" pendingText="Scheduling…">
                Schedule
              </SubmitButton>
            </div>
          )}
        </div>

        <div className="card space-y-4 p-4">
          <Field label="Category" error={errors.categoryId}>
            <select name="categoryId" value={values.categoryId} onChange={set("categoryId")} className="admin-input">
              {(["BERITA", "RENCANA"] as const).map((section) => (
                <optgroup key={section} label={section === "BERITA" ? "Berita (news)" : "Artikel (features)"}>
                  {categories
                    .filter((c) => c.section === section)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="League">
            <select name="leagueId" value={values.leagueId} onChange={set("leagueId")} className="admin-input">
              <option value="">None</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Tags" hint="Comma-separated, up to 10">
            <input name="tags" value={values.tags} onChange={set("tags")} className="admin-input" placeholder="napoli, match report" />
          </Field>
          <Field
            label="Cover image"
            error={errors.coverImageUrl}
            hint={values.coverImageUrl ? "Using your image. Clear the field to use the automatic cover." : "Empty: an automatic cover card is used. Paste an image URL to use your own."}
          >
            <input name="coverImageUrl" value={values.coverImageUrl} onChange={set("coverImageUrl")} className="admin-input" placeholder="https://… (optional)" />
          </Field>
          {/^https?:\/\//.test(values.coverImageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-entered host
            <img src={values.coverImageUrl} alt="" className="aspect-[1200/630] w-full rounded-lg object-cover" />
          ) : article ? (
            <div className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- our own generated PNG */}
              <img src={autoCoverUrl(article)} alt="Automatic cover" className="aspect-[1200/630] w-full rounded-lg object-cover" />
              <p className="text-xs text-neutral-600">Automatic cover (refreshes when you save)</p>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-neutral-800 px-3 py-4 text-center text-xs text-neutral-500">
              The automatic cover appears after the first save.
            </p>
          )}
        </div>
      </aside>
    </form>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-neutral-400">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-neutral-600">{hint}</span>
      )}
    </label>
  );
}

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

// ISO → "YYYY-MM-DDTHH:mm" in the browser's local time, for <input type="datetime-local">.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
