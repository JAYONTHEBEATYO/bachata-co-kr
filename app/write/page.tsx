import type { Metadata } from "next";
import { Link2, Send } from "lucide-react";
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
        <p>지금은 베타 화면입니다. 로그인과 저장은 Supabase 연결 후 활성화됩니다. 먼저 어떤 글을 받을지 UX를 잡아둡니다.</p>
      </section>
      <form className="composer">
        <label>
          제목
          <input placeholder="예: 이번 주 서울 바차타 소셜 어디가 좋나요?" />
        </label>
        <label>
          카테고리
          <select defaultValue="questions">
            <option value="questions">질문</option>
            <option value="video">영상</option>
            <option value="events">행사</option>
            <option value="dancers">댄서</option>
          </select>
        </label>
        <label>
          본문
          <textarea rows={10} placeholder="무엇을 봤는지, 어디가 궁금한지, 링크가 있다면 함께 남겨주세요." />
        </label>
        <label>
          링크
          <span className="input-with-icon"><Link2 size={17} /><input placeholder="YouTube, Instagram, 공식 행사 링크" /></span>
        </label>
        <button type="button" className="submit-button"><Send size={18} /> 쓰레드 미리보기</button>
      </form>
    </main>
  );
}
