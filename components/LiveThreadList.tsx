"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/format";
import { ThreadActionBar } from "./ThreadActionBar";

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

const apiOrigin = () => {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev")) return "";
  return "https://bachata-co-kr.bachata-korea.workers.dev";
};

const threadsApiUrl = () => `${apiOrigin()}/api/threads/`;
const threadPath = (id: string) => `/guest/?id=${encodeURIComponent(id)}`;

export function LiveThreadList() {
  const [threads, setThreads] = useState<LiveThread[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(threadsApiUrl(), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { threads?: LiveThread[] };
        if (!cancelled && Array.isArray(data.threads)) setThreads(data.threads);
      } catch {
        if (!cancelled) setThreads([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!threads.length) return null;

  return (
    <section className="live-thread-stack" aria-label="비회원 새 글">
      {threads.map((thread) => (
        <article key={thread.id} className="thread-card live-thread-card" id={`guest-${thread.id}`}>
          <div className="thread-body">
            <div className="thread-meta">
              <span>r/{labels[thread.category] || "자유"}</span>
              <span>{thread.guestId}</span>
              <span>IP {thread.ipPrefix}</span>
              <span>{formatRelativeDate(thread.createdAt)}</span>
              <span className="flair">비회원</span>
            </div>
            <h2><Link href={threadPath(thread.id)}>{thread.title}</Link></h2>
            <p>{thread.body}</p>
            <div className="tag-row">
              {(thread.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
            <ThreadActionBar
              score={thread.score}
              downvotes={thread.downvotes}
              commentHref={`${threadPath(thread.id)}#comments-title`}
              sharePath={threadPath(thread.id)}
              shareTitle={thread.title}
              shareText={thread.body.slice(0, 100)}
              sourceLinks={thread.linkUrl ? [{ label: "원문 링크", url: thread.linkUrl }] : []}
              showAward={false}
            />
            {thread.commentCount ? (
              <Link className="comment-count-link" href={`${threadPath(thread.id)}#comments-title`}>
                댓글 {thread.commentCount}개 보기
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
