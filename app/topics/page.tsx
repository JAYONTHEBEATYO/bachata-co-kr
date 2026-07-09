import type { Metadata } from "next";
import { FeedTabs } from "@/components/FeedTabs";
import { TopicExplore } from "@/components/TopicExplore";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "주제 탐색",
  description: "바차타 코리아의 아카데미 리뷰, 댄서 리뷰, 소셜 후기, 국내외 행사 하위 주제를 살펴봅니다.",
  alternates: { canonical: absoluteUrl("/topics") }
};

export default function TopicsPage() {
  return (
    <main className="app-shell">
      <section className="feed-column">
        <FeedTabs activeHref="/topics" />
        <TopicExplore />
      </section>
    </main>
  );
}
