import { AiContentType, JobStatus, NewsTopicStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AiRefusalError } from "./client";
import { generateMatchSummary, generatePlayerOfTheWeek, type GenerateResult, type PotwPayload } from "./generate";
import { generateFeature } from "./feature";
import { generateNewsArticle } from "./news";
import { generateWeeklyRoundup } from "./weekly";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5 * 60_000;
const STUCK_AFTER_MS = 15 * 60_000;

// ─── Enqueue ────────────────────────────────────────────────────────────────

/** Queues a match summary unless one is already queued or running for this match. */
export async function enqueueMatchSummary(matchId: string, { autoPublish = false } = {}): Promise<boolean> {
  const queued = await prisma.aiJob.findFirst({
    where: {
      type: AiContentType.MATCH_SUMMARY,
      status: { in: [JobStatus.PENDING, JobStatus.RUNNING] },
      payload: { path: ["matchId"], equals: matchId },
    },
    select: { id: true },
  });
  if (queued) return false;
  await prisma.aiJob.create({ data: { type: AiContentType.MATCH_SUMMARY, payload: { matchId, autoPublish } } });
  return true;
}

/** Weekly "Apa jadi minggu ni" for each of the top 5 leagues (published automatically). */
export async function enqueueWeeklyRoundups(): Promise<number> {
  const leagues = await prisma.league.findMany({ select: { slug: true } });
  await prisma.aiJob.createMany({
    data: leagues.map((l) => ({ type: AiContentType.WEEKLY_ROUNDUP, payload: { leagueSlug: l.slug } })),
  });
  return leagues.length;
}

/** One Rencana feature; Rex chooses the category and topic (needs review). */
export async function enqueueFeature(): Promise<void> {
  await prisma.aiJob.create({ data: { type: AiContentType.FEATURE, payload: {} } });
}

export async function enqueuePlayerOfTheWeek(payload: PotwPayload): Promise<void> {
  await prisma.aiJob.create({
    data: { type: AiContentType.PLAYER_OF_THE_WEEK, payload: payload as unknown as Prisma.InputJsonValue },
  });
}

export async function enqueueNewsArticle(topicId: string): Promise<void> {
  await prisma.$transaction([
    prisma.aiJob.create({ data: { type: AiContentType.NEWS_ARTICLE, payload: { topicId } } }),
    prisma.newsTopic.update({ where: { id: topicId }, data: { status: NewsTopicStatus.QUEUED } }),
  ]);
}

// ─── Run ────────────────────────────────────────────────────────────────────

export type JobRunResult =
  | { ran: false }
  | { ran: true; jobId: string; type: AiContentType; outcome: GenerateResult | { status: "failed"; error: string; willRetry: boolean } };

/** Claims and runs the oldest due job. Safe to call concurrently: a job is claimed with a conditional update. */
export async function runNextJob(): Promise<JobRunResult> {
  // Jobs left RUNNING by a crashed or timed-out worker go back to the queue.
  await prisma.aiJob.updateMany({
    where: { status: JobStatus.RUNNING, startedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } },
    data: { status: JobStatus.PENDING },
  });

  const next = await prisma.aiJob.findFirst({
    where: { status: JobStatus.PENDING, runAfter: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
  });
  if (!next) return { ran: false };

  const claimed = await prisma.aiJob.updateMany({
    where: { id: next.id, status: JobStatus.PENDING },
    data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return runNextJob(); // another worker took it

  try {
    const payload = next.payload as Record<string, unknown>;
    const outcome =
      next.type === AiContentType.MATCH_SUMMARY
        ? await generateMatchSummary(
            String(payload.matchId),
            next.id,
            typeof payload.model === "string" ? payload.model : undefined,
            payload.autoPublish === true,
          )
        : next.type === AiContentType.PLAYER_OF_THE_WEEK
          ? await generatePlayerOfTheWeek(payload as unknown as PotwPayload, next.id)
          : next.type === AiContentType.NEWS_ARTICLE
            ? await generateNewsArticle(String(payload.topicId), next.id)
            : next.type === AiContentType.WEEKLY_ROUNDUP
              ? await generateWeeklyRoundup(String(payload.leagueSlug), next.id)
              : next.type === AiContentType.FEATURE
                ? await generateFeature(next.id)
                : ({ status: "skipped", reason: `No generator for ${next.type}` } as const);

    await prisma.aiJob.update({
      where: { id: next.id },
      data: {
        status: JobStatus.SUCCEEDED,
        finishedAt: new Date(),
        lastError: outcome.status === "skipped" ? `Skipped: ${outcome.reason}` : null,
      },
    });
    return { ran: true, jobId: next.id, type: next.type, outcome };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const willRetry = !(err instanceof AiRefusalError) && next.attempts + 1 < MAX_ATTEMPTS;
    await prisma.aiJob.update({
      where: { id: next.id },
      data: willRetry
        ? { status: JobStatus.PENDING, lastError: error, runAfter: new Date(Date.now() + RETRY_DELAY_MS * (next.attempts + 1)) }
        : { status: JobStatus.FAILED, lastError: error, finishedAt: new Date() },
    });
    console.error(`[ai-job ${next.id}]`, err);
    return { ran: true, jobId: next.id, type: next.type, outcome: { status: "failed", error, willRetry } };
  }
}

/** Runs jobs until the queue is empty, `max` jobs have run, or the time budget is nearly used. */
export async function runJobs({ max = 3, budgetMs = 240_000 } = {}) {
  const started = Date.now();
  const results: JobRunResult[] = [];
  while (results.length < max && Date.now() - started < budgetMs - 90_000) {
    const r = await runNextJob();
    if (!r.ran) break;
    results.push(r);
  }
  return results;
}
