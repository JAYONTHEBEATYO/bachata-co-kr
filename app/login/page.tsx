import type { Metadata } from "next";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "로그인",
  description: "바차타 코리아에 Google 계정으로 로그인합니다.",
  alternates: { canonical: absoluteUrl("/login") }
};

export default function LoginPage() {
  const authEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <main className="app-shell narrow">
      <section className="page-head">
        <span className="eyebrow">{authEnabled ? "로그인" : "비회원 이용"}</span>
        <h1>{authEnabled ? "로그인" : "가입 없이 바로 시작하기"}</h1>
        <p>{authEnabled ? "비회원으로도 글과 댓글을 남길 수 있습니다. 계정으로 이어가고 싶다면 Google 로그인을 사용하세요." : "닉네임과 임시비밀번호만 정하면 글과 댓글을 남길 수 있습니다."}</p>
      </section>
      <GoogleLoginButton />
    </main>
  );
}
