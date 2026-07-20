import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { Community } from "@/lib/types";
import { CommunityIcon } from "./CommunityIcon";

export function TopicExplore({ communities }: { communities: Community[] }) {
  return (
    <section className="topic-explore" aria-labelledby="topics-title">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">EXPLORE</span>
          <h1 id="topics-title">주제 찾기</h1>
          <p>지금 궁금한 이야기부터 골라보세요.</p>
        </div>
      </div>
      <div className="topic-grid">
        {communities.map((community) => (
          <Link key={community.slug} className="topic-tile" href={`/c/${community.slug}`} style={{ "--topic-color": community.color } as CSSProperties}>
            <CommunityIcon category={community.category} color={community.color} size={21} />
            <span className="topic-copy">
              <strong>{community.name}</strong>
              <small>{community.description}</small>
            </span>
            <ArrowUpRight size={19} />
          </Link>
        ))}
      </div>
    </section>
  );
}
