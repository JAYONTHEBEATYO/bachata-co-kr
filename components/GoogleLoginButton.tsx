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
      setStatus("Google 로그인 키가 아직 설정되지 않았습니다.");
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

  return (
    <div className="auth-panel">
      <button type="button" className="submit-button" onClick={login} disabled={pending}>
        <LogIn size={18} />
        {pending ? "Google로 이동 중" : "Google로 계속하기"}
      </button>
      <p>{configured ? "Google 계정으로 로그인하면 프로필과 글쓰기 기능을 계정에 묶을 수 있습니다." : status || "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 설정이 필요합니다."}</p>
    </div>
  );
}
