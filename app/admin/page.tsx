import type { Metadata } from "next";
import { CheckCircle2, FilePenLine, ShieldCheck } from "lucide-react";
import { getDraftSignals } from "@/lib/data";

export const metadata: Metadata = {
  title: "운영 콘솔",
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  const drafts = await getDraftSignals();

  return (
    <main className="app-shell">
      <section className="page-head">
        <span className="eyebrow">Admin</span>
        <h1>운영 콘솔</h1>
        <p>수집된 공개 신호를 바로 공개하지 않고, 사람이 읽을 수 있는 쓰레드 초안으로 다듬는 공간입니다.</p>
      </section>
      <section className="admin-grid">
        <article className="admin-card"><FilePenLine /> 초안 {drafts.length}개</article>
        <article className="admin-card"><ShieldCheck /> 검토 대기 2개</article>
        <article className="admin-card"><CheckCircle2 /> 오늘 발행 0개</article>
      </section>
      <section className="draft-list">
        {drafts.map((draft) => (
          <article key={draft.id} className="draft-card">
            <span className="flair">{draft.suggestedFlair}</span>
            <h2>{draft.title}</h2>
            <p>{draft.summary}</p>
            <div className="thread-meta">
              <span>{draft.source}</span>
              <span>신뢰도 {draft.confidence}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
