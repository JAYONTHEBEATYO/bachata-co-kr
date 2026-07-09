"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link2, Send } from "lucide-react";
import { randomKoreanNickname } from "@/lib/nicknames";

type CreatedThread = {
  id: string;
  title: string;
  guestId: string;
  ipPrefix: string;
};

const apiOrigin = () => {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev")) return "";
  return "https://bachata-co-kr.bachata-korea.workers.dev";
};

const threadsApiUrl = () => `${apiOrigin()}/api/threads/`;

export function GuestThreadComposer() {
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorPassword, setAuthorPassword] = useState("");
  const [category, setCategory] = useState("questions");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedThread | null>(null);

  useEffect(() => {
    setAuthorName(randomKoreanNickname());
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setCreated(null);

    if (title.trim().length < 4) {
      setError("제목을 네 글자 이상 적어주세요.");
      return;
    }
    if (!/^\d{4}$/.test(authorPassword.trim())) {
      setError("임시비밀번호 4자리를 숫자로 입력해주세요.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(threadsApiUrl(), {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ title, authorName, authorPassword, category, body, linkUrl, website })
      });
      const data = await response.json() as {
        thread?: CreatedThread;
        error?: string;
      };

      if (!response.ok || !data.thread) {
        throw new Error(data.error || "글을 저장하지 못했습니다.");
      }

      setCreated(data.thread);
      setTitle("");
      setBody("");
      setLinkUrl("");
      setWebsite("");
      setAuthorPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "글을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-note">
        <strong>비회원 글쓰기</strong>
        <p>닉네임과 임시비밀번호 4자리를 직접 정해두세요. 글에는 IP 앞자리만 표시됩니다.</p>
      </div>
      <label>
        제목
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 이번 주 서울 바차타 소셜 어디가 좋나요?" maxLength={120} required />
      </label>
      <div className="composer-grid">
        <label>
          닉네임
          <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="닉네임" maxLength={32} autoComplete="nickname" />
        </label>
        <label>
          임시비밀번호
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            value={authorPassword}
            onChange={(event) => setAuthorPassword(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="숫자 4자리"
            maxLength={4}
            autoComplete="new-password"
            required
          />
        </label>
      </div>
      <label>
        카테고리
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="questions">질문</option>
          <option value="video">영상</option>
          <option value="events">행사</option>
          <option value="dancers">댄서</option>
          <option value="guide">가이드</option>
        </select>
      </label>
      <label>
        본문
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={10} placeholder="무엇을 봤는지, 어디가 궁금한지, 링크가 있다면 함께 남겨주세요." maxLength={4000} required />
      </label>
      <label>
        링크
        <span className="input-with-icon"><Link2 size={17} /><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="YouTube, Instagram, 공식 행사 링크" /></span>
      </label>
      <label className="comment-hp">
        웹사이트
        <input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="submit-button" disabled={pending}><Send size={18} /> {pending ? "저장 중" : "글 올리기"}</button>
      {error ? <p className="comment-error">{error}</p> : null}
      {created ? (
        <div className="issued-identity">
          <strong>글이 올라갔습니다</strong>
          <span>작성자: {created.guestId}</span>
          <span>표시 IP: {created.ipPrefix}</span>
          <p>방금 정한 임시비밀번호는 나중에 수정/삭제 기능을 붙일 때 본인 확인용으로 씁니다.</p>
        </div>
      ) : null}
    </form>
  );
}
