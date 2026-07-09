import type { MetadataRoute } from "next";
import { getCommunities, getDancers, getEvents, getThreads } from "@/lib/data";
import { siteUrl } from "@/lib/format";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [threads, communities, events, dancers] = await Promise.all([getThreads("hot"), getCommunities(), getEvents(), getDancers()]);
  const now = new Date();

  const baseRoutes: MetadataRoute.Sitemap = [
    "", "topics", "topics/academy-review", "topics/dancer-review", "topics/social-review", "topics/events", "videos", "events", "guide", "dancers", "write", "guest", "profile", "login"
  ].map((path) => ({
    url: `${siteUrl}/${path}`.replace(/\/$/, "/"),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path ? 0.8 : 1
  }));

  return baseRoutes.concat(
    communities.map((community) => ({
      url: `${siteUrl}/c/${community.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.78
    })),
    threads.map((thread) => ({
      url: `${siteUrl}/t/${thread.id}/${thread.slug}`,
      lastModified: new Date(thread.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.86
    })),
    events.map((event) => ({
      url: `${siteUrl}/events/${event.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.82
    })),
    dancers.map((dancer) => ({
      url: `${siteUrl}/dancers/${dancer.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
  );
}
