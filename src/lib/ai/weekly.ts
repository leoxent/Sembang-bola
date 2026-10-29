import { AiContentType, MatchStatus, type Prisma } from "@prisma/client";
import { COMPETITIONS } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { getStandings } from "@/lib/providers/espn-standings";
import { performanceScore, statNum } from "@/lib/scoring";
import { generateStructured } from "./client";
import type { GenerateResult } from "./generate";
import { withPhoto } from "./images";
import { hashInput } from "./inputs";
import { publishAiContent } from "./publish";
import { asDataPrompt, PROMPT_VERSION, RoundupSchema, WEEKLY_ROUNDUP_SYSTEM } from "./prompts";

const WEEK_MS = 7 * 86_400_000;

/** "Apa jadi minggu ni" for one league, from the last 7 days of results, the table and player stats. Auto-published. */
export async function generateWeeklyRoundup(leagueSlug: string, jobId?: string): Promise<GenerateResult> {
  const league = await prisma.league.findUnique({ where: { slug: leagueSlug }, select: { id: true, name: true, season: true } });
  if (!league) return { status: "skipped", reason: `Unknown league ${leagueSlug}` };

  const to = new Date();
  const from = new Date(to.getTime() - WEEK_MS);
  const promptVersion = PROMPT_VERSION.weeklyRoundup;
  const inputHash = hashInput({ league: leagueSlug, week: to.toISOString().slice(0, 10) }, promptVersion);
  if (await prisma.aiContent.findFirst({ where: { inputHash }, select: { id: true } }))
    return { status: "skipped", reason: "This week's roundup already exists" };

  const matches = await prisma.match.findMany({
    where: { leagueId: league.id, status: MatchStatus.FINISHED, kickoffAt: { gte: from, lt: to } },
    orderBy: { kickoffAt: "asc" },
    select: {
      kickoffAt: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      playerStats: { include: { player: { select: { id: true, name: true, position: true } } } },
    },
  });
  if (matches.length === 0) return { status: "skipped", reason: `No finished ${league.name} matches this week` };

  const espn = COMPETITIONS.find((l) => l.slug === leagueSlug)?.espn;
  const table = espn ? await getStandings(espn).catch(() => []) : [];

  // The week's standout players, by the same score used everywhere else on the site.
  const byPlayer = new Map<string, { name: string; team: string; goals: number; assists: number; shotsOnTarget: number; saves: number; score: number }>();
  for (const m of matches) {
    for (const s of m.playerStats) {
      const x = (s.extra ?? {}) as Record<string, unknown>;
      const p = byPlayer.get(s.player.id) ?? {
        name: s.player.name,
        team: s.teamId === m.homeTeamId ? m.homeTeam.name : m.awayTeam.name,
        goals: 0,
        assists: 0,
        shotsOnTarget: 0,
        saves: 0,
        score: 0,
      };
      p.goals += s.goals;
      p.assists += s.assists;
      p.shotsOnTarget += statNum(x, "shotsOnTarget");
      p.saves += statNum(x, "saves");
      p.score += performanceScore(s);
      byPlayer.set(s.player.id, p);
    }
  }
  const standouts = [...byPlayer.values()]
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _score, ...p }) => p);

  const input = {
    league: league.name,
    season: `${league.season}/${String(league.season + 1).slice(-2)}`,
    periodUtc: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    results: matches.map((m) => ({
      dateUtc: m.kickoffAt.toISOString().slice(0, 10),
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      score: `${m.homeScore}-${m.awayScore}`,
    })),
    table: table.map((r) => ({
      position: r.rank,
      team: r.name,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalDifference: r.goalDiff,
      points: r.points,
      zone: r.zone,
    })),
    standoutPlayers: standouts,
    dataNotes: "Player stats may be missing for the most recent matches. Playing minutes and xG are not available.",
  };

  const result = await generateStructured({
    system: WEEKLY_ROUNDUP_SYSTEM,
    prompt: asDataPrompt("week_data", input, `Write this week's ${league.name} roundup.`),
    schema: RoundupSchema,
  });
  const { title, body, imageSubjects, ...extras } = result.data;

  const created = await prisma.aiContent.create({
    data: {
      type: AiContentType.WEEKLY_ROUNDUP,
      title,
      body: await withPhoto(body, imageSubjects),
      structured: { ...extras, leagueId: league.id, categorySlug: "ringkasan-mingguan", period: input.periodUtc } as Prisma.InputJsonValue,
      model: result.model,
      promptVersion,
      inputHash,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      weekStart: from,
      jobId,
    },
    select: { id: true },
  });
  // Built only from match data, so it publishes without review.
  await publishAiContent(created.id, { reviewerId: null, publish: true });
  return { status: "created", aiContentId: created.id };
}
