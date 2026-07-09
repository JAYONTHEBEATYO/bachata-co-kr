import type { Metadata } from "next";
import Link from "next/link";
import { getDancers } from "@/lib/data";
import { absoluteUrl, youtubeThumb } from "@/lib/format";

export const metadata: Metadata = {
  title: "댄서",
  description: "국내외 바차타 댄서와 팀을 영상, 스타일, 한국 씬에서 눈여겨볼 포인트로 소개합니다.",
  alternates: { canonical: absoluteUrl("/dancers") }
};

export default async function DancersPage() {
  const dancers = await getDancers();

  return (
    <main className="app-shell">
      <section className="page-head">
        <span className="eyebrow">Dancers</span>
        <h1>지금 이야기해볼 바차타 댄서들</h1>
        <p>움직임이 눈에 들어오는 영상, 수업에서 바로 떠올릴 포인트, 같이 이야기해볼 장면을 댄서별 쓰레드로 모았습니다.</p>
      </section>
      <section className="dancer-grid">
        {dancers.map((dancer) => (
          <Link key={dancer.id} href={`/dancers/${dancer.id}`} className="dancer-card dancer-card-link" aria-label={`${dancer.name} 상세 쓰레드 보기`}>
            <article>
              <img className="dancer-thumb" src={youtubeThumb(dancer.videoId)} alt={`${dancer.name} 대표 영상 썸네일`} />
              <div>
                <span className="flair">{dancer.role}</span>
                <h2>{dancer.name}</h2>
                <p>{dancer.excerpt}</p>
                <div className="tag-row">
                  {dancer.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
                <span className="primary-link">댄서 쓰레드 보기</span>
              </div>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}
