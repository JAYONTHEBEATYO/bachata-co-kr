import Link from "next/link";
import type { Community } from "@/lib/types";
import { CommunityIcon } from "./CommunityIcon";

export function TopicRibbon({ communities }: { communities: Community[] }) {
  return (
    <nav className="topic-ribbon" aria-label="주제 바로가기">
      {communities.map((community) => (
        <Link key={community.slug} href={`/c/${community.slug}`}>
          <CommunityIcon category={community.category} color={community.color} size={17} />
          <span>{community.name}</span>
        </Link>
      ))}
    </nav>
  );
}
