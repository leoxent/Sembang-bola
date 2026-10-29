import { AiContentStatus, AiContentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateStructured } from "./client";
import { withPhoto } from "./images";
import { buildMatchInput, buildPotwInput, hashInput } from "./inputs";
import { publishAiContent } from "./publish";
import { asDataPrompt, MATCH_SUMMARY_SYSTEM, MatchSummarySchema, POTW_SYSTEM, potwSchema, PROMPT_VERSION } from "./prompts";

export type GenerateResult = { status: "created"; aiContentId: string } | { status: "skipped"; reason: string };

/**
 * `model` overrides AI_MODEL for this one summary (e.g. to compare models). The draft is then recorded under
 * "<prompt version>@<model>", so it doesn't count as the match's regular summary.
 * `autoPublish` publishes it as Rex straight away (featured matches); otherwise it waits in AI drafts.
 */
export async function generateMatchSummary(
  matchId: string,
  jobId?: string,
  model?: string,
  autoPublish = false,
): Promise<GenerateResult> {
  const promptVersion = model ? `${PROMPT_VERSION.matchSummary}@${model}` : PROMPT_VERSION.matchSummary;
  const existing = await prisma.aiContent.findFirst({
    where: { type: AiContentType.MATCH_SUMMARY, matchId, promptVersion },
    select: { id: true },
  });
  if (existing) return { status: "skipped", reason: "A summary already exists for this match" };

  const { match, input } = await buildMatchInput(matchId);
  const result = await generateStructured({
    system: MATCH_SUMMARY_SYSTEM,
    prompt: asDataPrompt("match_data", input, "Write the match report for this match."),
    schema: MatchSummarySchema,
    ...(model && { model }),
  });
  const { title, body, imageSubjects, ...extras } = result.data;

  try {
    const created = await prisma.aiContent.create({
      data: {
        type: AiContentType.MATCH_SUMMARY,
        title,
        body: await withPhoto(body, imageSubjects),
        structured: { ...extras, leagueId: match.leagueId, categorySlug: "laporan-perlawanan" } as Prisma.InputJsonValue,
        model: result.model,
        promptVersion,
        inputHash: hashInput(input, promptVersion),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        matchId,
        jobId,
      },
      select: { id: true },
    });
    if (autoPublish && !model) await publishAiContent(created.id, { reviewerId: null, publish: true });
    return { status: "created", aiContentId: created.id };
  } catch (err) {
    // Another worker finished the same match first.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return { status: "skipped", reason: "A summary already exists for this match" };
    throw err;
  }
}

export interface PotwPayload {
  from: string; // ISO date
  to: string;
  leagueId?: string;
  leagueName?: string;
}

export async function generatePlayerOfTheWeek(payload: PotwPayload, jobId?: string): Promise<GenerateResult> {
  const { candidates, input } = await buildPotwInput({
    from: new Date(payload.from),
    to: new Date(payload.to),
    leagueId: payload.leagueId,
  });
  if (candidates.length < 2) return { status: "skipped", reason: "Not enough finished matches with player stats in this period" };

  const scopedInput = { scope: payload.leagueName ?? "Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the Champions League", ...input };
  const inputHash = hashInput(scopedInput, PROMPT_VERSION.playerOfTheWeek);
  const duplicate = await prisma.aiContent.findFirst({
    where: { inputHash, status: { not: AiContentStatus.REJECTED } },
    select: { id: true },
  });
  if (duplicate) return { status: "skipped", reason: "A Player of the Week draft already exists for exactly this data" };

  const result = await generateStructured({
    system: POTW_SYSTEM,
    prompt: asDataPrompt("player_data", scopedInput, "Choose the Player of the Week and write the feature."),
    schema: potwSchema(candidates.map((c) => c.id)),
  });
  const { title, body, playerId, runnersUp, ...extras } = result.data;
  const nameOf = (id: string) => candidates.find((c) => c.id === id)?.name ?? id;

  const created = await prisma.aiContent.create({
    data: {
      type: AiContentType.PLAYER_OF_THE_WEEK,
      title,
      body,
      structured: {
        ...extras,
        leagueId: payload.leagueId ?? null,
        categorySlug: "player-of-the-week",
        scope: scopedInput.scope,
        period: input.periodUtc,
        winner: { playerId, name: nameOf(playerId) },
        runnersUp: runnersUp.map((r) => ({ ...r, name: nameOf(r.playerId) })),
        shortlist: candidates.map((c) => ({ name: c.name, team: c.team, score: c.score, totals: c.totals })),
      } as Prisma.InputJsonValue,
      model: result.model,
      promptVersion: PROMPT_VERSION.playerOfTheWeek,
      inputHash,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      playerId,
      weekStart: new Date(payload.from),
      jobId,
    },
    select: { id: true },
  });
  return { status: "created", aiContentId: created.id };
}
