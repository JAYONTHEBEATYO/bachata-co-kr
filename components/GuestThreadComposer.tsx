"use client";

import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  UploadCloud,
  Video
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { communityApiUrl, communityThreadPath } from "@/lib/community-api";
import { getGuestSession, saveGuestSession } from "@/lib/guest-session";

type CreatedThread = {
  id: string;
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
  { value: "socialReview", label: "소셜 후기", hint: "바, 지역, 플로어 분위기와 음악 후기" },
  { value: "academyReview", label: "아카데미 리뷰", hint: "학원, 동호회, 수업 후기" },
  { value: "dancerReview", label: "댄서 리뷰", hint: "워크숍, 부트캠프, 소셜댄스 후기" },
  { value: "ama", label: "무물보", hint: "궁금한 질문을 댓글로 받고 답하는 글" }
];

const subtopicsByCategory: Record<string, string[]> = {
  academyReview: [
    "아카데미:라틴씨엘로",
    "아카데미:센슈얼랩",
    "아카데미:에버라틴",
    "아카데미:라스트댄스",
    "아카데미:엔수에뇨",
    "아카데미:바차타인플루언스코리아",
    "동호회:오살사",
    "동호회:서울 살사·바차타",
    "동호회:부산 라틴댄스",
    "동호회:대구 라틴댄스",
    "동호회:제주 라틴댄스"
  ],
  dancerReview: [
    "댄서🕺:멜빈(FRANCE)",
    "댄서💃:가티카(SPAIN)",
    "댄서🕺:헤로(SPAIN)",
    "댄서💃:미글레(SPAIN)",
    "댄서🕺:그레이(한국)",
    "댄서💃:로렌(한국)",
    "댄서🕺:소라(한국)",
    "댄서🕺:원궁(한국)",
    "리뷰:부트캠프",
    "리뷰:마스터클래스",
    "리뷰:워크숍",
    "리뷰:소셜댄스"
  ],
  socialReview: [
    "소셜:강남 라틴바",
    "소셜:홍대 보니따",
    "소셜:인천",
    "소셜:부산",
    "소셜:대구",
    "소셜:대전",
    "소셜:광주",
    "소셜:제주",
    "소셜:지방 원정",
    "소셜:처음 간 후기"
  ],
  events: [
    "행사:국내 페스티벌",
    "행사:해외 페스티벌",
    "행사:워크숍",
    "행사:파티",
    "행사:Jack & Jill",
    "행사:양도/패스",
    "행사:후기"
  ],
  questions: ["질문:입문", "질문:음악", "질문:홀딩", "질문:소셜매너", "무물보"],
  video: ["영상:베이직", "영상:센슈얼", "영상:도미니칸", "영상:풋워크", "영상:공연"],
  free: ["일상", "잡담", "친목", "현장 소식"]
};

const validPostTypes = new Set<PostType>(postTypes.map((type) => type.value));
const validTopics = new Set(topics.map((topic) => topic.value));
const draftKey = "bachata.threadDraft.v1";

const threadsApiUrl = () => communityApiUrl("/api/threads/");
const uploadsApiUrl = () => communityApiUrl("/api/uploads/");

type UploadedMedia = {
  url: string;
  name: string;
  contentType: string;
  size: number;
};

