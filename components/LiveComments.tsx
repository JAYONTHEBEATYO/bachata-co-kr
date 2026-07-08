"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowBigUp, MessageCircle, Send } from "lucide-react";
import { formatRelativeDate } from "@/lib/format";
import type { Comment } from "@/lib/types";

type LiveCommentsProps = {
  threadId: string;
  initialComments: Comment[];
};

type ApiComment = Comment & {
  parentId?: string | null;
};

const commentsApiOrigin = () => {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev")) return "";
  return "https://bachata-co-kr.bachata-korea.workers.dev";
};

const commentsApiUrl = () => `${commentsApiOrigin()}/api/comments/`;

const buildTree = (comments: ApiComment[]): Comment[] => {
  const byId = new Map<string, Comment>();
  const roots: Comment[] = [];

  comments.forEach((comment) => {
    byId.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach((comment) => {
    const node = byId.get(comment.id);
    if (!node) return;
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)?.replies?.push(node);
      return;
    }
    roots.push(node);
  });

  return roots;
};

export function LiveComments({ threadId, initialComments }: LiveCommentsProps) {
  const [comments, setComments] = useState<ApiComment[]>(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [replyTo, setReplyTo] = useState<ApiComment | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const commentTree = useMemo(() => buildTree(comments), [comments]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${commentsApiUrl()}?threadId=${encodeURIComponent(threadId)}`, {
          cache: "no-store"
        });
        if (!response.ok) return;
        const data = await response.json() as { comments?: ApiComment[] };
        if (!cancelled && Array.isArray(data.comments)) {
          setComments(data.comments);
        }
      } catch {
        if (!cancelled) setStatus("댓글 서버에 연결하는 중입니다. 잠시 후 다시 시도해주세요.");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");

    const text = body.trim();
    if (text.length < 2) {
      setError("댓글을 두 글자 이상 적어주세요.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(commentsApiUrl(), {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          threadId,
          parentId: replyTo?.id || null,
          authorName,
          body: text,
          website
        })
      });
      const data = await response.json() as { comment?: ApiComment; error?: string };
      if (!response.ok || !data.comment) {
        throw new Error(data.error || "댓글을 저장하지 못했습니다.");
      }

      setComments((current) => [...current, data.comment as ApiComment]);
      setBody("");
      setWebsite("");
      setReplyTo(null);
      setStatus("댓글이 등록됐습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "댓글을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="comments" aria-labelledby="comments-title">
      <div className="comments-head">
        <div>
          <h2 id="comments-title">댓글</h2>
          <p>로그인 없이 바로 남길 수 있습니다.</p>
        </div>
        <span>{comments.length}개</span>
      </div>

      <form className="comment-form" onSubmit={submit}>
        {replyTo ? (
          <div className="reply-target">
            <span>{replyTo.author}님에게 답글 쓰는 중</span>
            <button type="button" onClick={() => setReplyTo(null)}>취소</button>
          </div>
        ) : null}
        <input
          type="text"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="닉네임 (선택)"
          maxLength={32}
          autoComplete="nickname"
        />
        <label className="comment-hp">
          웹사이트
          <input
            type="text"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="질문, 후기, 추가 정보 뭐든 편하게 남겨보세요."
          maxLength={1000}
          rows={5}
          required
        />
        <div className="comment-form-foot">
          <span>{body.trim().length}/1000</span>
          <button type="submit" disabled={pending}>
            <Send size={16} />
            {pending ? "등록 중" : "댓글 남기기"}
          </button>
        </div>
        {status ? <p className="comment-status">{status}</p> : null}
        {error ? <p className="comment-error">{error}</p> : null}
      </form>

      <div className="comment-list">
        {commentTree.length ? commentTree.map((comment) => (
          <CommentNode key={comment.id} comment={comment} onReply={(target) => setReplyTo(target as ApiComment)} />
        )) : (
          <p className="empty-copy">아직 댓글이 없습니다. 첫 댓글을 남겨주세요.</p>
        )}
      </div>
    </section>
  );
}

function CommentNode({ comment, onReply }: { comment: Comment; onReply: (comment: Comment) => void }) {
  return (
    <article className="comment">
      <div className="comment-score"><ArrowBigUp size={16} /> {comment.score}</div>
      <div>
        <div className="comment-meta">
          <strong>{comment.author}</strong>
          <span>{formatRelativeDate(comment.createdAt)}</span>
        </div>
        <p>{comment.body}</p>
        <button type="button" onClick={() => onReply(comment)}><MessageCircle size={15} /> 답글</button>
        {comment.replies?.length ? (
          <div className="comment-replies">
            {comment.replies.map((reply) => <CommentNode key={reply.id} comment={reply} onReply={onReply} />)}
          </div>
        ) : null}
      </div>
    </article>
  );
}
