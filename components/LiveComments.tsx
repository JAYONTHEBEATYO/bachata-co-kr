"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowBigDown, ArrowBigUp, MessageCircle, Send, Search, Trash2 } from "lucide-react";
import { communityApiUrl } from "@/lib/community-api";
import { formatRelativeDate } from "@/lib/format";
import { getGuestSession, saveGuestSession } from "@/lib/guest-session";
import { formatPublicIpLabel } from "@/lib/ip-display";
import type { Comment } from "@/lib/types";
import { ReportButton } from "./ReportButton";

type LiveCommentsProps = {
  threadId: string;
  initialComments: Comment[];
};

type ApiComment = Comment & {
  parentId?: string | null;
};

type CommentSort = "best" | "new" | "old";
type CommentVote = "up" | "down";

const commentsApiUrl = () => communityApiUrl("/api/comments/");

const dateValue = (value: string) => new Date(value).getTime() || 0;

const sortComments = (comments: ApiComment[], sort: CommentSort) =>
  comments.slice().sort((a, b) => {
    if (sort === "new") return dateValue(b.createdAt) - dateValue(a.createdAt);
    if (sort === "old") return dateValue(a.createdAt) - dateValue(b.createdAt);
    return b.score - a.score || dateValue(b.createdAt) - dateValue(a.createdAt);
  });

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
  const [authorPassword, setAuthorPassword] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [replyTo, setReplyTo] = useState<ApiComment | null>(null);
  const [sort, setSort] = useState<CommentSort>("best");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [votePending, setVotePending] = useState("");
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});

  const visibleComments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
      ? comments.filter((comment) => `${comment.author} ${comment.body}`.toLowerCase().includes(keyword))
      : comments;
    return sortComments(filtered, sort);
  }, [comments, search, sort]);

  const commentTree = useMemo(() => buildTree(visibleComments), [visibleComments]);

  useEffect(() => {
    const session = getGuestSession();
    setAuthorName(session.nickname);
    setAuthorPassword("");
  }, []);

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
    if (!/^\d{4}$/.test(authorPassword.trim())) {
      setError("임시비밀번호 4자리를 숫자로 입력해주세요.");
      return;
    }

    setPending(true);
    try {
      saveGuestSession({ nickname: authorName });
      const response = await fetch(commentsApiUrl(), {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          threadId,
          parentId: replyTo?.id || null,
          authorName,
          authorPassword,
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
      setAuthorPassword("");
      setWebsite("");
      setReplyTo(null);
      setExpanded(false);
      setStatus("댓글이 등록됐습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "댓글을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const voteComment = async (commentId: string, direction: CommentVote) => {
    setError("");
    setStatus("");
    setVotePending(commentId);

    try {
      const response = await fetch(commentsApiUrl(), {
        method: "PATCH",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ commentId, direction })
      });
      const data = await response.json() as { commentId?: string; score?: number; userVote?: number; error?: string };
      if (!response.ok || !data.commentId) throw new Error(data.error || "추천을 반영하지 못했습니다.");

      setComments((current) => current.map((comment) =>
        comment.id === data.commentId ? { ...comment, score: Number(data.score || 0) } : comment
      ));
      setUserVotes((current) => ({ ...current, [data.commentId as string]: Number(data.userVote || 0) }));
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "추천을 반영하지 못했습니다.");
    } finally {
      setVotePending("");
    }
  };

  const openReply = (target: Comment) => {
    setReplyTo(target as ApiComment);
    setExpanded(true);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>(".comment-form textarea")?.focus();
    });
  };

  const deleteComment = async (commentId: string) => {
    const password = window.prompt("이 댓글에 사용한 임시비밀번호 4자리를 입력해주세요.") || "";
    if (!/^\d{4}$/.test(password)) {
      setError("임시비밀번호 4자리를 숫자로 입력해주세요.");
      return;
    }
    setError("");
    try {
      const response = await fetch(commentsApiUrl(), {
        method: "DELETE",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ commentId, password })
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "댓글을 삭제하지 못했습니다.");
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setStatus("댓글을 삭제했습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "댓글을 삭제하지 못했습니다.");
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

      <form className={`comment-form ${expanded || body ? "is-expanded" : "is-compact"}`} onSubmit={submit}>
        {replyTo ? (
          <div className="reply-target">
            <span>{replyTo.author}님에게 답글 쓰는 중</span>
            <button type="button" onClick={() => setReplyTo(null)}>취소</button>
          </div>
        ) : null}

        {expanded || body ? (
          <div className="comment-identity-row">
            <input
              type="text"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder="닉네임"
              maxLength={32}
              autoComplete="nickname"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              value={authorPassword}
              onChange={(event) => setAuthorPassword(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="임시비밀번호 4자리"
              maxLength={4}
              autoComplete="new-password"
              required
            />
          </div>
        ) : null}

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
          onFocus={() => setExpanded(true)}
          onChange={(event) => setBody(event.target.value)}
          placeholder={expanded ? "질문, 후기, 추가 정보 뭐든 편하게 남겨보세요." : "대화에 참여해보세요"}
          maxLength={1000}
          rows={expanded || body ? 5 : 1}
          required
        />

        {expanded || body ? (
          <div className="comment-form-foot">
            <span>{body.trim().length}/1000</span>
            <div className="comment-form-buttons">
              <button type="submit" className="comment-submit" disabled={pending}>
                <Send size={17} />
                {pending ? "등록 중" : "댓글 등록"}
              </button>
              <button type="button" className="comment-cancel" onClick={() => {
                setBody("");
                setReplyTo(null);
                setExpanded(false);
              }}>
                취소
              </button>
            </div>
          </div>
        ) : null}
      </form>
      {status ? <p className="comment-status">{status}</p> : null}
      {error ? <p className="comment-error">{error}</p> : null}

      <div className="comment-tools" aria-label="댓글 정렬과 검색">
        <label>
          정렬 기준
          <select value={sort} onChange={(event) => setSort(event.target.value as CommentSort)}>
            <option value="best">추천순</option>
            <option value="new">최신순</option>
            <option value="old">오래된순</option>
          </select>
        </label>
        <label className="comment-search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="댓글 검색" />
        </label>
      </div>

      <div className="comment-list">
        {commentTree.length ? commentTree.map((comment) => (
          <CommentNode
            key={comment.id}
            comment={comment}
            onReply={openReply}
            onVote={voteComment}
            userVotes={userVotes}
            votePending={votePending}
            onDelete={deleteComment}
          />
        )) : (
          <p className="empty-copy">아직 댓글이 없습니다. 첫 댓글을 남겨주세요.</p>
        )}
      </div>
    </section>
  );
}

function CommentNode({
  comment,
  onReply,
  onVote,
  userVotes,
  votePending,
  onDelete
}: {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onVote: (commentId: string, direction: CommentVote) => void;
  userVotes: Record<string, number>;
  votePending: string;
  onDelete: (commentId: string) => void;
}) {
  const userVote = userVotes[comment.id] || 0;
  const isPending = votePending === comment.id;

  return (
    <article className="comment">
      <div className="comment-content">
        <div className="comment-meta">
          <strong>{comment.author}</strong>
          {comment.ipPrefix ? <span>{formatPublicIpLabel(comment.ipPrefix)}</span> : null}
          <span>{formatRelativeDate(comment.createdAt)}</span>
        </div>
        <p>{comment.body}</p>
        <div className="comment-actions">
          <span className="comment-vote-pill" aria-label="댓글 추천">
            <button
              type="button"
              aria-label="추천"
              aria-pressed={userVote === 1}
              disabled={isPending}
              onClick={() => onVote(comment.id, "up")}
            >
              <ArrowBigUp size={16} />
            </button>
            <strong>{comment.score}</strong>
            <button
              type="button"
              aria-label="비추천"
              aria-pressed={userVote === -1}
              disabled={isPending}
              onClick={() => onVote(comment.id, "down")}
            >
              <ArrowBigDown size={16} />
            </button>
          </span>
          <button type="button" onClick={() => onReply(comment)}><MessageCircle size={15} /> 답글 달기</button>
          <ReportButton targetType="comment" targetId={comment.id} />
          <button type="button" onClick={() => onDelete(comment.id)}><Trash2 size={15} /> 삭제</button>
        </div>
        {comment.replies?.length ? (
          <div className="comment-replies">
            {comment.replies.map((reply) => (
              <CommentNode
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onVote={onVote}
                userVotes={userVotes}
                votePending={votePending}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
