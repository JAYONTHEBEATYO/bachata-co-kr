"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Check, LogOut, Save } from "lucide-react";
import { avatarFromSeed, avatarPresets } from "@/lib/avatars";
import { getGuestSession, saveGuestSession } from "@/lib/guest-session";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase-browser";

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
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState("");

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

    const client = getSupabaseBrowserClient();
    if (!client) return;

    client.auth.getUser().then(({ data }) => {
      const nextUser = data.user || null;
      setUser(nextUser);
      if (!nextUser) return;

      const metadata = nextUser.user_metadata || {};
      const nickname = String(metadata.nickname || metadata.name || nextUser.email?.split("@")[0] || session.nickname).slice(0, 32);
      const bio = String(metadata.bio || "");
      const avatarId = String(metadata.avatarId || fallbackAvatar.id);

      setProfile({
        nickname,
        bio,
        avatarId: avatarPresets.some((avatar) => avatar.id === avatarId) ? avatarId : fallbackAvatar.id
      });
      saveGuestSession({ nickname });
    });
  }, []);

  const save = async () => {
    const nickname = profile.nickname.trim().slice(0, 32);
    const next = { ...profile, nickname };
    setProfile(next);
    saveGuestSession({ nickname });
    window.localStorage.setItem(storageKey, JSON.stringify(next));

    const client = getSupabaseBrowserClient();
    if (client && user) {
      const { error } = await client.auth.updateUser({
        data: {
          nickname,
          bio: next.bio.trim().slice(0, 120),
          avatarId: next.avatarId
        }
      });
      if (error) {
        setAuthStatus(error.message);
        return;
      }
      setAuthStatus("Google 계정 프로필에도 저장됐습니다.");
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const logout = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) {
      setAuthStatus(error.message);
      return;
    }
    setUser(null);
    setAuthStatus("로그아웃했습니다. 비회원 프로필은 이 브라우저에 유지됩니다.");
  };

  const selectedAvatar = avatarPresets.find((avatar) => avatar.id === profile.avatarId) || avatarPresets[0];

  return (
    <section className="profile-panel">
      <div className="auth-state-strip">
        {user ? (
          <>
            {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : null}
            <span>Google 로그인됨</span>
            <strong>{user.email}</strong>
            <button type="button" onClick={logout}><LogOut size={16} /> 로그아웃</button>
          </>
        ) : (
          <span>{hasSupabaseBrowserConfig ? "Google 로그인을 하면 다른 기기에서도 같은 프로필을 쓸 수 있습니다." : "비회원 프로필은 현재 브라우저에 저장됩니다."}</span>
        )}
      </div>

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
      {authStatus ? <p className="form-status">{authStatus}</p> : null}
    </section>
  );
}
