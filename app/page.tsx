import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
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
      <div className="content-layout">
        <section className="feed-column">
          <FeedTabs active={sort} />
          <LiveThreadList />
          <div className="thread-list">
            {feed.map((thread) => <ThreadCard key={thread.id} thread={thread} />)}
          </div>
        </section>
        <Sidebar communities={communities} events={eventList} trending={trending} />
      </div>
    </main>
  );
}
