import { getCommunityContext } from "@/lib/community-server";
import { compactThreadId } from "@/lib/community-api";
import { communityByCategory } from "@/lib/communities";
import { absoluteUrl } from "@/lib/format";
import { normalizeStoredIpPrefix } from "@/lib/ip-display";
import { displayGuestNickname } from "@/lib/nicknames";
import type { GuestThread } from "@/lib/types";

export type SeoThread = {
  id: string;
  title: string;
  body: string;
  category: string;
  guestId: string;
  linkUrl: string | null;
  score: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

export const threadPublicPath = (id: string) =>
  `/g/${encodeURIComponent(compactThreadId(id))}`;

export const threadPublicUrl = (id: string) =>
  absoluteUrl(threadPublicPath(id));

export const getPublishedSeoThreads = async (limit = 1000): Promise<SeoThread[]> => {
  const { db } = await getCommunityContext();
  if (!db) return [];

  const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit)));
  const rows = await db.prepare(
    `select
      g.id,
      g.title,
      g.body,
      g.category,
      g.guest_id as guestId,
      g.link_url as linkUrl,
      g.score,
      g.downvotes,
      g.created_at as createdAt,
      g.updated_at as updatedAt,
      (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
    from guest_threads g
    where g.status = 'published'
    order by g.updated_at desc, g.created_at desc
    limit ?`
  ).bind(safeLimit).all<SeoThread>();

  return (rows.results || []).map((thread) => ({
    ...thread,
    score: Number(thread.score || 0),
    downvotes: Number(thread.downvotes || 0),
    commentCount: Number(thread.commentCount || 0)
  }));
};

export const getServerFeedThreads = async ({
  category,
  sort = "hot",
  limit = 40
}: {
  category?: string;
  sort?: "hot" | "new" | "top";
  limit?: number;
} = {}): Promise<GuestThread[]> => {
  const { db } = await getCommunityContext();
  if (!db) return [];

  const safeLimit = Math.max(1, Math.min(40, Math.floor(limit)));
  const orderBy = sort === "new"
    ? "g.created_at desc"
    : sort === "top"
      ? "g.score desc, g.downvotes asc, commentCount desc, g.created_at desc"
      : "(g.score + commentCount * 3 - g.downvotes) desc, g.created_at desc";
  const select = `select
    g.id,
    g.title,
    g.body,
    g.category,
    g.guest_id as guestId,
    g.ip_prefix as ipPrefix,
    g.link_url as linkUrl,
    g.score,
    g.downvotes,
    g.created_at as createdAt,
    g.updated_at as updatedAt,
    (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
  from guest_threads g
  where g.status = 'published'${category ? " and g.category = ?" : ""}
  order by ${orderBy}
  limit ?`;
  const statement = db.prepare(select);
  const rows = category
    ? await statement.bind(category, safeLimit).all<SeoThread & { ipPrefix: string }>()
    : await statement.bind(safeLimit).all<SeoThread & { ipPrefix: string }>();

  return (rows.results || []).map((thread) => ({
    id: thread.id,
    title: thread.title,
    body: thread.body,
    category: thread.category,
    linkUrl: thread.linkUrl,
    guestId: displayGuestNickname(thread.guestId, thread.id),
    ipPrefix: normalizeStoredIpPrefix(thread.ipPrefix) || "비공개",
    score: Number(thread.score || 0),
    downvotes: Number(thread.downvotes || 0),
    commentCount: Number(thread.commentCount || 0),
    tags: [communityByCategory(thread.category)?.name || "바차타"],
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt
  }));
};
