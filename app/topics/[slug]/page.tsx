import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { absoluteUrl } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const topicPages = {
  "academy-review": {
    title: "아카데미 리뷰",
    category: "academyReview",
    activeHref: "/topics/academy-review",
    description: "학원, 동호회, 팀 수업 후기를 토픽으로 모아봅니다.",
    subtopics: ["라틴씨엘로", "센슈얼랩", "에버라틴", "라스트댄스", "엔수에뇨", "바차타인플루언스코리아", "오살사"]
  },
  "dancer-review": {
    title: "댄서 리뷰",
    category: "dancerReview",
    activeHref: "/topics/dancer-review",
    description: "부트캠프, 워크숍, 마스터클래스, 소셜댄스 후기를 추천순으로 모읍니다.",
    subtopics: ["멜빈", "가티카", "헤로", "미글레", "그레이", "로렌", "소라", "원궁"]
  },
  "social-review": {
    title: "소셜 후기",
    category: "socialReview",
    activeHref: "/topics",
    description: "강남, 홍대, 인천, 지방, 제주까지 플로어 후기를 장소별로 남깁니다.",
    subtopics: ["강남 라틴바", "홍대 보니따", "인천", "부산", "대구", "제주", "지방 원정"]
  },
  events: {
    title: "국내외 행사",
    category: "events",
    activeHref: "/topics",
    description: "국내 행사, 해외 페스티벌, 워크숍, 행사 후기와 양도/패스 글을 모읍니다.",
    subtopics: ["국내 행사", "해외 행사", "행사 후기", "워크숍", "양도/패스"]
  }
} as const;

export function generateStaticParams() {
  return Object.keys(topicPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = topicPages[slug as keyof typeof topicPages];
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: absoluteUrl(`/topics/${slug}`) }
  };
}

export default async function TopicFeedPage({ params }: PageProps) {
  const { slug } = await params;
  const page = topicPages[slug as keyof typeof topicPages];
  if (!page) notFound();

  return (
    <main className="app-shell">
      <section className="feed-column">
        <FeedTabs activeHref={page.activeHref} />
        <section className="page-head compact-head">
          <span className="eyebrow">주제 피드</span>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
          <div className="topic-chip-row">
            {page.subtopics.map((subtopic) => <em key={subtopic}>{subtopic}</em>)}
          </div>
          <Link className="primary-link" href={`/write?topic=${page.category}`}>이 주제로 글쓰기</Link>
        </section>
        <LiveThreadList
          category={page.category}
          sort="hot"
          emptyCopy={`${page.title} 토픽이 아직 없습니다. 첫 글을 남겨주세요.`}
        />
      </section>
    </main>
  );
}
