"use client";

import { useRef, useState } from "react";
import { Camera, Check, Save, UploadCloud } from "lucide-react";
import { avatarPresets } from "@/lib/avatars";
import type { SessionUser } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { ProfileAvatar } from "./ProfileAvatar";

const styleOptions = [
  "센슈얼",
  "도미니칸",
  "트레디셔널",
  "인플루언스",
  "풋워크",
  "레이디 스타일",
  "맨즈 스타일",
  "뮤지컬리티",
  "소셜댄스"
];

export function ProfileEditor({
  initialUser,
  welcome = false
}: {
  initialUser: SessionUser;
  welcome?: boolean;
}) {
  const { refresh } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(initialUser.displayName);
  const [handle, setHandle] = useState(initialUser.handle);
  const [bio, setBio] = useState(initialUser.bio);
  const [location, setLocation] = useState(initialUser.location);
  const [danceYears, setDanceYears] = useState(
    initialUser.danceYears === null || initialUser.danceYears === undefined
      ? ""
      : String(initialUser.danceYears)
  );
  const [preferredStyles, setPreferredStyles] = useState(initialUser.preferredStyles);
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl || "");
  const [avatarPreset, setAvatarPreset] = useState(initialUser.avatarPreset);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    welcome ? "가입이 완료됐습니다. 공개할 프로필을 먼저 확인해주세요." : ""
  );

  const toggleStyle = (style: string) => {
    setPreferredStyles((current) => current.includes(style)
      ? current.filter((item) => item !== style)
      : [...current, style].slice(0, 8));
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "avatar");
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await response.json() as { media?: { url: string }; error?: string };
      if (!response.ok || !data.media?.url) {
        throw new Error(data.error || "프로필 사진을 올리지 못했습니다.");
      }
      setAvatarUrl(data.media.url);
      setNotice("새 프로필 사진을 선택했습니다. 저장하면 반영됩니다.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "프로필 사진을 올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          handle,
          bio,
          location,
          danceYears,
          preferredStyles,
          avatarUrl,
          avatarPreset
        })
      });
      const data = await response.json() as { user?: SessionUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "프로필을 저장하지 못했습니다.");
      setDisplayName(data.user.displayName);
      setHandle(data.user.handle);
      setBio(data.user.bio);
      setLocation(data.user.location);
      setDanceYears(data.user.danceYears === null ? "" : String(data.user.danceYears));
      setPreferredStyles(data.user.preferredStyles);
      setAvatarUrl(data.user.avatarUrl || "");
      setAvatarPreset(data.user.avatarPreset);
      await refresh();
      setNotice("프로필을 저장했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "프로필을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="profile-editor">
      <section className="profile-preview">
        <div className="profile-photo-control">
          <ProfileAvatar
            name={displayName}
            avatarUrl={avatarUrl}
            avatarPreset={avatarPreset}
            size={104}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <UploadCloud size={18} /> : <Camera size={18} />}
            {uploading ? "업로드 중" : "사진 바꾸기"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadAvatar(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <div>
          <span className="section-kicker">MY PROFILE</span>
          <h1>{displayName || "내 프로필"}</h1>
          <p>@{handle}</p>
          <small>{initialUser.email} · 이메일은 다른 사람에게 보이지 않습니다.</small>
        </div>
      </section>

      <section className="profile-form-card">
        <div className="profile-field-grid">
          <label>
            닉네임
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={24} />
            <small>글과 댓글에 표시됩니다.</small>
          </label>
          <label>
            아이디
            <span className="handle-input"><b>@</b><input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={24} /></span>
            <small>공개 프로필 주소에 사용됩니다.</small>
          </label>
        </div>

        <label>
          한 줄 소개
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} placeholder="좋아하는 음악이나 춤 이야기를 적어보세요." />
          <small className="field-count">{bio.length}/160</small>
        </label>

        <div className="profile-field-grid">
          <label>
            활동 지역
            <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={24} placeholder="예: 서울, 부산, 제주" />
          </label>
          <label>
            바차타 경력
            <span className="years-input"><input type="number" min="0" max="50" value={danceYears} onChange={(event) => setDanceYears(event.target.value)} /><b>년</b></span>
          </label>
        </div>

        <fieldset className="profile-styles">
          <legend>관심 있는 스타일</legend>
          <div>
            {styleOptions.map((style) => (
              <button
                key={style}
                type="button"
                className={preferredStyles.includes(style) ? "is-selected" : ""}
                onClick={() => toggleStyle(style)}
              >
                {preferredStyles.includes(style) ? <Check size={15} /> : null}
                {style}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="avatar-presets">
          <legend>기본 아바타</legend>
          <div>
            {avatarPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={avatarPreset === preset.id && !avatarUrl ? "is-selected" : ""}
                onClick={() => {
                  setAvatarPreset(preset.id);
                  setAvatarUrl("");
                }}
                aria-label={`${preset.label} 아바타 선택`}
              >
                <span>{preset.emoji}</span>
                <small>{preset.label}</small>
              </button>
            ))}
          </div>
        </fieldset>

        {notice ? <p className="profile-notice">{notice}</p> : null}
        {error ? <p className="profile-error">{error}</p> : null}

        <div className="profile-save-row">
          <a href={`/u/${encodeURIComponent(handle)}`} target="_blank" rel="noreferrer">공개 프로필 보기</a>
          <button type="button" onClick={() => void save()} disabled={pending || uploading}>
            <Save size={17} />
            {pending ? "저장 중" : "프로필 저장"}
          </button>
        </div>
      </section>
    </div>
  );
}
