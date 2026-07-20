import type { Metadata } from "next";
import { Suspense } from "react";
import { AppNavigation } from "@/components/AppNavigation";
import { GuestThreadComposer } from "@/components/GuestThreadComposer";
import { Sidebar } from "@/components/Sidebar";
import { getCommunities } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "글쓰기",
  description: "바차타 질문과 후기부터 수업, 소셜, 워크숍 홍보 영상까지 올리는 글쓰기 화면입니다.",
  alternates: { canonical: absoluteUrl("/write") }
};

export default async function WritePage() {
  const communities = await getCommunities();
  return (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        <section className="composer-page">
          <header className="page-title-row">
            <div>
              <span className="section-kicker">NEW POST</span>
              <h1>새 글 쓰기</h1>
              <p>질문과 후기, 수업 포스터와 짧은 홍보 영상까지 올려보세요.</p>
            </div>
          </header>
          <Suspense fallback={null}>
            <GuestThreadComposer />
          </Suspense>
        </section>
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
