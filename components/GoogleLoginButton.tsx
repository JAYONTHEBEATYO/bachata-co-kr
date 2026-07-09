"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { LogIn } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function GoogleLoginButton() {
  const [status, setStatus] = useState("");
  const configured = Boolean(supabaseUrl && supabaseAnonKey);

  const login = async () => {
    if (!configured) {
      setStatus("Google 로그인 키가 아직 설정되지 않았습니다.");
      return;
    }

    setStatus("");
    const client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/profile`
      }
    });

    if (error) setStatus(error.message);
  };

  return (
    <div className="auth-panel">
      <button type="button" className="submit-button" onClick={login}>
        <LogIn size={18} />
        Google로 계속하기
      </button>
      <p>{configured ? "Google 계정으로 로그인하면 프로필과 글쓰기 기능을 계정에 묶을 수 있습니다." : status || "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 설정이 필요합니다."}</p>
    </div>
  );
}
