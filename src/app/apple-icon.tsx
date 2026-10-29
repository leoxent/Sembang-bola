import { ImageResponse } from "next/og";

// Home-screen icon for iPhone/iPad ("Add to Home Screen").
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#10b981",
          color: "#052e1c",
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: -3,
        }}
      >
        SB
      </div>
    ),
    size,
  );
}
