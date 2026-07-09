"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { formatRelativeDate } from "@/lib/format";
import { VoteRail } from "./VoteRail";

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
  createdAt: string;
};

const labels: Record<string, string> = {
  questions: "질문",
  video: "영상",
  events: "행사",
  dancers: "댄서",
  guide: "가이드"
};

const apiOrigin = () => {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev")) return "";
  return "https://bachata-co-kr.bachata-korea.workers.dev";
};

const threadsApiUrl = () => `${apiOrigin()}/api/threads/`;

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
        <article key={thread.id} className="thread-card live-thread-card">
          <div className="thread-body">
            <div className="thread-meta">
              <span>r/{labels[thread.category] || "자유"}</span>
              <span>{thread.guestId}</span>
              <span>IP {thread.ipPrefix}</span>
              <span>{formatRelativeDate(thread.createdAt)}</span>
              <span className="flair">비회원</span>
            </div>
            <h2>{thread.title}</h2>
            <p>{thread.body}</p>
            <div className="thread-actions">
              <VoteRail score={thread.score} downvotes={thread.downvotes} />
              {thread.linkUrl ? (
                <a href={thread.linkUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> 링크</a>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
