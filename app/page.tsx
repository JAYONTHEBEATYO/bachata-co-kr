import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { Sidebar } from "@/components/Sidebar";
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
      <div className="content-layout">
        <section className="feed-column" aria-label="바차타 토픽">
          <FeedTabs sort={sort} />
          <LiveThreadList
            sort={sort}
            emptyCopy="아직 올라온 글이 없습니다. 첫 이야기를 남겨보세요."
          />
        </section>
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
