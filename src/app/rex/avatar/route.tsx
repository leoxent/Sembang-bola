import { ImageResponse } from "next/og";

// GET /rex/avatar: Rex's default profile picture (an admin can upload a different one on the Team page).
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)",
          position: "relative",
        }}
      >
        <div style={{ fontSize: 150, fontWeight: 800, color: "#ecfdf5", letterSpacing: -6, marginTop: -10 }}>R</div>
        <div
          style={{
            position: "absolute",
            bottom: 26,
            right: 26,
            fontSize: 34,
            fontWeight: 800,
            color: "#052e1c",
            background: "#fbbf24",
            borderRadius: 14,
            padding: "2px 12px",
          }}
        >
          AI
        </div>
      </div>
    ),
    { width: 256, height: 256, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