export function GuestThreadComposer() {
  const searchParams = useSearchParams();
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorPassword, setAuthorPassword] = useState("");
  const [category, setCategory] = useState("questions");
  const [subtopic, setSubtopic] = useState("");
  const [postType, setPostType] = useState<PostType>("text");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pollOptionA, setPollOptionA] = useState("");
  const [pollOptionB, setPollOptionB] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getGuestSession();
    setAuthorName(session.nickname);
    setAuthorPassword("");

    const requestedTopic = searchParams.get("topic");
    const requestedType = searchParams.get("type") as PostType | null;
    if (requestedTopic && validTopics.has(requestedTopic)) setCategory(requestedTopic);
    if (requestedType && validPostTypes.has(requestedType)) setPostType(requestedType);

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
        subtopic?: string;
      };
      setTitle(draft.title || "");
      setBody(draft.body || "");
      setLinkUrl(draft.linkUrl || "");
      setCategory(requestedTopic && validTopics.has(requestedTopic) ? requestedTopic : draft.category || "questions");
      setPostType(requestedType && validPostTypes.has(requestedType) ? requestedType : draft.postType || "text");
      setPollOptionA(draft.pollOptionA || "");
      setPollOptionB(draft.pollOptionB || "");
      setTagInput(draft.tagInput || "");
      setSubtopic(draft.subtopic || "");
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [searchParams]);

  const choosePostType = (nextType: PostType) => {
    setPostType(nextType);
    if (nextType === "media") setCategory("video");
    if (nextType === "poll") setCategory("questions");
    if (nextType === "ama") setCategory("ama");
  };

  const saveDraft = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(draftKey, JSON.stringify({ title, body, linkUrl, category, subtopic, postType, pollOptionA, pollOptionB, tagInput }));
    setError("");
  };

  const insertBodyText = (before: string, after = "", fallback = "") => {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((current) => `${current}${before}${fallback}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end) || fallback;
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    setBody(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 6);
    if (!list.length) return;

    setUploading(true);
    setError("");

    try {
      const uploaded: UploadedMedia[] = [];
      for (const file of list) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(uploadsApiUrl(), { method: "POST", body: formData });
        const data = await response.json() as { media?: UploadedMedia; error?: string };
        if (!response.ok || !data.media) throw new Error(data.error || "파일을 업로드하지 못했습니다.");
        uploaded.push(data.media);
      }
      setUploadedMedia((current) => [...current, ...uploaded].slice(0, 8));
      if (postType !== "media") setPostType("media");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "파일을 업로드하지 못했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    uploadFiles(event.dataTransfer.files);
  };

  const removeMedia = (url: string) => {
    setUploadedMedia((current) => current.filter((item) => item.url !== url));
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

    if (subtopic) chunks.push(`#${subtopic.replace(/[^\p{L}\p{N}:·&/()🕺💃가-힣A-Za-z0-9\s-]/gu, "").replace(/\s+/g, "")}`);

    if (uploadedMedia.length) {
      chunks.push(`[첨부]\n${uploadedMedia.map((item) => `${item.contentType.startsWith("video/") ? "동영상" : "이미지"}: ${item.url}`).join("\n")}`);
    }

    return chunks.filter(Boolean).join("\n\n");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (title.trim().length < 4) {
      setError("제목을 네 글자 이상 적어주세요.");
      return;
    }
    if (!/^\d{4}$/.test(authorPassword.trim())) {
      setError("임시비밀번호 4자리를 숫자로 입력해주세요.");
      return;
    }
    if (postType === "media" && !linkUrl.trim() && !uploadedMedia.length) {
      setError("이미지나 영상 파일을 올리거나, 공개 링크를 붙여주세요.");
      return;
    }
    if (postType === "link" && !linkUrl.trim()) {
      setError("공유할 링크를 붙여주세요.");
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
          linkUrl: linkUrl || uploadedMedia[0]?.url || "",
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

      setTitle("");
      setBody("");
      setLinkUrl("");
      setPollOptionA("");
      setPollOptionB("");
      setTagInput("");
      setSubtopic("");
      setAuthorPassword("");
      setUploadedMedia([]);
      setWebsite("");
      window.localStorage.removeItem(draftKey);
      window.location.assign(communityThreadPath(data.thread.id));
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
          <select value={category} onChange={(event) => {
            setCategory(event.target.value);
            setSubtopic("");
          }}>
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
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목을 입력하세요" maxLength={120} required />
          {title.trim().length >= 4 ? <Check size={22} /> : null}
        </span>
        <small className="field-count">{title.length}/120</small>
      </label>

      <div className="composer-note">
        <strong>{topics.find((topic) => topic.value === category)?.label || "질문"}</strong>
        <p>{topics.find((topic) => topic.value === category)?.hint || "바차타 이야기를 자유롭게 남겨주세요."}</p>
      </div>

      {subtopicsByCategory[category]?.length ? (
        <label>
          하위 주제
          <select value={subtopic} onChange={(event) => setSubtopic(event.target.value)}>
            <option value="">선택 안 함</option>
            {subtopicsByCategory[category].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      ) : null}

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
        <div
          className="composer-upload"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={30} />
          <div>
            <strong>{uploading ? "업로드 중입니다" : "파일을 끌어다 놓거나 클릭해서 선택하세요"}</strong>
            <p>이미지와 짧은 동영상을 올릴 수 있습니다. 유튜브·인스타 링크도 아래 URL 칸에 함께 붙일 수 있습니다.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) uploadFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </div>
      ) : null}

      {uploadedMedia.length ? (
        <div className="media-preview-grid">
          {uploadedMedia.map((item) => (
            <figure key={item.url} className="media-preview">
              {item.contentType.startsWith("video/") ? (
                <video src={item.url} controls muted />
              ) : (
                <img src={item.url} alt={item.name} />
              )}
              <figcaption>
                <span>{item.name}</span>
                <button type="button" onClick={() => removeMedia(item.url)}>삭제</button>
              </figcaption>
            </figure>
          ))}
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
        <button type="button" title="굵게" onClick={() => insertBodyText("**", "**", "강조할 문장")}><Bold size={18} /></button>
        <button type="button" title="기울임" onClick={() => insertBodyText("_", "_", "기울일 문장")}><Italic size={18} /></button>
        <button type="button" title="취소선" onClick={() => insertBodyText("~~", "~~", "취소할 문장")}><Strikethrough size={18} /></button>
        <button type="button" title="링크" onClick={() => insertBodyText("[", "](https://)", "링크 제목")}><Link2 size={18} /></button>
        <button type="button" title="이미지" onClick={() => {
          setPostType("media");
          fileInputRef.current?.click();
        }}><ImageIcon size={18} /></button>
        <button type="button" title="목록" onClick={() => insertBodyText("- ", "", "목록")}><List size={18} /></button>
        <button type="button" title="더보기"><MoreHorizontal size={18} /></button>
      </div>

      <label>
        본문
        <textarea
          ref={bodyRef}
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
    </form>
  );
}
