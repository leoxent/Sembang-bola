import { prisma } from "@/lib/prisma";
import { draftCost } from "./client";

// A ceiling on what Rex can spend, so a bug or a busy week can't run up the bill. Counted over the last 24 hours
// from the drafts Rex wrote; once reached, queued jobs wait until older drafts drop out of the window.
// Haiku costs about $0.003 per match report and $0.03 per researched article, so $1 is a lot of room.
// (Topic searches don't produce a draft and aren't counted; they run once or twice a day at about $0.05.)
export const AI_DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD) || 1;

export async function aiSpendLast24hUsd(): Promise<number> {
  const drafts = await prisma.aiContent.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    select: { structured: true, inputTokens: true, outputTokens: true, model: true },
  });
  return drafts.reduce((sum, d) => sum + (draftCost(d) ?? 0), 0);
}
