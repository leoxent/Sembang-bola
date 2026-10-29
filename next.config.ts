import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "crests.football-data.org" },
    ],
  },
  // The cover image route reads Inter from node_modules at runtime; make sure the deploy ships those files.
  outputFileTracingIncludes: {
    "/og/article/[id]": ["./node_modules/@fontsource/inter/files/inter-latin-*-normal.woff"],
  },
  // Old addresses keep working: /news (before the Berita/Artikel split) and /rencana (renamed to Artikel).
  async redirects() {
    return [
      { source: "/news", destination: "/berita", permanent: true },
      { source: "/news/:slug", destination: "/artikel/:slug", permanent: true },
      { source: "/rencana", destination: "/artikel", permanent: true },
    ];
  },
};

export default nextConfig;
