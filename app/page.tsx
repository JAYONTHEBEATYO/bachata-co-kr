import { AppNavigation } from "@/components/AppNavigation";
import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { QuickComposer } from "@/components/QuickComposer";
import { Sidebar } from "@/components/Sidebar";
import { TopicRibbon } from "@/components/TopicRibbon";
import { getCommunities } from "@/lib/data";

type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const { sort: requestedSort } = await searchParams;
  const sort = requestedSort === "new" || requestedSort === "top" ? requestedSort : "hot";
  const communities = await getCommunities();

  return (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        <section className="feed-column" aria-label="바차타 토픽">
          <header className="feed-heading">
            <div>
              <span className="section-kicker">COMMUNITY FEED</span>
              <h1>오늘의 피드</h1>
            </div>
            <span className="live-mark"><i /> BACHATA.KR</span>
          </header>
          <QuickComposer />
          <TopicRibbon communities={communities} />
          <FeedTabs sort={sort} />
          <LiveThreadList
            sort={sort}
            emptyCopy="오늘 들은 노래, 궁금한 스텝, 소셜에서 생긴 이야기부터 꺼내보세요."
          />
        </section>
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
