import { AiContentType, NewsTopicStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appendSources, generateStructured, research, totalCost } from "./client";
import type { GenerateResult } from "./generate";
import { withPhoto } from "./images";
import { hashInput } from "./inputs";
import {
  ARTICLE_RESEARCH_SYSTEM,
  asDataPrompt,
  NEWS_ARTICLE_SYSTEM,
  NewsArticleSchema,
  PROMPT_VERSION,
  TOPICS_RESEARCH_SYSTEM,
  TopicsSchema,
  topicsFromNotesPrompt,
} from "./prompts";

type Source = { title: string; url: string };

const today = () => new Date().toISOString().slice(0, 10);

/** Web-searches current football news and saves up to 5 topic briefs for an editor to pick from. */
export async function findHotTopics(): Promise<{ created: number; costUsd: number }> {
  const notes = await research({
    system: TOPICS_RESEARCH_SYSTEM,
    prompt: `Today is ${today()}. Find the hottest stories in the Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the Champions League right now.`,
    maxSearches: 3, // $0.01 per search, whatever the model

  });
  const structured = await generateStructured({
    system: "You turn football research notes into structured story briefs written in casual Malaysian Malay. Use only facts from the notes.",
    prompt: topicsFromNotesPrompt(notes.notes, notes.sources, today()),
    schema: TopicsSchema,
    effort: "low",
  });

  // Sources are picked by number from what the search actually returned, so no URL can be made up.
  const data: Prisma.NewsTopicCreateManyInput[] = structured.data.topics.slice(0, 5).map((t) => ({
    headline: t.headline,
    summary: t.summary,
    angle: t.angle,
    facts: t.facts,
    sources: [...new Set(t.sourceNumbers)].map((n) => notes.sources[n - 1]).filter(Boolean),
    leagueSlug: t.league === "lain-lain" ? null : t.league,
    category: t.category,
  }));
  await prisma.newsTopic.createMany({ data });
  return { created: data.length, costUsd: totalCost(notes, structured) };
}

/** Researches the latest on one topic, then writes an original Malay article with its sources appended. */
export async function generateNewsArticle(topicId: string, jobId?: string): Promise<GenerateResult> {
  const topic = await prisma.newsTopic.findUnique({ where: { id: topicId } });
  if (!topic) return { status: "skipped", reason: "Topic no longer exists" };

  const facts = topic.facts as string[];
  const topicSources = topic.sources as Source[];

  const latest = await research({
    system: ARTICLE_RESEARCH_SYSTEM,
    prompt: `Today is ${today()}.\nStory: ${topic.headline}\nSummary: ${topic.summary}\nKnown facts:\n${facts.map((f) => `- ${f}`).join("\n")}\n\nFind the latest developments and confirm the facts.`,
    maxSearches: 2,
  });
  const written = await generateStructured({
    system: NEWS_ARTICLE_SYSTEM,
    prompt: asDataPrompt(
      "story",
      { headline: topic.headline, summary: topic.summary, suggestedAngle: topic.angle, facts, latestResearch: latest.notes },
      "Write the article.",
    ),
    schema: NewsArticleSchema,
  });

  // Sources shown to readers: the topic's own plus a few from the latest research, deduplicated.
  const sources = [...new Map([...topicSources, ...latest.sources.slice(0, 4)].map((s) => [s.url, s])).values()].slice(0, 6);
  const body = appendSources(await withPhoto(written.data.body, written.data.imageSubjects), sources);
  const league = topic.leagueSlug ? await prisma.league.findUnique({ where: { slug: topic.leagueSlug }, select: { id: true } }) : null;

  const created = await prisma.aiContent.create({
    data: {
      type: AiContentType.NEWS_ARTICLE,
      title: written.data.title,
      body,
      structured: {
        excerpt: written.data.excerpt,
        tags: written.data.tags,
        leagueId: league?.id ?? null,
        categorySlug: topic.category,
        sources,
        topicId: topic.id,
        webSearches: latest.webSearches,
        costUsd: totalCost(latest, written),
      },
      model: written.model,
      promptVersion: PROMPT_VERSION.newsArticle,
      inputHash: hashInput({ topicId: topic.id }, PROMPT_VERSION.newsArticle),
      inputTokens: latest.inputTokens + written.inputTokens,
      outputTokens: latest.outputTokens + written.outputTokens,
      jobId,
    },
    select: { id: true },
  });
  await prisma.newsTopic.update({ where: { id: topic.id }, data: { status: NewsTopicStatus.WRITTEN } });
  return { status: "created", aiContentId: created.id };
}
