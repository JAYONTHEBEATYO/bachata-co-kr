"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  BarChart3,
  Bold,
  Check,
  FileText,
  HelpCircle,
  ImageIcon,
  Italic,
  Link2,
  List,
  MoreHorizontal,
  Send,
  Strikethrough,
  Video
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getGuestSession, saveGuestSession } from "@/lib/guest-session";

type CreatedThread = {
  id: string;
  title: string;
  guestId: string;
  ipPrefix: string;
};

type PostType = "text" | "media" | "link" | "poll" | "ama";

const postTypes: Array<{ value: PostType; label: string; icon: LucideIcon }> = [
  { value: "text", label: "텍스트", icon: FileText },
  { value: "media", label: "이미지 및 동영상", icon: ImageIcon },
  { value: "link", label: "링크", icon: Link2 },
  { value: "poll", label: "설문조사", icon: BarChart3 },
  { value: "ama", label: "무물보", icon: HelpCircle }
];

const topics = [
  { value: "questions", label: "질문", hint: "초보 질문, 장르 고민, 수업 전 궁금증" },
  { value: "free", label: "자유", hint: "가벼운 잡담, 오늘의 소셜, 현장 이야기" },
  { value: "video", label: "영상", hint: "유튜브, 쇼츠, 인스타 릴스 같이 보기" },
  { value: "events", label: "행사", hint: "소셜, 워크숍, 페스티벌 정보" },
  { value: "academyReview", label: "아카데미 리뷰", hint: "학원, 동호회, 수업 후기" },
  { value: "dancerReview", label: "댄서 리뷰", hint: "워크숍, 부트캠프, 소셜댄스 후기" },
  { value: "dancers", label: "댄서 이야기", hint: "국내외 댄서와 팀 이야기" },
  { value: "guide", label: "가이드", hint: "입문 팁, 연습법, 장르 정리" }
];

