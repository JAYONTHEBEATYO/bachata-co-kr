import Link from "next/link";
import { ArrowUpRight, PenLine } from "lucide-react";
import type { Community } from "@/lib/types";
import { CommunityIcon } from "./CommunityIcon";

export function Sidebar({ communities }: { communities: Community[] }) {
  const featured = communities.filter((community) => ["questions", "video", "events", "social-review"].includes(community.slug));

  return (
    <aside className="right-rail">
      <section className="rail-brand-panel">
        <div className="rail-brand-top">
          <span>BACHATA</span>
          <span>SEOUL · KOREA</span>
        </div>
        <div className="rail-rhythm" aria-hidden="true">
          <b>1</b><b>2</b><b>3</b><b>4</b><i /><b>5</b><b>6</b><b>7</b><b>8</b>
        </div>
        <h2>춤추고, 보고,<br />이야기하는 곳.</h2>
        <Link className="rail-write" href="/write"><PenLine size={17} />새 글 쓰기</Link>
      </section>

      <section className="rail-section">
        <div className="rail-section-head">
          <h2>바로 둘러보기</h2>
          <Link href="/topics" aria-label="모든 주제 보기"><ArrowUpRight size={17} /></Link>
        </div>
        <nav className="rail-topic-list" aria-label="추천 주제">
          {featured.map((community) => (
            <Link key={community.slug} href={`/c/${community.slug}`}>
              <CommunityIcon category={community.category} color={community.color} size={16} />
              <span>
                <strong>{community.name}</strong>
                <small>{community.description}</small>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <p className="rail-footer">BACHATA.KR · COMMUNITY</p>
    </aside>
  );
}
