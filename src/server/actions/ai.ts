"use server";

import { AiContentStatus, AiContentType, MatchStatus, NewsTopicStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateStructured } from "@/lib/ai/client";
import {
  enqueueFeature,
  enqueueMatchSummary,
  enqueueNewsArticle,
  enqueuePlayerOfTheWeek,
  enqueueWeeklyRoundups,
  runNextJob,
} from "@/lib/ai/jobs";
import { findHotTopics } from "@/lib/ai/news";
import { asDataPrompt, EDITOR_REVIEW_SYSTEM, type EditorReview, EditorReviewSchema, PROMPT_VERSION } from "@/lib/ai/prompts";
import { publishAiContent } from "@/lib/ai/publish";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface AiActionState {
  message?: string;
  error?: string;
}

const DAY = 86_400_000;

const JOB_LABEL: Record<AiContentType, string> = {
  MATCH_SUMMARY: "Match summary",
  PLAYER_OF_THE_WEEK: "Player of the Week",
  NEWS_ARTICLE: "News article",
  WEEKLY_ROUNDUP: "Weekly roundup",
  FEATURE: "Artikel",
};

/** Queues summaries for finished matches from the last 7 days that have stats but no summary yet. */
export async function queueRecentSummaries(): Promise<AiActionState> {
  await requireAdmin();
  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.FINISHED,
      kickoffAt: { gte: new Date(Date.now() - 7 * DAY) },
      teamStats: { not: Prisma.AnyNull },
      playerStats: { some: {} },
      aiContent: { none: { type: AiContentType.MATCH_SUMMARY, promptVersion: PROMPT_VERSION.matchSummary } },
    },
    select: { id: true },
  });
  let queued = 0;
  for (const m of matches) if (await enqueueMatchSummary(m.id)) queued++;
  revalidatePath("/admin/ai-content");
  return { message: queued ? `Queued ${queued} match summar${queued === 1 ? "y" : "ies"}.` : "Every recent match already has a summary or is queued." };
}

export async function queuePlayerOfTheWeek(_prev: AiActionState, fd: FormData): Promise<AiActionState> {
  await requireAdmin();
  const slug = String(fd.get("league") ?? "");
  const league = slug ? await prisma.league.findUnique({ where: { slug }, select: { id: true, name: true } }) : null;
  if (slug && !league) return { error: "Unknown league" };

  const to = new Date();
  const from = new Date(to.getTime() - 7 * DAY);
  await enqueuePlayerOfTheWeek({
    from: from.toISOString(),
    to: to.toISOString(),
    ...(league && { leagueId: league.id, leagueName: league.name }),
  });
  revalidatePath("/admin/ai-content");
  return { message: `Queued Player of the Week (${league?.name ?? "all 5 leagues"}, last 7 days).` };
}

/** Runs one queued job now (takes ~20-90 seconds). Handy locally, before the cron schedule is set up. */
export async function runOneJob(): Promise<AiActionState> {
  await requireAdmin();
  const r = await runNextJob();
  revalidatePath("/admin/ai-content");
  if (!r.ran && r.budgetReached) return { error: "Daily AI budget reached. Jobs stay queued until spend drops below the limit." };
  if (!r.ran) return { message: "The queue is empty." };
  const label = JOB_LABEL[r.type];
  switch (r.outcome.status) {
    case "created":
      return { message: `${label} drafted. It's in the review list below.` };
    case "skipped":
      return { message: `${label} skipped: ${r.outcome.reason}.` };
    case "failed":
      return { error: `${label} failed: ${r.outcome.error}${r.outcome.willRetry ? " (will retry in a few minutes)" : ""}` };
  }
}

/** Web-searches the latest football news and saves topic briefs (takes ~30-90 seconds). */
export async function findTopics(): Promise<AiActionState> {
  await requireAdmin();
  try {
    const { created, costUsd } = await findHotTopics();
    revalidatePath("/admin/ai-content");
    return { message: `Found ${created} hot topics (≈ $${costUsd.toFixed(3)}).` };
  } catch (err) {
    console.error("[find-topics]", err);
    return { error: `Couldn't search for topics: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function writeTopicArticle(topicId: string): Promise<void> {
  await requireAdmin();
  await enqueueNewsArticle(topicId);
  revalidatePath("/admin/ai-content");
}

export async function dismissTopic(topicId: string): Promise<void> {
  await requireAdmin();
  await prisma.newsTopic.update({ where: { id: topicId }, data: { status: NewsTopicStatus.DISMISSED } });
  revalidatePath("/admin/ai-content");
}

export async function retryFailedJobs(): Promise<AiActionState> {
  await requireAdmin();
  const { count } = await prisma.aiJob.updateMany({
    where: { status: "FAILED" },
    data: { status: "PENDING", attempts: 0, runAfter: new Date(), lastError: null },
  });
  revalidatePath("/admin/ai-content");
  return { message: count ? `Re-queued ${count} failed job${count === 1 ? "" : "s"}.` : "No failed jobs." };
}

/** Turns a draft into an unpublished article by Rex (you as reviewer) and opens it in the editor. */
export async function approveAiContent(id: string): Promise<void> {
  const session = await requireAdmin();
  const content = await prisma.aiContent.findUnique({ where: { id }, select: { id: true } });
  if (!content) redirect("/admin/ai-content");
  const articleId = await publishAiContent(id, { reviewerId: session.adminId, publish: false });
  revalidatePath("/admin", "layout");
  redirect(`/admin/articles/${articleId}/edit?created=1`);
}

export async function queueWeeklyRoundups(): Promise<AiActionState> {
  await requireAdmin();
  const n = await enqueueWeeklyRoundups();
  revalidatePath("/admin/ai-content");
  return { message: `Queued ${n} weekly roundups (they publish automatically when run).` };
}

export async function queueFeature(): Promise<AiActionState> {
  await requireAdmin();
  await enqueueFeature();
  revalidatePath("/admin/ai-content");
  return { message: "Queued: Rex will pick a topic and write an Artikel (about RM0.15, waits for your review)." };
}

/** "Minta Rex semak": proofreads a draft in the editor. Nothing is changed until the writer applies a suggestion. */
export async function reviewDraft(draft: { title: string; excerpt: string; body: string }): Promise<{ review?: EditorReview; error?: string }> {
  await requireAdmin();
  if (draft.body.trim().length < 50) return { error: "Tulis sekurang-kurangnya satu perenggan dulu." };
  try {
    const result = await generateStructured({
      system: EDITOR_REVIEW_SYSTEM,
      prompt: asDataPrompt("draft", { title: draft.title, excerpt: draft.excerpt, body: draft.body.slice(0, 30_000) }, "Semak draf ini."),
      schema: EditorReviewSchema,
      effort: "low",
    });
    return { review: result.data };
  } catch (err) {
    console.error("[review-draft]", err);
    return { error: "Rex tak dapat semak sekarang. Cuba lagi sekejap." };
  }
}

export async function rejectAiContent(id: string): Promise<void> {
  const session = await requireAdmin();
  await prisma.aiContent.update({
    where: { id },
    data: { status: AiContentStatus.REJECTED, reviewedById: session.adminId, reviewedAt: new Date() },
  });
  revalidatePath("/admin", "layout");
  redirect("/admin/ai-content");
}
