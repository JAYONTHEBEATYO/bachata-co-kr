import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { getCurrentSessionUser, normalizeReturnTo } from "@/lib/auth-server";
import { getCommunityContext } from "@/lib/community-server";

export const metadata: Metadata = {
  title: "로그인",
  description: "Google 계정으로 바차타 코리아에 가입하거나 로그인합니다.",
  robots: { index: false, follow: true }
};

const errorMessages: Record<string, string> = {
  not_configured: "로그인 설정을 마무리하는 중입니다. 잠시 후 다시 시도해주세요.",
  invalid_id_token: "Google 계정 정보를 확인하지 못했습니다.",
  invalid_identity: "확인된 Google 계정으로 다시 시도해주세요."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const user = await getCurrentSessionUser();
  const { googleClientId } = await getCommunityContext();
  const params = await searchParams;
  const returnTo = normalizeReturnTo(params.next, "/profile");
  if (user) redirect(returnTo);

  const errorMessage = params.error
    ? errorMessages[params.error] || "로그인 중 문제가 생겼습니다. 다시 시도해주세요."
    : "";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-brand" href="/" aria-label="바차타 코리아 홈">
          <span>B</span>
          <strong>BACHATA.CO.KR</strong>
        </Link>
        <div className="auth-copy">
          <span className="section-kicker">ACCOUNT</span>
          <h1>한 번만 연결하면<br />계속 내 계정으로</h1>
          <p>Google 계정으로 가입과 로그인을 한 번에 처리합니다. 이메일은 공개되지 않습니다.</p>
        </div>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <GoogleSignInButton clientId={googleClientId} returnTo={returnTo} />

        <ul className="auth-benefits">
          <li><CheckCircle2 size={18} />내 글과 댓글을 비밀번호 없이 관리</li>
          <li><CheckCircle2 size={18} />닉네임, 프로필 사진, 소개와 선호 장르 설정</li>
          <li><CheckCircle2 size={18} />비회원 글쓰기는 그대로 이용 가능</li>
        </ul>
        <p className="auth-footnote">
          계속하면 바차타 코리아의 <Link href="/terms">이용약관</Link>과{" "}
          <Link href="/privacy">개인정보 처리방침</Link>에 동의한 것으로 봅니다.
        </p>
      </section>
    </main>
  );
}
