import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Community } from "@/lib/types";

export function TopicExplore({ communities }: { communities: Community[] }) {
  return (
    <section className="topic-explore" aria-labelledby="topics-title">
      <div className="page-title-row">
        <div>
          <h1 id="topics-title">주제 탐색</h1>
          <p>관심 있는 주제의 글만 모아볼 수 있습니다.</p>
        </div>
      </div>
      <div className="topic-list">
        {communities.map((community) => (
          <Link key={community.slug} className="topic-row" href={`/c/${community.slug}`}>
            <span className="topic-avatar" style={{ backgroundColor: community.color }}>
              {community.name.slice(0, 1)}
            </span>
            <span className="topic-copy">
              <strong>{community.name}</strong>
              <small>{community.description}</small>
            </span>
            <ChevronRight size={19} />
          </Link>
        ))}
      </div>
    </section>
  );
}
