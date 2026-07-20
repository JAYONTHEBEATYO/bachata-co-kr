import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { Sidebar } from "@/components/Sidebar";
import { TopicExplore } from "@/components/TopicExplore";
import { getCommunities } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "주제 탐색",
  description: "바차타 질문, 영상, 행사, 리뷰와 소셜 후기를 주제별로 모아봅니다.",
  alternates: { canonical: absoluteUrl("/topics") }
};

export default async function TopicsPage() {
  const communities = await getCommunities();
  return (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        <TopicExplore communities={communities} />
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
