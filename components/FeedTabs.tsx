import Link from "next/link";
import { Clock3, Flame, TrendingUp } from "lucide-react";

const tabs = [
  { value: "hot", label: "인기", icon: Flame },
  { value: "new", label: "최신", icon: Clock3 },
  { value: "top", label: "추천", icon: TrendingUp }
] as const;

export function FeedTabs({ sort = "hot", basePath = "/" }: { sort?: "hot" | "new" | "top"; basePath?: string }) {
  return (
    <nav className="feed-tabs" aria-label="글 정렬">
      <span className="feed-tabs-label">피드 정렬</span>
      <div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.value}
              href={tab.value === "hot" ? basePath : `${basePath}?sort=${tab.value}`}
              aria-current={sort === tab.value ? "page" : undefined}
            >
              <Icon size={16} />{tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
