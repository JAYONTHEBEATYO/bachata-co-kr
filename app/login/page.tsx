import type { Metadata } from "next";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "로그인",
  description: "바차타 코리아에 Google 계정으로 로그인합니다.",
  alternates: { canonical: absoluteUrl("/login") }
};

export default function LoginPage() {
  return (
    <main className="app-shell narrow">
      <section className="page-head">
        <span className="eyebrow">로그인</span>
        <h1>로그인</h1>
        <p>비회원으로도 글과 댓글을 남길 수 있습니다. 계정으로 이어가고 싶다면 Google 로그인을 사용하세요.</p>
      </section>
      <GoogleLoginButton />
    </main>
  );
}
