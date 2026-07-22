"use client";

import { FormEvent, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Pencil, Save, Trash2, X } from "lucide-react";
import { communityApiUrl, communityThreadShareUrl } from "@/lib/community-api";
import { communities, communityByCategory } from "@/lib/communities";
import { formatRelativeDate } from "@/lib/format";
import { buildShareDescription, buildShareTitle } from "@/lib/share-meta";
import { extractThreadMedia } from "@/lib/thread-media";
import { AppNavigation } from "./AppNavigation";
import { CommunityIcon } from "./CommunityIcon";
import { LiveComments } from "./LiveComments";
import { Sidebar } from "./Sidebar";
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

const threadsApiUrl = () => communityApiUrl("/api/threads/");
export function GuestThreadDetail({ threadId }: { threadId?: string }) {
  const searchParams = useSearchParams();
  const id = threadId || searchParams.get("id") || "";
  const [thread, setThread] = useState<GuestThread | null>(null);
  const [status, setStatus] = useState(id ? "글을 불러오는 중입니다." : "열 글이 없습니다.");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState("free");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPending, setEditPending] = useState(false);

  const openEditor = () => {
    if (!thread) return;
    const parsedThread = extractThreadMedia(thread.body, thread.linkUrl);
    setEditTitle(thread.title);
    setEditBody(parsedThread.text || thread.body);
    setEditCategory(thread.category);
    setEditLinkUrl(thread.linkUrl || "");
    setEditPassword("");
    setStatus("");
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
    setEditPassword("");
    setStatus("");
  };

  const updateThread = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!thread) return;
    if (editTitle.trim().length < 4) {
      setStatus("제목을 네 글자 이상 적어주세요.");
      return;
    }
    if (editBody.trim().length < 2) {
      setStatus("본문을 두 글자 이상 적어주세요.");
      return;
    }
    if (!/^\d{4}$/.test(editPassword)) {
      setStatus("글을 쓸 때 정한 임시비밀번호 4자리를 입력해주세요.");
      return;
    }

    const parsedThread = extractThreadMedia(thread.body, thread.linkUrl);
    const attachmentLines = parsedThread.media.map((item) => item.type === "stream" && item.streamId
      ? `Cloudflare Stream: cfstream:${item.streamId}`
      : `${item.type === "video" ? "동영상" : "이미지"}: ${item.url}`
    );
    const nextBody = [
      editBody.trim(),
      attachmentLines.length ? `[첨부]\n${attachmentLines.join("\n")}` : ""
    ].filter(Boolean).join("\n\n");

    setEditPending(true);
    setStatus("");
    try {
      const response = await fetch(threadsApiUrl(), {
        method: "PATCH",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          id: thread.id,
          password: editPassword,
          title: editTitle,
          body: nextBody,
          category: editCategory,
          linkUrl: editLinkUrl
        })
      });
      const data = await response.json() as { thread?: GuestThread; error?: string };
      if (!response.ok || !data.thread) throw new Error(data.error || "글을 수정하지 못했습니다.");
      setThread(data.thread);
      setEditing(false);
      setEditPassword("");
      setStatus("글을 수정했습니다.");
    } catch (updateError) {
      setStatus(updateError instanceof Error ? updateError.message : "글을 수정하지 못했습니다.");
    } finally {
      setEditPending(false);
    }
  };

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

  const shell = (content: ReactNode) => (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        {content}
        <Sidebar communities={communities} />
      </div>
    </main>
  );

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
    return shell(
        <section className="page-head detail-message">
          <h1>글을 찾을 수 없습니다</h1>
          <p>삭제됐거나 잘못된 주소입니다.</p>
          <Link className="primary-link" href="/">피드로 돌아가기</Link>
        </section>
    );
  }

  if (!thread) {
    return shell(
        <section className="page-head detail-message">
          <h1>{status}</h1>
          <p>잠시 후 다시 시도해주세요.</p>
          <Link className="primary-link" href="/">피드로 돌아가기</Link>
        </section>
    );
  }

  const parsed = extractThreadMedia(thread.body, thread.linkUrl);
  const bodyText = parsed.text || thread.body;
  const community = communityByCategory(thread.category);
  const accent = community?.color || "#ff4f3f";
  const hasVideo = parsed.media.some((item) => item.type === "stream" || item.type === "video");

  return shell(
      <article className="detail-article" style={{ "--thread-accent": accent } as CSSProperties}>
        <section className="detail-body">
          <header className="thread-card-header detail-thread-header">
            <CommunityIcon category={thread.category} color={accent} size={19} />
            <div className="thread-card-identity">
              <strong>{labels[thread.category] || "자유"}</strong>
              <span>{thread.guestId} · IP {thread.ipPrefix} · {formatRelativeDate(thread.createdAt)}</span>
            </div>
            <span className="flair">익명</span>
          </header>
          {editing ? (
            <form className="thread-edit-form" onSubmit={updateThread}>
              <label>
                제목
                <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={120} required />
              </label>
              <div className="thread-edit-grid">
                <label>
                  주제
                  <select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>
                    {Object.entries(labels).filter(([value]) => !["dancers", "guide", "gear"].includes(value)).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  링크
                  <input type="url" value={editLinkUrl} onChange={(event) => setEditLinkUrl(event.target.value)} placeholder="https://..." />
                </label>
              </div>
              <label>
                본문
                <textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={10} maxLength={4000} required />
              </label>
              <label>
                임시비밀번호
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="글을 쓸 때 정한 숫자 4자리"
                  maxLength={4}
                  autoComplete="off"
                  required
                />
              </label>
              <div className="thread-edit-actions">
                <button type="button" onClick={closeEditor} disabled={editPending}><X size={16} /> 취소</button>
                <button type="submit" disabled={editPending}><Save size={16} /> {editPending ? "저장 중" : "수정 저장"}</button>
              </div>
            </form>
          ) : (
            <>
              <h1>{thread.title}</h1>
              <p>{bodyText}</p>
            </>
          )}
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
            sharePath={communityThreadShareUrl(thread.id)}
            shareTitle={buildShareTitle(thread.title)}
            shareText={buildShareDescription({ body: bodyText, hasVideo })}
            sourceLinks={thread.linkUrl ? [{ label: "원문 링크", url: thread.linkUrl }] : []}
          />
          <div className="thread-manage-actions">
            <button type="button" className="thread-manage-button" onClick={openEditor} disabled={editing}>
              <Pencil size={15} /> 내 글 수정
            </button>
            <button type="button" className="thread-manage-button is-danger" onClick={deleteThread}>
              <Trash2 size={15} /> 내 글 삭제
            </button>
          </div>
          {status ? <p className="comment-error">{status}</p> : null}
          {thread.linkUrl ? (
            <a className="primary-link" href={thread.linkUrl} target="_blank" rel="noreferrer">
              원문 링크 열기 <ExternalLink size={16} />
            </a>
          ) : null}
        </section>
        <LiveComments threadId={thread.id} initialComments={[]} />
      </article>
  );
}
