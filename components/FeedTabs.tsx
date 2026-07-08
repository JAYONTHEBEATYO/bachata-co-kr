import Link from "next/link";
import type { SortMode } from "@/lib/types";

const tabs: { mode: SortMode; label: string }[] = [
  { mode: "hot", label: "Hot" },
  { mode: "new", label: "New" },
  { mode: "top", label: "Top" },
  { mode: "rising", label: "Rising" }
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
