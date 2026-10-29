import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { AiContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate, SITE_NAME } from "@/lib/site";

// GET /og/article/:id: a 1200×630 cover card drawn from the article's own data (no third-party photos).
// Used whenever an article has no custom cover image, and as its social-sharing preview.

export const runtime = "nodejs";

const W = 1200;
const H = 630;
const GREEN = "#10b981";

type Font = { name: string; data: Buffer; weight: 500 | 800; style: "normal" };
let fontsPromise: Promise<Font[]> | undefined;
function loadFonts(): Promise<Font[]> {
  const dir = path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files");
  fontsPromise ??= Promise.all(
    ([500, 800] as const).map(async (weight) => ({
      name: "Inter",
      data: await readFile(path.join(dir, `inter-latin-${weight}-normal.woff`)),
      weight,
      style: "normal" as const,
    })),
  ).catch(() => []); // fall back to the built-in font rather than failing the image
  return fontsPromise;
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

function Logo({ src, name, size }: { src: string | null | undefined; name: string; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
    return <img src={src} width={size} height={size} style={{ objectFit: "contain" }} alt="" />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: size, background: "#262626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 800, color: "#a3a3a3" }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Frame({ league, children, footer }: { league?: { name: string; logoUrl: string | null } | null; children: React.ReactNode; footer?: string }) {
  return (
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        padding: 56,
        color: "#fafafa",
        fontFamily: "Inter",
        background: "linear-gradient(135deg, #064e3b 0%, #0a0a0a 45%, #0a0a0a 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: GREEN, color: "#052e1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>SB</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }} aria-label={SITE_NAME}>
            Sembang<span style={{ color: GREEN, marginLeft: 9 }}>Bola</span>
          </div>
        </div>
        {league && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, color: "#a3a3a3", fontWeight: 500 }}>
            <Logo src={league.logoUrl} name={league.name} size={44} />
            {league.name}
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</div>
      {footer && <div style={{ fontSize: 30, fontWeight: 800, color: "#d4d4d4", lineHeight: 1.25 }}>{clip(footer, 85)}</div>}
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: {
      title: true,
      excerpt: true,
      league: { select: { name: true, logoUrl: true } },
      match: {
        select: {
          homeScore: true,
          awayScore: true,
          status: true,
          kickoffAt: true,
          league: { select: { name: true, logoUrl: true } },
          homeTeam: { select: { name: true, logoUrl: true } },
          awayTeam: { select: { name: true, logoUrl: true } },
        },
      },
      aiContent: {
        select: {
          type: true,
          structured: true,
          player: { select: { name: true, team: { select: { name: true, logoUrl: true, league: { select: { name: true, logoUrl: true } } } } } },
        },
      },
    },
  });
  if (!article) return new Response("Not found", { status: 404 });

  let card: React.ReactElement;
  const m = article.match;
  const potw = article.aiContent?.type === AiContentType.PLAYER_OF_THE_WEEK ? article.aiContent : null;

  if (m) {
    const played = m.homeScore != null && m.awayScore != null && m.status !== "SCHEDULED";
    const team = (t: { name: string; logoUrl: string | null }) => (
      <div style={{ width: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <Logo src={t.logoUrl} name={t.name} size={170} />
        <div style={{ fontSize: 36, fontWeight: 800, textAlign: "center" }}>{clip(t.name, 18)}</div>
      </div>
    );
    card = (
      <Frame league={m.league} footer={article.title}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {team(m.homeTeam)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: played ? 150 : 90, fontWeight: 800, letterSpacing: -4 }}>
              {played ? `${m.homeScore}–${m.awayScore}` : "VS"}
            </div>
            <div style={{ fontSize: 24, color: "#a3a3a3", fontWeight: 500 }}>{formatDate(m.kickoffAt)}</div>
          </div>
          {team(m.awayTeam)}
        </div>
      </Frame>
    );
  } else if (potw) {
    const s = (potw.structured ?? {}) as { winner?: { name: string }; shortlist?: { name: string; totals: Record<string, number> }[] };
    const name = potw.player?.name ?? s.winner?.name ?? "Player of the Week";
    const totals = s.shortlist?.find((c) => c.name === name)?.totals ?? {};
    const chips = [
      totals.goals ? `${totals.goals} gol` : null,
      totals.assists ? `${totals.assists} assist` : null,
      totals.shotsOnTarget ? `${totals.shotsOnTarget} tepat sasaran` : null,
      totals.saves ? `${totals.saves} selamatan` : null,
    ].filter(Boolean) as string[];
    card = (
      <Frame league={potw.player?.team?.league ?? article.league} footer={article.title}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: GREEN, letterSpacing: 4 }}>PLAYER OF THE WEEK</div>
          <div style={{ fontSize: name.length > 18 ? 80 : 96, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{clip(name, 26)}</div>
          {potw.player?.team && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, color: "#d4d4d4", fontWeight: 500 }}>
              <Logo src={potw.player.team.logoUrl} name={potw.player.team.name} size={52} />
              {potw.player.team.name}
            </div>
          )}
          {chips.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              {chips.map((c) => (
                <div key={c} style={{ fontSize: 26, fontWeight: 800, padding: "8px 18px", borderRadius: 40, background: "#14532d", color: "#bbf7d0" }}>{c}</div>
              ))}
            </div>
          )}
        </div>
      </Frame>
    );
  } else {
    const title = clip(article.title, 120);
    card = (
      <Frame league={article.league}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: GREEN, letterSpacing: 4 }}>BERITA</div>
          <div style={{ fontSize: title.length > 80 ? 54 : title.length > 50 ? 64 : 76, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>{title}</div>
          {article.excerpt && <div style={{ fontSize: 28, color: "#a3a3a3", lineHeight: 1.35, fontWeight: 500 }}>{clip(article.excerpt, 150)}</div>}
        </div>
      </Frame>
    );
  }

  const fonts = await loadFonts();
  return new ImageResponse(card, {
    width: W,
    height: H,
    fonts: fonts.length ? fonts : undefined,
    // The URL carries ?v=<updatedAt>, so a cached image is never stale.
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
