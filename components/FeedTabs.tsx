import Link from "next/link";
import type { SortMode } from "@/lib/types";

const tabs: { mode: SortMode; label: string }[] = [
  { mode: "hot", label: "인기" },
  { mode: "new", label: "최신" },
  { mode: "top", label: "베스트" },
  { mode: "rising", label: "상승" }
];

export function FeedTabs({ active }: { active: SortMode }) {
  return (
    <nav className="feed-tabs" aria-label="피드 정렬">
      {tabs.map((tab) => (
        <Link key={tab.mode} href={`/?sort=${tab.mode}`} aria-current={active === tab.mode ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
