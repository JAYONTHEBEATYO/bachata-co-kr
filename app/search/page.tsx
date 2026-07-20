import type { Metadata } from "next";
import { LiveThreadList } from "@/components/LiveThreadList";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "검색",
  description: "바차타 코리아에 올라온 글을 검색합니다.",
  alternates: { canonical: absoluteUrl("/search") }
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  return (
    <main className="app-shell narrow">
      <header className="page-title-row">
        <div>
          <h1>{query ? `“${query}” 검색 결과` : "검색"}</h1>
          <p>{query ? "제목과 본문에서 찾았습니다." : "검색어를 입력해주세요."}</p>
        </div>
      </header>
      {query ? <LiveThreadList query={query} sort="new" emptyCopy="일치하는 글이 없습니다." /> : null}
    </main>
  );
}
