import { FeedTabs } from "@/components/FeedTabs";
import { Sidebar } from "@/components/Sidebar";
import { ThreadCard } from "@/components/ThreadCard";
import { getCommunities, getEvents, getThreads } from "@/lib/data";
import type { SortMode } from "@/lib/types";

const isSortMode = (value: unknown): value is SortMode => ["hot", "new", "top", "rising"].includes(String(value));

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const params = await searchParams;
  const sort: SortMode = isSortMode(params.sort) ? params.sort : "hot";
  const [feed, communities, eventList, trending] = await Promise.all([
    getThreads(sort),
    getCommunities(),
    getEvents(),
    getThreads("hot")
  ]);

  return (
    <main className="app-shell">
      <section className="hero-feed">
        <div>
          <span className="eyebrow">Bachata Korea Community</span>
          <h1>바차타, 어디까지 알고 있니?</h1>
          <p>센슈얼? 도미니칸? 국내 바차타 소식과 해외 페스티벌, 댄서와 커뮤니티 소식까지 😍 바차타 코리아에서 만나요 😁👍</p>
        </div>
        <div className="hero-card">
          <strong>오늘 뭐 볼까?</strong>
          <p>처음 보는 베이직 영상부터 이번 주 소셜, 페스티벌 소식까지. 바차타가 궁금할 때 바로 넘겨볼 수 있게 골라두었습니다.</p>
        </div>
      </section>
      <div className="content-layout">
        <section className="feed-column">
          <FeedTabs active={sort} />
          <div className="thread-list">
            {feed.map((thread) => <ThreadCard key={thread.id} thread={thread} />)}
          </div>
        </section>
        <Sidebar communities={communities} events={eventList} trending={trending} />
      </div>
    </main>
  );
}
