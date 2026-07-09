import type { Metadata } from "next";
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
        <p>게시글 작성은 회원 기능으로 운영합니다. 로그인 연동 전까지 비회원은 각 쓰레드의 댓글로 참여할 수 있습니다.</p>
      </section>
      <section className="composer member-write-gate">
        <strong>회원 글쓰기 준비 중</strong>
        <p>구글 로그인 기반 회원가입을 붙인 뒤 글쓰기, 미디어 업로드, 수정/삭제 권한을 함께 열겠습니다.</p>
        <a className="submit-button" href="/">피드로 돌아가기</a>
      </section>
    </main>
  );
}
