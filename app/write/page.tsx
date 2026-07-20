import type { Metadata } from "next";
import { Suspense } from "react";
import { GuestThreadComposer } from "@/components/GuestThreadComposer";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "글쓰기",
  description: "바차타 영상, 질문, 행사, 댄서 이야기를 쓰레드로 남기는 글쓰기 화면입니다.",
  alternates: { canonical: absoluteUrl("/write") }
};

export default function WritePage() {
  return (
    <main className="app-shell narrow">
      <header className="page-title-row">
        <div>
          <h1>글쓰기</h1>
          <p>주제를 고르고 이야기를 남겨주세요.</p>
        </div>
      </header>
      <Suspense fallback={null}>
        <GuestThreadComposer />
      </Suspense>
    </main>
  );
}
