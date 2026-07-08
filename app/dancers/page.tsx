import type { Metadata } from "next";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getDancers } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "댄서",
  description: "국내외 바차타 댄서와 팀을 영상, 스타일, 한국 씬과의 연결로 정리합니다.",
  alternates: { canonical: absoluteUrl("/dancers") }
};

export default async function DancersPage() {
  const dancers = await getDancers();

  return (
    <main className="app-shell">
      <section className="page-head">
        <span className="eyebrow">Dancer Index</span>
        <h1>댄서 소개는 영상으로 시작합니다</h1>
        <p>이름만 나열하지 않고, 어떤 움직임을 보면 좋은지와 한국 바차타 독자에게 왜 의미가 있는지 같이 씁니다.</p>
      </section>
      <section className="dancer-grid">
        {dancers.map((dancer) => (
          <article key={dancer.id} className="dancer-card">
            <VideoEmbed videoId={dancer.videoId} title={dancer.name} compact />
            <div>
              <span className="flair">{dancer.role}</span>
              <h2>{dancer.name}</h2>
              <p>{dancer.excerpt}</p>
              <div className="tag-row">
                {dancer.tags.map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
