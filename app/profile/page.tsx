import type { Metadata } from "next";
import { ProfileSettings } from "@/components/ProfileSettings";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "내 프로필",
  description: "바차타 코리아에서 사용할 닉네임, 기본 프사, 한 줄 소개를 설정합니다.",
  alternates: { canonical: absoluteUrl("/profile") }
};

export default function ProfilePage() {
  return (
    <main className="app-shell narrow">
      <section className="page-head">
        <span className="eyebrow">Profile</span>
        <h1>내 프로필</h1>
        <p>댓글과 글쓰기에 보일 닉네임, 기본 프사, 한 줄 소개를 정리해두는 공간입니다.</p>
      </section>
      <ProfileSettings />
    </main>
  );
}
