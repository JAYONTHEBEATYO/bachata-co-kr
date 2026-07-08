import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/data/",
          "/docs/",
          "/scripts/",
          "/tools/",
          "/node_modules/",
          "/package-lock.json",
          "/README.md",
          "/AGENTS.md"
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
