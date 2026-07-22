import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GuestThreadDetail } from "@/components/GuestThreadDetail";
import { communityThreadShareUrl } from "@/lib/community-api";
import {
  articleShareMetadata,
  buildShareDescription,
  buildShareTitle,
  DEFAULT_SHARE_IMAGE
} from "@/lib/share-meta";
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

type StreamVideoDetails = {
  thumbnail?: string;
};

type StreamBinding = {
  video: (id: string) => {
    details: () => Promise<StreamVideoDetails>;
  };
};

type GuestThreadMetaRow = {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  guestId: string;
  createdAt: string;
};

type CommentMetaRow = {
  body: string;
};

type StreamVideoMetaRow = {
  thumbnailUrl: string | null;
};

const normalizeId = (value: string) => (/^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : "");

const getBindings = async (): Promise<{ db: D1DatabaseBinding | null; stream: StreamBinding | null }> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as Record<string, unknown>;
    return {
      db: (bindings.COMMENTS_DB as D1DatabaseBinding | undefined) || null,
      stream: (bindings.STREAM as StreamBinding | undefined) || null
    };
  } catch {
    return { db: null, stream: null };
  }
};

const getThreadForMetadata = async (id: string) => {
  const safeId = normalizeId(id);
  if (!safeId) return null;
  const { db } = await getBindings();
  if (!db) return null;

  try {
    const candidates = await db.prepare(
      `select id, title, body, link_url as linkUrl, guest_id as guestId, created_at as createdAt
      from guest_threads
      where status = 'published'
        and (id = ? or (length(?) >= 8 and id like ?))
      order by case when id = ? then 0 else 1 end
      limit 2`
    ).bind(safeId, safeId, `${safeId}%`, safeId).all<GuestThreadMetaRow>();

    const rows = candidates.results || [];
    const thread = rows.find((row) => row.id === safeId) || (rows.length === 1 ? rows[0] : null);

    if (!thread) return null;

    const comment = await db.prepare(
      `select body
      from comments
      where thread_id = ? and status = 'published'
      order by score desc, created_at asc
      limit 1`
    ).bind(thread.id).first<CommentMetaRow>();

    return { thread, comment };
  } catch {
    return null;
  }
};

const formatStreamThumbnail = (value: string) => {
  try {
    const url = new URL(value);
    url.searchParams.set("width", "1200");
    url.searchParams.set("height", "630");
    url.searchParams.set("fit", "crop");
    return url.toString();
  } catch {
    return value;
  }
};

const getStreamThumbnail = async (streamId: string) => {
  const { db, stream } = await getBindings();

  if (db) {
    try {
      const row = await db.prepare(
        "select thumbnail_url as thumbnailUrl from stream_videos where id = ? and status != 'deleted' limit 1"
      ).bind(streamId).first<StreamVideoMetaRow>();
      if (row?.thumbnailUrl) return formatStreamThumbnail(row.thumbnailUrl);
    } catch {
      // Fall through to Stream so a fresh upload can still get a share image.
    }
  }

  if (stream) {
    try {
      const details = await stream.video(streamId).details();
      if (details.thumbnail) return formatStreamThumbnail(details.thumbnail);
    } catch {
      return null;
    }
  }

  return null;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getThreadForMetadata(id);
  const url = communityThreadShareUrl(data?.thread.id || id);
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

  const parsed = extractThreadMedia(data.thread.body, data.thread.linkUrl);
  const streamItem = parsed.media.find((item) => item.type === "stream" && item.streamId);
  const streamThumbnail = streamItem?.streamId ? await getStreamThumbnail(streamItem.streamId) : null;
  const previewImage = streamThumbnail
    || parsed.media.find((item) => item.type === "image")?.url
    || DEFAULT_SHARE_IMAGE;
  const hasVideo = parsed.media.some((item) => item.type === "stream" || item.type === "video");
  const description = buildShareDescription({
    body: parsed.text || data.thread.body,
    bestComment: data.comment?.body || null,
    hasVideo
  }) || fallbackDescription;
  const title = buildShareTitle(data.thread.title);

  return articleShareMetadata({
    title,
    description,
    url,
    imageUrl: previewImage,
    imageAlt: `${title} 미리보기`
  });
}

export default async function GuestThreadSharePage({ params }: PageProps) {
  const { id } = await params;
  const data = await getThreadForMetadata(id);
  const shareUrl = communityThreadShareUrl(data?.thread.id || id);
  const jsonLd = data ? {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": shareUrl,
    headline: data.thread.title,
    text: data.thread.body,
    datePublished: data.thread.createdAt,
    author: { "@type": "Person", name: data.thread.guestId },
    url: shareUrl,
    inLanguage: "ko-KR"
  } : null;

  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
      <Suspense fallback={<main className="app-shell narrow"><section className="page-head"><h1>글을 불러오는 중입니다</h1></section></main>}>
        <GuestThreadDetail threadId={data?.thread.id || id} />
      </Suspense>
    </>
  );
}
