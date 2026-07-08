import { comments, communities, dancers, draftSignals, events, threads } from "./seed";
import { supabase } from "./supabase";
import type { Comment, Community, DancerCard, DraftSignal, EventCard, SortMode, Thread } from "./types";

const byHot = (a: Thread, b: Thread) => {
  if (a.pinned && !b.pinned) return -1;
  if (!a.pinned && b.pinned) return 1;
  return b.score + b.commentCount * 2 - (a.score + a.commentCount * 2);
};

const byNew = (a: Thread, b: Thread) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
const byTop = (a: Thread, b: Thread) => b.score - a.score;
const byRising = (a: Thread, b: Thread) => b.commentCount + b.upvotes * 0.35 - (a.commentCount + a.upvotes * 0.35);

const sortThreads = (items: Thread[], mode: SortMode = "hot") => {
  const sorted = [...items];
  if (mode === "new") return sorted.sort(byNew);
  if (mode === "top") return sorted.sort(byTop);
  if (mode === "rising") return sorted.sort(byRising);
  return sorted.sort(byHot);
};

const mapSupabaseThread = (row: Record<string, unknown>): Thread => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  excerpt: String(row.excerpt || ""),
  body: String(row.body || ""),
  communitySlug: String(row.community_slug || "hot"),
  communityName: String(row.community_name || "바차타"),
  flair: String(row.flair || "토론"),
  author: String(row.author_name || "Bachata Korea"),
  createdAt: String(row.created_at || new Date().toISOString()),
  score: Number(row.score || 0),
  upvotes: Number(row.upvotes || 0),
  downvotes: Number(row.downvotes || 0),
  commentCount: Number(row.comment_count || 0),
  videoId: row.video_id ? String(row.video_id) : undefined,
  imageUrl: row.image_url ? String(row.image_url) : undefined,
  sourceLinks: Array.isArray(row.source_links) ? row.source_links as Thread["sourceLinks"] : [],
  tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
  pinned: Boolean(row.pinned)
});

export const getCommunities = async (): Promise<Community[]> => communities;

export const getThreads = async (mode: SortMode = "hot", communitySlug?: string): Promise<Thread[]> => {
  if (supabase) {
    const query = supabase
      .from("thread_feed")
      .select("*")
      .eq("status", "published")
      .limit(80);

    const { data, error } = communitySlug ? await query.eq("community_slug", communitySlug) : await query;
    if (!error && data?.length) return sortThreads(data.map(mapSupabaseThread), mode);
  }

  const filtered = communitySlug ? threads.filter((thread) => thread.communitySlug === communitySlug) : threads;
  return sortThreads(filtered, mode);
};

export const getThread = async (id: string, slug: string): Promise<Thread | null> => {
  const all = await getThreads("hot");
  return all.find((thread) => thread.id === id && thread.slug === slug) || null;
};

export const getThreadComments = async (threadId: string): Promise<Comment[]> => {
  if (supabase) {
    const { data, error } = await supabase
      .from("comments")
      .select("id, thread_id, author_name, body, score, created_at")
      .eq("thread_id", threadId)
      .eq("status", "published")
      .order("score", { ascending: false });

    if (!error && data?.length) {
      return data.map((row) => ({
        id: String(row.id),
        threadId: String(row.thread_id),
        author: String(row.author_name || "member"),
        body: String(row.body || ""),
        score: Number(row.score || 0),
        createdAt: String(row.created_at || new Date().toISOString())
      }));
    }
  }

  return comments.filter((comment) => comment.threadId === threadId);
};

export const getEvents = async (): Promise<EventCard[]> => events;
export const getDancers = async (): Promise<DancerCard[]> => dancers;
export const getDraftSignals = async (): Promise<DraftSignal[]> => draftSignals;

export const getRelatedThreads = async (thread: Thread): Promise<Thread[]> => {
  const all = await getThreads("hot");
  return all
    .filter((item) => item.id !== thread.id)
    .filter((item) => item.communitySlug === thread.communitySlug || item.tags.some((tag) => thread.tags.includes(tag)))
    .slice(0, 4);
};
