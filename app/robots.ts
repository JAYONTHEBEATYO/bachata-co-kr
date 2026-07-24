import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  const publicRule = {
    allow: "/",
    disallow: [
      "/admin",
      "/api/",
      "/data/",
      "/docs/",
      "/scripts/",
      "/tools/",
      "/node_modules/",
      "/package-lock.json",
      "/README.md",
      "/AGENTS.md"
    ]
  };

  return {
    rules: [
      {
        userAgent: "*",
        ...publicRule
      },
      { userAgent: "Googlebot", ...publicRule },
      { userAgent: "Yeti", ...publicRule },
      { userAgent: "bingbot", ...publicRule },
      { userAgent: "OAI-SearchBot", ...publicRule },
      { userAgent: "ChatGPT-User", ...publicRule },
      { userAgent: "GPTBot", ...publicRule },
      { userAgent: "ClaudeBot", ...publicRule },
      { userAgent: "PerplexityBot", ...publicRule }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
