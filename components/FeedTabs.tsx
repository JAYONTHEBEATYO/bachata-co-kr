import Link from "next/link";

const tabs = [
  { href: "/", label: "토픽 베스트" },
  { href: "/topics", label: "주제 탐색" },
  { href: "/topics/academy-review", label: "아카데미 리뷰" },
  { href: "/topics/dancer-review", label: "댄서 리뷰" }
];

export function FeedTabs({ activeHref = "/" }: { activeHref?: string }) {
  return (
    <nav className="feed-tabs topic-menu-tabs" aria-label="홈 주제 메뉴">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={tab.href === activeHref ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
