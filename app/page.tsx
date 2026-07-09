import { BestContentRail } from "@/components/BestContentRail";
import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { Sidebar } from "@/components/Sidebar";
import { ThreadCard } from "@/components/ThreadCard";
import { TopicExplore } from "@/components/TopicExplore";
import { getCommunities, getEvents, getThreads } from "@/lib/data";
export default async function HomePage() {
  const [feed, communities, eventList, trending] = await Promise.all([
    getThreads("hot"),
    getCommunities(),
    getEvents(),
    getThreads("hot")
  ]);

  return (
    <main className="app-shell">
      <div className="content-layout">
        <section className="feed-column">
          <FeedTabs />
          <BestContentRail threads={trending} />
          <TopicExplore />
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
