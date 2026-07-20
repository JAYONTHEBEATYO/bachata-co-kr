import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { LiveThreadList } from "@/components/LiveThreadList";
import { Sidebar } from "@/components/Sidebar";
import { getCommunities } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "검색",
  description: "바차타 코리아에 올라온 글을 검색합니다.",
  alternates: { canonical: absoluteUrl("/search") }
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const communities = await getCommunities();
  return (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        <section className="feed-column search-page">
          <header className="page-title-row">
            <div>
              <span className="section-kicker">SEARCH</span>
              <h1>{query ? `“${query}” 검색 결과` : "글 검색"}</h1>
              <p>{query ? "제목과 본문에서 찾은 글입니다." : "찾고 싶은 이야기를 검색해보세요."}</p>
            </div>
          </header>
          {query ? <LiveThreadList query={query} sort="new" emptyCopy="검색어를 바꾸거나 새 글로 이야기를 시작해보세요." /> : null}
        </section>
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
