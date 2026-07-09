"use client";

import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { avatarFromSeed, avatarPresets } from "@/lib/avatars";
import { getGuestSession, saveGuestSession } from "@/lib/guest-session";

const storageKey = "bachata.profile.v1";

type Profile = {
  nickname: string;
  bio: string;
  avatarId: string;
};

export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile>({
    nickname: "",
    bio: "",
    avatarId: avatarPresets[0].id
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const session = getGuestSession();
    const fallbackAvatar = avatarFromSeed(session.nickname);
    try {
      const raw = window.localStorage.getItem(storageKey);
      const stored = raw ? JSON.parse(raw) as Partial<Profile> : {};
      setProfile({
        nickname: stored.nickname || session.nickname,
        bio: stored.bio || "",
        avatarId: stored.avatarId || fallbackAvatar.id
      });
    } catch {
      setProfile({
        nickname: session.nickname,
        bio: "",
        avatarId: fallbackAvatar.id
      });
    }
  }, []);

  const save = () => {
    const nickname = profile.nickname.trim().slice(0, 32);
    const next = { ...profile, nickname };
    setProfile(next);
    saveGuestSession({ nickname });
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const selectedAvatar = avatarPresets.find((avatar) => avatar.id === profile.avatarId) || avatarPresets[0];

  return (
    <section className="profile-panel">
      <div className="profile-preview">
        <span className="profile-avatar" aria-hidden="true">{selectedAvatar.emoji}</span>
        <div>
          <strong>{profile.nickname || "익명 댄서"}</strong>
          <p>{profile.bio || "프로필 소개를 짧게 적어두면 댓글과 글쓰기에서 더 알아보기 쉽습니다."}</p>
        </div>
      </div>

      <label>
        닉네임
        <input
          value={profile.nickname}
          onChange={(event) => setProfile((current) => ({ ...current, nickname: event.target.value }))}
          placeholder="닉네임"
          maxLength={32}
        />
      </label>

      <label>
        한 줄 소개
        <textarea
          value={profile.bio}
          onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value.slice(0, 120) }))}
          placeholder="예: 센슈얼 입문 중, 소셜 영상 보는 걸 좋아해요."
          rows={4}
        />
      </label>

      <div className="avatar-picker" aria-label="기본 프사 선택">
        {avatarPresets.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            aria-pressed={profile.avatarId === avatar.id}
            onClick={() => setProfile((current) => ({ ...current, avatarId: avatar.id }))}
          >
            <span>{avatar.emoji}</span>
            {avatar.label}
          </button>
        ))}
      </div>

      <button type="button" className="submit-button" onClick={save}>
        {saved ? <Check size={18} /> : <Save size={18} />}
        {saved ? "저장됐습니다" : "프로필 저장"}
      </button>
    </section>
  );
}
