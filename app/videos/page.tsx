import type { Metadata } from "next";
import { ThreadCard } from "@/components/ThreadCard";
import { getThreads } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "바차타 영상",
  description: "바차타 베이직, 센슈얼, Bachata Influence, 국내 소셜 영상을 쓰레드로 모아봅니다.",
  alternates: { canonical: absoluteUrl("/videos") }
};

export default async function VideosPage() {
  const threads = (await getThreads("hot")).filter((thread) => thread.videoId);

  return (
    <main className="app-shell">
      <section className="page-head">
        <span className="eyebrow">Video Threads</span>
        <h1>영상부터 보고 이야기하기</h1>
        <p>바차타는 말보다 영상이 빠를 때가 많습니다. 바로 재생되는 영상 옆에, 어디를 보면 좋은지도 함께 짚어둡니다.</p>
      </section>
      <section className="thread-list wide">
        {threads.map((thread) => <ThreadCard key={thread.id} thread={thread} />)}
      </section>
    </main>
  );
}
