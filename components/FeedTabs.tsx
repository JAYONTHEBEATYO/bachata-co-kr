import Link from "next/link";

const tabs = [
  { href: "#best-rail", label: "토픽 베스트" },
  { href: "#topic-explore", label: "주제 탐색" },
  { href: "/write?topic=academyReview", label: "아카데미 리뷰" },
  { href: "/write?topic=dancerReview", label: "댄서 리뷰" },
  { href: "/write?type=ama", label: "무물보" },
  { href: "/events", label: "행사 후기" }
];

export function FeedTabs() {
  return (
    <nav className="feed-tabs topic-menu-tabs" aria-label="홈 주제 메뉴">
      {tabs.map((tab, index) => (
        <Link key={tab.href} href={tab.href} aria-current={index === 0 ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