const draftKey = "bachata.threadDraft.v1";

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
  const [postType, setPostType] = useState<PostType>("text");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pollOptionA, setPollOptionA] = useState("");
  const [pollOptionB, setPollOptionB] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedThread | null>(null);

  useEffect(() => {
    const session = getGuestSession();
    setAuthorName(session.nickname);
    setAuthorPassword(session.password);

    try {
      const rawDraft = window.localStorage.getItem(draftKey);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft) as {
        title?: string;
        body?: string;
        linkUrl?: string;
        category?: string;
        postType?: PostType;
        pollOptionA?: string;
        pollOptionB?: string;
        tagInput?: string;
      };
      setTitle(draft.title || "");
      setBody(draft.body || "");
      setLinkUrl(draft.linkUrl || "");
      setCategory(draft.category || "questions");
      setPostType(draft.postType || "text");
      setPollOptionA(draft.pollOptionA || "");
      setPollOptionB(draft.pollOptionB || "");
      setTagInput(draft.tagInput || "");
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, []);

  const choosePostType = (nextType: PostType) => {
    setPostType(nextType);
    if (nextType === "media") setCategory("video");
    if (nextType === "poll") setCategory("questions");
    if (nextType === "ama") setCategory("questions");
  };

  const saveDraft = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(draftKey, JSON.stringify({ title, body, linkUrl, category, postType, pollOptionA, pollOptionB, tagInput }));
    setCreated(null);
    setError("");
  };

  const bodyForSubmit = () => {
    const chunks = [body.trim()];

    if (postType === "poll") {
      const options = [pollOptionA.trim(), pollOptionB.trim()].filter(Boolean);
      if (options.length) {
        chunks.push(`[설문]\n${options.map((option, index) => `${index + 1}. ${option}`).join("\n")}`);
      }
    }

    if (postType === "ama") {
      chunks.push("무물보로 열어둔 글입니다. 궁금한 건 댓글로 편하게 물어봐 주세요.");
    }

    if (tagInput.trim()) {
      const tags = tagInput
        .split(/[,\s#]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5)
        .map((tag) => `#${tag}`);
      if (tags.length) chunks.push(tags.join(" "));
    }

    return chunks.filter(Boolean).join("\n\n");
  };

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
    if ((postType === "media" || postType === "link") && !linkUrl.trim()) {
      setError(postType === "media" ? "이미지나 영상 링크를 붙여주세요." : "공유할 링크를 붙여주세요.");
      return;
    }
    if (postType === "poll" && (!pollOptionA.trim() || !pollOptionB.trim())) {
      setError("설문조사는 최소 두 가지 선택지가 필요합니다.");
      return;
    }

    const submitBody = bodyForSubmit();
    if (submitBody.length < 2) {
      setError("본문을 두 글자 이상 적어주세요.");
      return;
    }

    setPending(true);
    try {
      saveGuestSession({ nickname: authorName, password: authorPassword });
      const response = await fetch(threadsApiUrl(), {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          title,
          authorName,
          authorPassword,
          category: postType === "poll" ? "poll" : postType === "ama" ? "ama" : category,
          body: submitBody,
          linkUrl,
          website
        })
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
      setPollOptionA("");
      setPollOptionB("");
      setTagInput("");
      setWebsite("");
      window.localStorage.removeItem(draftKey);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "글을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-topline">
        <label className="topic-select">
          <span>주제 선택</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {topics.map((topic) => <option key={topic.value} value={topic.value}>{topic.label}</option>)}
          </select>
        </label>
        <button type="button" className="draft-button" onClick={saveDraft}>임시 저장하기</button>
      </div>

      <div className="composer-tabs" role="tablist" aria-label="글 종류">
        {postTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              type="button"
              role="tab"
              aria-selected={postType === type.value}
              onClick={() => choosePostType(type.value)}
            >
              <Icon size={17} />
              {type.label}
            </button>
          );
        })}
      </div>

      <label>
        제목
        <span className="title-field">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="와 바차타 개꿀이야~~" maxLength={120} required />
          {title.trim().length >= 4 ? <Check size={22} /> : null}
        </span>
        <small className="field-count">{title.length}/120</small>
      </label>

      <div className="composer-note">
        <strong>{topics.find((topic) => topic.value === category)?.label || "질문"}</strong>
        <p>{topics.find((topic) => topic.value === category)?.hint || "바차타 이야기를 자유롭게 남겨주세요."}</p>
      </div>

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
        플레어 및 태그 추가
        <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="센슈얼, 소셜후기, 강남, 초보질문" maxLength={80} />
      </label>

      {postType === "media" ? (
        <div className="composer-upload">
          <Video size={28} />
          <div>
            <strong>이미지나 영상 링크를 붙여주세요</strong>
            <p>유튜브, 인스타, 공개 이미지 URL을 넣으면 글과 함께 공유됩니다. 직접 파일 업로드는 별도 저장소를 붙여서 열겠습니다.</p>
          </div>
        </div>
      ) : null}

      {(postType === "media" || postType === "link") ? (
        <label>
          {postType === "media" ? "이미지/영상 URL" : "링크 URL"}
          <span className="input-with-icon"><Link2 size={17} /><input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://..." /></span>
        </label>
      ) : null}

      {postType === "poll" ? (
        <div className="composer-grid">
          <label>
            선택지 1
            <input value={pollOptionA} onChange={(event) => setPollOptionA(event.target.value)} placeholder="센슈얼" maxLength={80} />
          </label>
          <label>
            선택지 2
            <input value={pollOptionB} onChange={(event) => setPollOptionB(event.target.value)} placeholder="도미니칸" maxLength={80} />
          </label>
        </div>
      ) : null}

      <div className="composer-toolbar" aria-label="본문 도구">
        <button type="button" title="굵게"><Bold size={18} /></button>
        <button type="button" title="기울임"><Italic size={18} /></button>
        <button type="button" title="취소선"><Strikethrough size={18} /></button>
        <button type="button" title="링크"><Link2 size={18} /></button>
        <button type="button" title="이미지"><ImageIcon size={18} /></button>
        <button type="button" title="목록"><List size={18} /></button>
        <button type="button" title="더보기"><MoreHorizontal size={18} /></button>
      </div>

      <label>
        본문
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={10}
          placeholder={postType === "ama" ? "무물보를 열게 된 이유와 답할 수 있는 범위를 가볍게 적어주세요." : "무엇을 봤는지, 왜 궁금한지, 다른 사람들이 알면 좋은 맥락을 적어주세요."}
          maxLength={4000}
          required
        />
      </label>

      <label className="comment-hp">
        웹사이트
        <input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>

      <button type="submit" className="submit-button" disabled={pending}><Send size={18} /> {pending ? "게시 중" : "게시하기"}</button>
      {error ? <p className="comment-error">{error}</p> : null}
      {created ? (
        <div className="issued-identity">
          <strong>글이 올라갔습니다</strong>
          <span>작성자: {created.guestId}</span>
          <span>표시 IP: {created.ipPrefix}</span>
          <p>이 브라우저 세션에서는 같은 닉네임과 임시비밀번호로 계속 댓글과 글을 남길 수 있습니다.</p>
        </div>
      ) : null}
    </form>
  );
}
