"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { communityApiUrl, communityThreadPath, communityThreadShareUrl } from "@/lib/community-api";
import { formatRelativeDate } from "@/lib/format";
import { extractThreadMedia } from "@/lib/thread-media";
import { ThreadActionBar } from "./ThreadActionBar";
import { ThreadMediaAttachments } from "./ThreadMediaAttachments";

type LiveThread = {
  id: string;
  title: string;
  body: string;
  category: string;
  linkUrl?: string | null;
  guestId: string;
  ipPrefix: string;
  score: number;
  downvotes: number;
  commentCount: number;
  tags: string[];
  createdAt: string;
};

type LiveThreadListProps = {
  category?: string;
  sort?: "hot" | "new" | "top";
  query?: string;
  emptyCopy?: string;
};

const labels: Record<string, string> = {
  questions: "질문",
  video: "영상",
  events: "행사",
  dancers: "댄서",
  guide: "가이드",
  free: "자유",
  academyReview: "아카데미 리뷰",
  dancerReview: "댄서 리뷰",
  socialReview: "소셜 후기",
  gear: "장비",
  poll: "설문조사",
  ama: "무물보"
};

const threadsApiUrl = (category?: string, sort?: string, searchQuery?: string) => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  if (searchQuery) params.set("q", searchQuery);
  const query = params.toString();
  return communityApiUrl(`/api/threads/${query ? `?${query}` : ""}`);
};
export function LiveThreadList({ category, sort = "hot", query = "", emptyCopy = "" }: LiveThreadListProps) {
  const [threads, setThreads] = useState<LiveThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(threadsApiUrl(category, sort, query), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { threads?: LiveThread[] };
        if (!cancelled && Array.isArray(data.threads)) setThreads(data.threads);
      } catch {
        if (!cancelled) setThreads([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, sort, query]);

  if (loading) return <div className="feed-loading" aria-live="polite">토픽을 불러오는 중입니다.</div>;

  if (!threads.length) {
    return emptyCopy ? <div className="empty-state">{emptyCopy}</div> : null;
  }

  return (
    <section className="live-thread-stack" aria-label="비회원 새 글">
      {threads.map((thread) => (
        <LiveThreadCard key={thread.id} thread={thread} />
      ))}
    </section>
  );
}

function LiveThreadCard({ thread }: { thread: LiveThread }) {
  const parsed = extractThreadMedia(thread.body, thread.linkUrl);
  const bodyText = parsed.text || thread.body;
  const detailPath = communityThreadPath(thread.id);

  return (
    <article className="thread-card live-thread-card" id={`guest-${thread.id}`}>
          <div className="thread-body">
            <div className="thread-meta">
              <span>주제 · {labels[thread.category] || "자유"}</span>
              <span>{thread.guestId}</span>
              <span>IP {thread.ipPrefix}</span>
              <span>{formatRelativeDate(thread.createdAt)}</span>
              <span className="flair">비회원</span>
            </div>
            <h2><Link href={detailPath}>{thread.title}</Link></h2>
            <p>{bodyText}</p>
            <ThreadMediaAttachments media={parsed.media} compact />
            <div className="tag-row">
              {(thread.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
            <ThreadActionBar
              score={thread.score}
              downvotes={thread.downvotes}
              voteTargetId={thread.id}
              voteTargetType="guestThread"
              commentHref={`${detailPath}#comments-title`}
              sharePath={communityThreadShareUrl(thread.id)}
              shareTitle={thread.title}
              shareText={bodyText.slice(0, 100)}
              sourceLinks={thread.linkUrl ? [{ label: "원문 링크", url: thread.linkUrl }] : []}
              showAward={false}
            />
            {thread.commentCount ? (
              <Link className="comment-count-link" href={`${detailPath}#comments-title`}>
                댓글 {thread.commentCount}개 보기
              </Link>
            ) : null}
          </div>
        </article>
  );
}
