import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Set AI_MODEL in .env to switch: claude-haiku-5-5 (cheapest), claude-sonnet-5-5, claude-opus-5-5 (best writing).
export const AI_MODEL = process.env.AI_MODEL || "claude-haiku-5-5";

// List prices, USD per million tokens (input, output). Haiku's rate rises above 100K-token prompts; ours stay far below.
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
  "claude-opus-5-5": [4, 20],
};
const WEB_SEARCH_USD = 0.01; // $10 per 1,000 searches

export function estimateCostUsd(inputTokens: number, outputTokens: number, model = AI_MODEL, webSearches = 0): number {
  const [pin, pout] = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return (inputTokens * pin + outputTokens * pout) / 1_000_000 + webSearches * WEB_SEARCH_USD;
}

/** Total cost of several requests (tokens plus web searches). */
export const totalCost = (...parts: Usage[]) =>
  parts.reduce((sum, u) => sum + estimateCostUsd(u.inputTokens, u.outputTokens, u.model, u.webSearches), 0);

/** Appends a Markdown "Sumber" (sources) list to an article body. */
export function appendSources(body: string, sources: { title: string; url: string }[]): string {
  if (sources.length === 0) return body;
  const list = sources.map((s) => `- [${s.title.replace(/[[\]]/g, "")}](${s.url})`).join("\n");
  return `${body.trimEnd()}\n\n---\n\n**Sumber:**\n\n${list}`;
}

/** A draft's cost: news drafts store their full cost (including web searches); others are computed from tokens. */
export function draftCost(d: { structured: unknown; inputTokens: number | null; outputTokens: number | null; model: string }): number | null {
  const stored = (d.structured as { costUsd?: number } | null)?.costUsd;
  if (typeof stored === "number") return stored;
  return d.inputTokens != null && d.outputTokens != null ? estimateCostUsd(d.inputTokens, d.outputTokens, d.model) : null;
}

let client: Anthropic | undefined;
// Credentials come from ANTHROPIC_API_KEY in .env (the SDK also accepts an `ant auth login` profile locally).
const getClient = () => (client ??= new Anthropic());

// Server-side refusal fallback exists for Opus/Sonnet; Haiku 5.5 has none, so the parameter is only sent where supported.
const supportsFallback = (model: string) => model.startsWith("claude-opus") || model.startsWith("claude-sonnet");
const fallbackParams = (model: string) =>
  supportsFallback(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {};

// The newer web search variant (with dynamic filtering) is for Opus/Sonnet; other models use the basic one.
const webSearchTool = (model: string, maxUses: number) =>
  supportsFallback(model)
    ? ({ type: "web_search_20260209", name: "web_search", max_uses: maxUses } as const)
    : ({ type: "web_search_20250305", name: "web_search", max_uses: maxUses } as const);

/** The model declined the request. Not worth retrying. */
export class AiRefusalError extends Error {}

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
}

/** One request → JSON validated against `schema`. */
export async function generateStructured<S extends z.ZodType>({
  system,
  prompt,
  schema,
  effort = "medium",
  model = AI_MODEL,
}: {
  system: string;
  prompt: string;
  schema: S;
  effort?: "low" | "medium" | "high";
  model?: string;
}): Promise<Usage & { data: z.infer<S> }> {
  const response = await getClient().beta.messages.parse({
    model,
    max_tokens: 16000,
    ...fallbackParams(model),
    output_config: { effort, format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new AiRefusalError(`Declined by the model (${response.stop_details?.category ?? "no category"})`);
  }
  if (response.stop_reason === "max_tokens") throw new Error("Response was cut off (max_tokens)");
  if (!response.parsed_output) throw new Error("Response did not match the expected format");

  return {
    data: response.parsed_output as z.infer<S>,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    webSearches: 0,
  };
}

export interface ResearchResult extends Usage {
  notes: string;
  sources: { title: string; url: string }[];
}

/**
 * Lets the model search the web (Anthropic runs the searches) and returns its research notes plus every source it saw.
 * Kept separate from the structured writing step: web search results come with citations, which can't be combined
 * with structured output in the same request.
 */
export async function research({
  system,
  prompt,
  maxSearches = 5,
  model = AI_MODEL,
}: {
  system: string;
  prompt: string;
  maxSearches?: number;
  model?: string;
}): Promise<ResearchResult> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const usage: Usage = { model, inputTokens: 0, outputTokens: 0, webSearches: 0 };
  const sources = new Map<string, string>();
  let notes = "";

  // A long search turn can pause (stop_reason "pause_turn"); sending the content back resumes it.
  for (let round = 0; round < 4; round++) {
    const response = await getClient().beta.messages.create({
      model,
      max_tokens: 16000,
      ...fallbackParams(model),
      output_config: { effort: "medium" },
      system,
      tools: [webSearchTool(model, maxSearches)],
      messages,
    });
    usage.model = response.model;
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;
    usage.webSearches += response.usage.server_tool_use?.web_search_requests ?? 0;

    for (const block of response.content) {
      if (block.type === "text") notes += block.text;
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === "web_search_result") sources.set(r.url, r.title);
      }
    }

    if (response.stop_reason === "refusal") throw new AiRefusalError("Declined by the model during research");
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  if (!notes.trim()) throw new Error("Research returned no notes");
  return { ...usage, notes, sources: [...sources].map(([url, title]) => ({ url, title })) };
}
