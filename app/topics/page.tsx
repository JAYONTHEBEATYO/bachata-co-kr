import type { Metadata } from "next";
import { FeedTabs } from "@/components/FeedTabs";
import { TopicExplore } from "@/components/TopicExplore";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "주제 탐색",
  description: "아카데미 리뷰, 댄서 리뷰, 소셜 후기와 국내외 행사 토픽을 한곳에서 찾을 수 있습니다.",
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
