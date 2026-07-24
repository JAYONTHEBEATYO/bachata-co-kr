"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { communityApiUrl, communityThreadPath, communityThreadShareUrl } from "@/lib/community-api";
import { communityByCategory } from "@/lib/communities";
import { formatRelativeDate } from "@/lib/format";
import { formatPublicIpLabel } from "@/lib/ip-display";
import { buildShareDescription, buildShareTitle } from "@/lib/share-meta";
import { extractThreadMedia } from "@/lib/thread-media";
import { CommunityIcon } from "./CommunityIcon";
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
  promotion: "홍보",
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

  if (loading) return (
    <div className="feed-loading" aria-live="polite">
      <span /><span /><span />
      <p>피드를 불러오는 중입니다.</p>
    </div>
  );

  if (!threads.length) {
    return emptyCopy ? (
      <div className="empty-state">
        <div className="empty-rhythm" aria-hidden="true">
          <b>1</b><b>2</b><b>3</b><b>4</b><i /><b>5</b><b>6</b><b>7</b><b>8</b>
        </div>
        <span className="empty-kicker">THE FLOOR IS OPEN</span>
        <strong>첫 이야기를 기다리고 있어요.</strong>
        <span>{emptyCopy}</span>
        <Link href="/write"><PenLine size={16} /> 첫 글 쓰기</Link>
      </div>
    ) : null;
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
  const community = communityByCategory(thread.category);
  const accent = community?.color || "#ff4f3f";
  const hasVideo = parsed.media.some((item) => item.type === "stream" || item.type === "video");

  return (
    <article
      className={`thread-card live-thread-card ${parsed.media.length ? "has-media" : ""}`}
      id={`guest-${thread.id}`}
      style={{ "--thread-accent": accent } as CSSProperties}
    >
      <div className="thread-body">
        <header className="thread-card-header">
          <CommunityIcon category={thread.category} color={accent} size={17} />
          <div className="thread-card-identity">
            <strong>{labels[thread.category] || "자유"}</strong>
            <span>{thread.guestId} · {formatPublicIpLabel(thread.ipPrefix)} · {formatRelativeDate(thread.createdAt)}</span>
          </div>
          <span className="flair">익명</span>
        </header>
        <h2><Link href={detailPath}>{thread.title}</Link></h2>
        <p>{bodyText}</p>
        <ThreadMediaAttachments media={parsed.media} compact />
        {thread.tags?.length ? (
          <div className="tag-row">
            {thread.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        ) : null}
        <ThreadActionBar
          score={thread.score}
          downvotes={thread.downvotes}
          voteTargetId={thread.id}
          voteTargetType="guestThread"
          commentHref={`${detailPath}#comments-title`}
          sharePath={communityThreadShareUrl(thread.id)}
          shareTitle={buildShareTitle(thread.title)}
          shareText={buildShareDescription({ body: bodyText, hasVideo })}
          sourceLinks={thread.linkUrl ? [{ label: "원문 링크", url: thread.linkUrl }] : []}
        />
        {thread.commentCount ? (
          <Link className="comment-count-link" href={`${detailPath}#comments-title`}>
            댓글 {thread.commentCount}개 이어보기
          </Link>
        ) : null}
      </div>
    </article>
  );
}
