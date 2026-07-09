import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GuestThreadDetail } from "@/components/GuestThreadDetail";
import { absoluteUrl } from "@/lib/format";
import { articleShareMetadata, buildShareDescription, DEFAULT_SHARE_IMAGE } from "@/lib/share-meta";
import { extractThreadMedia } from "@/lib/thread-media";

type PageProps = {
  params: Promise<{ id: string }>;
};

type D1Rows<T> = {
  results?: T[];
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T = unknown>() => Promise<D1Rows<T>>;
  first: <T = unknown>() => Promise<T | null>;
};

type D1DatabaseBinding = {
  prepare: (query: string) => D1PreparedStatement;
};

type GuestThreadMetaRow = {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
};

type CommentMetaRow = {
  body: string;
};

const normalizeId = (value: string) => (/^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : "");

const getDb = async (): Promise<D1DatabaseBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).COMMENTS_DB as D1DatabaseBinding | undefined) || null;
  } catch {
    return null;
  }
};

const getThreadForMetadata = async (id: string) => {
  const safeId = normalizeId(id);
  if (!safeId) return null;
  const db = await getDb();
  if (!db) return null;

  try {
    const thread = await db.prepare(
      `select id, title, body, link_url as linkUrl
      from guest_threads
      where status = 'published' and id = ?
      limit 1`
    ).bind(safeId).first<GuestThreadMetaRow>();

    if (!thread) return null;

    const comment = await db.prepare(
      `select body
      from comments
      where thread_id = ? and status = 'published'
      order by score desc, created_at asc
      limit 1`
    ).bind(safeId).first<CommentMetaRow>();

    return { thread, comment };
  } catch {
    return null;
  }
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getThreadForMetadata(id);
  const url = absoluteUrl(`/g/${id}`);
  const fallbackTitle = "바차타 코리아 쓰레드";
  const fallbackDescription = "바차타 질문, 후기, 영상, 행사 이야기를 댓글로 이어갑니다.";

  if (!data) {
    return articleShareMetadata({
      title: fallbackTitle,
      description: fallbackDescription,
      url,
      imageUrl: DEFAULT_SHARE_IMAGE,
      imageAlt: fallbackTitle
    });
  }

  const description = buildShareDescription({
    body: data.thread.body,
    bestComment: data.comment?.body || null
  }) || fallbackDescription;
  const parsed = extractThreadMedia(data.thread.body, data.thread.linkUrl);
  const previewImage = parsed.media.find((item) => item.type === "image")?.url || DEFAULT_SHARE_IMAGE;

  return articleShareMetadata({
    title: data.thread.title,
    description,
    url,
    imageUrl: previewImage,
    imageAlt: data.thread.title
  });
}

export default async function GuestThreadSharePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<main className="app-shell narrow"><section className="page-head"><h1>글을 불러오는 중입니다</h1></section></main>}>
      <GuestThreadDetail threadId={id} />
    </Suspense>
  );
}
