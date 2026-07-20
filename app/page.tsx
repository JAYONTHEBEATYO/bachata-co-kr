import Link from "next/link";
import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { Sidebar } from "@/components/Sidebar";
import { ThreadCard } from "@/components/ThreadCard";
import { getCommunities, getEvents, getThreads } from "@/lib/data";

export default async function HomePage() {
  const [editorial, communities, eventList] = await Promise.all([
    getThreads("new"),
    getCommunities(),
    getEvents()
  ]);

  return (
    <main className="app-shell">
      <div className="content-layout">
        <section className="feed-column">
          <FeedTabs />
          <section className="feed-section" aria-labelledby="community-feed-title">
            <div className="section-head compact-section-head">
              <div>
                <span className="eyebrow">커뮤니티</span>
                <h1 id="community-feed-title">지금 올라온 이야기</h1>
              </div>
              <Link href="/write">새 글 쓰기</Link>
            </div>
            <LiveThreadList emptyCopy="아직 새 글이 없습니다. 궁금한 이야기부터 편하게 시작해보세요." />
          </section>
          <section className="feed-section" aria-labelledby="editorial-feed-title">
            <div className="section-head compact-section-head">
              <div>
                <span className="eyebrow">바차타 가이드</span>
                <h2 id="editorial-feed-title">바차타 코리아 가이드</h2>
              </div>
              <Link href="/guide">가이드 모아보기</Link>
            </div>
            <div className="thread-list">
              {editorial.map((thread) => <ThreadCard key={thread.id} thread={thread} compact />)}
            </div>
          </section>
        </section>
        <Sidebar communities={communities} events={eventList} trending={editorial} />
      </div>
    </main>
  );
}
