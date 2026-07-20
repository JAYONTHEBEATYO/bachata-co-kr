import Link from "next/link";
import { ChevronRight, PenSquare } from "lucide-react";
import type { Community } from "@/lib/types";

export function Sidebar({ communities }: { communities: Community[] }) {
  return (
    <aside className="right-rail">
      <section className="rail-panel community-panel">
        <div className="community-cover" />
        <div className="community-panel-body">
          <h2>바차타 코리아</h2>
          <p>바차타를 좋아하는 사람들이 글과 댓글로 만나는 공간입니다.</p>
          <Link className="primary-button" href="/write"><PenSquare size={17} />글쓰기</Link>
        </div>
      </section>
      <section className="rail-panel">
        <h2>주제</h2>
        <nav className="community-list" aria-label="주제 목록">
          {communities.map((community) => (
            <Link key={community.slug} href={`/c/${community.slug}`}>
              <span className="community-dot" style={{ backgroundColor: community.color }} />
              <strong>{community.name}</strong>
              <ChevronRight size={16} />
            </Link>
          ))}
        </nav>
      </section>
    </aside>
  );
}
