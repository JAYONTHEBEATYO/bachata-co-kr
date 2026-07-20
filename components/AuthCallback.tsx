"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase-browser";

export function AuthCallback() {
  const [message, setMessage] = useState("Google 로그인 정보를 확인하고 있습니다.");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const run = async () => {
      const client = getSupabaseBrowserClient();
      if (!hasSupabaseBrowserConfig || !client) {
        setFailed(true);
        setMessage("현재 Google 로그인을 사용할 수 없습니다.");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const next = url.searchParams.get("next") || "/profile";

      try {
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { data, error } = await client.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("로그인 세션을 찾지 못했습니다.");
        }

        window.location.replace(next.startsWith("/") ? next : "/profile");
      } catch (error) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "로그인을 완료하지 못했습니다.");
      }
    };

    run();
  }, []);

  return (
    <section className="auth-panel">
      <p>{message}</p>
      {failed ? <Link className="submit-button" href="/login">로그인으로 돌아가기</Link> : null}
    </section>
  );
}
