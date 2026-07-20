"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { communityApiUrl, communityThreadShareUrl } from "@/lib/community-api";
import { formatRelativeDate } from "@/lib/format";
import { extractThreadMedia } from "@/lib/thread-media";
import { LiveComments } from "./LiveComments";
import { ThreadActionBar } from "./ThreadActionBar";
import { ThreadMediaAttachments } from "./ThreadMediaAttachments";

type GuestThread = {
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

const threadsApiUrl = () => communityApiUrl("/api/threads/");
export function GuestThreadDetail({ threadId }: { threadId?: string }) {
  const searchParams = useSearchParams();
  const id = threadId || searchParams.get("id") || "";
  const [thread, setThread] = useState<GuestThread | null>(null);
  const [status, setStatus] = useState(id ? "글을 불러오는 중입니다." : "열 글이 없습니다.");

  const deleteThread = async () => {
    if (!thread) return;
    const password = window.prompt("이 글에 사용한 임시비밀번호 4자리를 입력해주세요.") || "";
    if (!/^\d{4}$/.test(password)) {
      setStatus("임시비밀번호 4자리를 숫자로 입력해주세요.");
      return;
    }
    const response = await fetch(threadsApiUrl(), {
      method: "DELETE",
      headers: { "content-type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ id: thread.id, password })
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setStatus(data.error || "글을 삭제하지 못했습니다.");
      return;
    }
    window.location.assign("/");
  };

  const sharePath = useMemo(() => id ? communityThreadShareUrl(id) : "/guest", [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setStatus("글을 불러오는 중입니다.");
      try {
        const response = await fetch(`${threadsApiUrl()}?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await response.json() as { thread?: GuestThread; error?: string };
        if (!response.ok || !data.thread) throw new Error(data.error || "글을 찾을 수 없습니다.");
        if (!cancelled) {
          setThread(data.thread);
          setStatus("");
        }
      } catch (error) {
        if (!cancelled) {
          setThread(null);
          setStatus(error instanceof Error ? error.message : "글을 불러오지 못했습니다.");
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <main className="app-shell narrow">
        <section className="page-head">
          <span className="eyebrow">비회원 글</span>
          <h1>열 글을 찾지 못했습니다</h1>
          <p>홈 피드에서 보고 싶은 글을 눌러 들어오면 댓글과 공유를 바로 이어갈 수 있습니다.</p>
          <Link className="primary-link" href="/">피드로 돌아가기</Link>
        </section>
      </main>
    );
  }

  if (!thread) {
    return (
      <main className="app-shell narrow">
        <section className="page-head">
          <span className="eyebrow">비회원 글</span>
          <h1>{status}</h1>
          <p>잠시 후 다시 열어보거나 홈 피드에서 글이 남아 있는지 확인해주세요.</p>
          <Link className="primary-link" href="/">피드로 돌아가기</Link>
        </section>
      </main>
    );
  }

  const parsed = extractThreadMedia(thread.body, thread.linkUrl);
  const bodyText = parsed.text || thread.body;

  return (
    <main className="app-shell narrow">
      <article className="detail-article">
        <section className="detail-body">
          <div className="thread-meta">
            <span>주제 · {labels[thread.category] || "자유"}</span>
            <span>{thread.guestId}</span>
            <span>IP {thread.ipPrefix}</span>
            <span>{formatRelativeDate(thread.createdAt)}</span>
            <span className="flair">비회원</span>
          </div>
          <h1>{thread.title}</h1>
          <p>{bodyText}</p>
          <ThreadMediaAttachments media={parsed.media} />
          <div className="tag-row">
            {(thread.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
          <ThreadActionBar
            score={thread.score}
            downvotes={thread.downvotes}
            voteTargetId={thread.id}
            voteTargetType="guestThread"
            commentHref="#comments-title"
            sharePath={sharePath}
            shareTitle={thread.title}
            shareText={bodyText.slice(0, 140)}
            sourceLinks={thread.linkUrl ? [{ label: "원문 링크", url: thread.linkUrl }] : []}
            threadId={thread.id}
          />
          <button type="button" className="thread-manage-button" onClick={deleteThread}>
            <Trash2 size={15} /> 내 글 삭제
          </button>
          {status ? <p className="comment-error">{status}</p> : null}
          {thread.linkUrl ? (
            <a className="primary-link" href={thread.linkUrl} target="_blank" rel="noreferrer">
              원문 링크 열기 <ExternalLink size={16} />
            </a>
          ) : null}
        </section>
        <LiveComments threadId={thread.id} initialComments={[]} />
      </article>
    </main>
  );
}
