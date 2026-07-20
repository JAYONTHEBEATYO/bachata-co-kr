import type { Metadata } from "next";
import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { ThreadCard } from "@/components/ThreadCard";
import { getThreads } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "검색",
  description: "바차타 코리아의 토픽, 가이드, 영상과 행사 정보를 검색합니다.",
  alternates: { canonical: absoluteUrl("/search") }
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const allEditorial = await getThreads("new");
  const keyword = query.toLocaleLowerCase("ko-KR");
  const editorial = keyword
    ? allEditorial.filter((thread) => `${thread.title} ${thread.excerpt} ${thread.body} ${thread.tags.join(" ")}`.toLocaleLowerCase("ko-KR").includes(keyword))
    : [];

  return (
    <main className="app-shell">
      <section className="feed-column">
        <FeedTabs activeHref="" />
        <section className="page-head compact-head">
          <span className="eyebrow">SEARCH</span>
          <h1>{query ? `“${query}” 검색 결과` : "검색어를 입력해주세요"}</h1>
          <p>커뮤니티 글과 바차타 코리아 에디터가 정리한 콘텐츠를 함께 찾습니다.</p>
        </section>
        {query ? <LiveThreadList query={query} sort="new" /> : null}
        <div className="thread-list">
          {editorial.map((thread) => <ThreadCard key={thread.id} thread={thread} />)}
        </div>
        {query && !editorial.length ? <p className="empty-state">에디터 콘텐츠에서는 일치하는 글을 찾지 못했습니다.</p> : null}
      </section>
    </main>
  );
}
