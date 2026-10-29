import { AiContentType, CategorySection, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appendSources, generateStructured, research, totalCost } from "./client";
import type { GenerateResult } from "./generate";
import { withPhoto } from "./images";
import { hashInput } from "./inputs";
import {
  asDataPrompt,
  FEATURE_PICK_SYSTEM,
  FEATURE_RESEARCH_SYSTEM,
  FEATURE_SYSTEM,
  FeatureSchema,
  featurePickSchema,
  PROMPT_VERSION,
} from "./prompts";

/**
 * Rex's weekly Rencana: picks a feature category and topic (avoiding recent ones), researches it on the web,
 * writes it and adds a photo. Waits in AI drafts for review: it's built from web research, not our own data.
 */
export async function generateFeature(jobId?: string): Promise<GenerateResult> {
  const categories = await prisma.category.findMany({
    // Player of the Week has its own generator.
    where: { section: CategorySection.RENCANA, slug: { not: "player-of-the-week" } },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, description: true },
  });
  if (categories.length === 0) return { status: "skipped", reason: "No Rencana categories exist" };

  const recent = await prisma.aiContent.findMany({
    where: { type: AiContentType.FEATURE },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { title: true, structured: true },
  });
  const today = new Date().toISOString().slice(0, 10);

  const pick = await generateStructured({
    system: FEATURE_PICK_SYSTEM,
    prompt: asDataPrompt(
      "context",
      {
        today,
        categories,
        recentFeatures: recent.map((r) => ({ title: r.title, category: (r.structured as { categorySlug?: string } | null)?.categorySlug })),
      },
      "Pick this week's feature: a category and a specific topic. Vary the category from the recent features.",
    ),
    schema: featurePickSchema(categories.map((c) => c.slug)),
    effort: "low",
  });
  const category = categories.find((c) => c.slug === pick.data.category)!;

  const notes = await research({
    system: FEATURE_RESEARCH_SYSTEM,
    prompt: `Today is ${today}.\nFeature category: ${category.name} (${category.description ?? ""})\nTopic: ${pick.data.topic}\n\nGather the facts for a 600-word feature.`,
    maxSearches: 2,
  });

  const written = await generateStructured({
    system: FEATURE_SYSTEM,
    prompt: asDataPrompt(
      "feature",
      { category: category.name, topic: pick.data.topic, angle: pick.data.angle, researchNotes: notes.notes },
      "Write the feature.",
    ),
    schema: FeatureSchema,
  });
  const { title, body, imageSubjects, ...extras } = written.data;
  const sources = notes.sources.slice(0, 5);

  const created = await prisma.aiContent.create({
    data: {
      type: AiContentType.FEATURE,
      title,
      body: appendSources(await withPhoto(body, imageSubjects), sources),
      structured: {
        ...extras,
        categorySlug: category.slug,
        topic: pick.data.topic,
        sources,
        webSearches: notes.webSearches,
        costUsd: totalCost(pick, notes, written),
      } as Prisma.InputJsonValue,
      model: written.model,
      promptVersion: PROMPT_VERSION.feature,
      inputHash: hashInput({ topic: pick.data.topic, at: Date.now() }, PROMPT_VERSION.feature),
      inputTokens: pick.inputTokens + notes.inputTokens + written.inputTokens,
      outputTokens: pick.outputTokens + notes.outputTokens + written.outputTokens,
      jobId,
    },
    select: { id: true },
  });
  return { status: "created", aiContentId: created.id };
}
