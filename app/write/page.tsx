import type { Metadata } from "next";
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
      <section className="page-head">
        <span className="eyebrow">New Thread</span>
        <h1>바차타 글쓰기</h1>
        <p>로그인 없이도 질문, 후기, 영상, 행사 정보를 바로 올릴 수 있습니다. 닉네임과 임시비밀번호 4자리는 직접 정해주세요.</p>
      </section>
      <GuestThreadComposer />
    </main>
  );
}
