import type { MetadataRoute } from "next";

// /robots.txt: search engines may index the public site, but not the admin area or internal endpoints.
export default function robots(): MetadataRoute.Robots {
  const url = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${url}/sitemap.xml`,
  };
}
