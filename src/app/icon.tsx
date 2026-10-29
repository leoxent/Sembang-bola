import { ImageResponse } from "next/og";

// Browser-tab icon: the green "SB" mark.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 14,
          color: "#052e1c",
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        SB
      </div>
    ),
    size,
  );
}
