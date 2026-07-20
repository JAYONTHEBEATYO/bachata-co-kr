"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, UserCircle } from "lucide-react";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase-browser";

export function GoogleLoginButton() {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const configured = hasSupabaseBrowserConfig;

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    client.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const login = async () => {
    const client = getSupabaseBrowserClient();
    if (!configured) {
      setStatus("현재는 비회원으로 이용할 수 있습니다.");
      return;
    }
    if (!client) return;

    setPending(true);
    setStatus("");
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    if (error) setStatus(error.message);
    setPending(false);
  };

  const logout = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setPending(true);
    const { error } = await client.auth.signOut();
    if (error) setStatus(error.message);
    setUser(null);
    setPending(false);
  };

  if (configured && user) {
    return (
      <div className="auth-panel">
        <div className="auth-account">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" />
          ) : (
            <UserCircle size={36} />
          )}
          <div>
            <strong>{user.user_metadata?.name || user.email || "Google 계정"}</strong>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="auth-actions">
          <Link className="submit-button" href="/profile">내 프로필로 이동</Link>
          <button type="button" className="ghost-button" onClick={logout} disabled={pending}>
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
        {status ? <p>{status}</p> : null}
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="auth-panel">
        <strong>비회원으로 바로 이용하세요</strong>
        <p>닉네임과 임시비밀번호를 정하면 글과 댓글을 남길 수 있습니다. 프로필은 현재 브라우저에 저장됩니다.</p>
        <Link className="submit-button" href="/profile"><UserCircle size={18} /> 내 프로필 설정</Link>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <button type="button" className="submit-button" onClick={login} disabled={pending}>
        <LogIn size={18} />
        {pending ? "Google로 이동 중" : "Google로 계속하기"}
      </button>
      <p>{status || "Google 계정으로 로그인하면 다른 기기에서도 같은 프로필을 이어서 쓸 수 있습니다."}</p>
    </div>
  );
}
