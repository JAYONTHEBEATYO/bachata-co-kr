import type { MetadataRoute } from "next";
import { getCommunities } from "@/lib/data";
import { siteUrl } from "@/lib/format";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const communities = await getCommunities();
  const now = new Date();
  const baseRoutes = ["", "topics", "write", "search"].map((path) => ({
    url: `${siteUrl}/${path}`.replace(/\/$/, "/"),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path ? 0.8 : 1
  }));

  return baseRoutes.concat(communities.map((community) => ({
    url: `${siteUrl}/c/${community.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85
  })));
}
