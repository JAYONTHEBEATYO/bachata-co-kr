import type { Metadata } from "next";
import { AuthCallback } from "@/components/AuthCallback";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "로그인 처리 중",
  description: "Google 로그인을 완료하고 바차타 코리아 세션을 연결합니다.",
  robots: { index: false, follow: false },
  alternates: { canonical: absoluteUrl("/auth/callback") }
};

export default function AuthCallbackPage() {
  return (
    <main className="app-shell narrow">
      <section className="page-head">
        <span className="eyebrow">로그인</span>
        <h1>로그인 처리 중</h1>
        <p>잠시만 기다려주세요. 인증이 끝나면 프로필로 이동합니다.</p>
      </section>
      <AuthCallback />
    </main>
  );
}
