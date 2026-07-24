import type { MetadataRoute } from "next";
import { getCommunities } from "@/lib/data";
import { siteUrl } from "@/lib/format";
import { getPublishedSeoThreads, threadPublicUrl } from "@/lib/seo-threads";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const communities = await getCommunities();
  const threads = await getPublishedSeoThreads(5000);
  const fallbackModified = new Date("2026-07-24T00:00:00+09:00");
  const latestModified = threads[0]
    ? new Date(threads[0].updatedAt || threads[0].createdAt)
    : fallbackModified;
  const baseRoutes = ["", "topics"].map((path) => ({
    url: `${siteUrl}/${path}`.replace(/\/$/, "/"),
    lastModified: latestModified,
    changeFrequency: "daily" as const,
    priority: path ? 0.8 : 1
  }));

  return [
    ...baseRoutes,
    ...communities.map((community) => ({
      url: `${siteUrl}/c/${community.slug}`,
      lastModified: new Date(
        threads.find((thread) => thread.category === community.category)?.updatedAt
          || threads.find((thread) => thread.category === community.category)?.createdAt
          || fallbackModified
      ),
      changeFrequency: "daily" as const,
      priority: 0.85
    })),
    ...threads.map((thread) => ({
      url: threadPublicUrl(thread.id),
      lastModified: new Date(thread.updatedAt || thread.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.75
    }))
  ];
}
