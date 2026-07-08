import type { Metadata } from "next";
import { getThreads } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";
import { VideoEmbed } from "@/components/VideoEmbed";

export const metadata: Metadata = {
  title: "초보자 가이드",
  description: "바차타 베이직, 센슈얼과 도미니칸 차이, 소셜 매너를 처음 배우는 사람이 바로 써먹을 순서로 안내합니다.",
  alternates: { canonical: absoluteUrl("/guide") }
};

export default async function GuidePage() {
  const guideThreads = (await getThreads("hot")).filter((thread) => ["입문", "장르", "소셜매너", "센슈얼"].includes(thread.flair));

  return (
    <main className="app-shell">
      <section className="page-head">
        <span className="eyebrow">Beginner Guide</span>
        <h1>처음이라면 이 순서로 보면 됩니다</h1>
        <p>바차타 베이직, 장르 구분, 소셜 매너를 먼저 잡으면 수업과 소셜이 훨씬 덜 낯설어집니다.</p>
      </section>
      <section className="guide-stack">
        {guideThreads.map((thread, index) => (
          <article key={thread.id} className="guide-card">
            <span className="guide-number">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <span className="flair">{thread.flair}</span>
              <h2>{thread.title}</h2>
              <p>{thread.body}</p>
              {thread.videoId ? <VideoEmbed videoId={thread.videoId} title={thread.title} /> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
