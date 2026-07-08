import Link from "next/link";
import { CalendarDays, ChevronRight, Users } from "lucide-react";
import type { Community, EventCard, Thread } from "@/lib/types";

type SidebarProps = {
  communities: Community[];
  events: EventCard[];
  trending: Thread[];
};

export function Sidebar({ communities, events, trending }: SidebarProps) {
  return (
    <aside className="right-rail">
      <section className="rail-panel">
        <div className="rail-title"><Users size={18} /> 커뮤니티</div>
        <div className="community-list">
          {communities.map((community) => (
            <Link key={community.slug} href={`/c/${community.slug}`}>
              <span style={{ backgroundColor: community.color }} />
              <strong>r/{community.name}</strong>
              <em>{community.memberCount.toLocaleString()}명</em>
            </Link>
          ))}
        </div>
      </section>
      <section className="rail-panel">
        <div className="rail-title"><CalendarDays size={18} /> 곧 볼 행사</div>
        <div className="event-mini-list">
          {events.map((event) => (
            <a key={event.id} href={event.sourceUrl} target="_blank" rel="noreferrer">
              <img src={event.posterUrl} alt="" />
              <span>
                <strong>{event.title}</strong>
                <em>{event.dateLabel} · {event.city}</em>
              </span>
            </a>
          ))}
        </div>
      </section>
      <section className="rail-panel">
        <div className="rail-title">오늘 뜨는 글</div>
        <ol className="trend-list">
          {trending.slice(0, 5).map((thread) => (
            <li key={thread.id}>
              <Link href={`/t/${thread.id}/${thread.slug}`}>
                <span>{thread.flair}</span>
                {thread.title}
                <ChevronRight size={15} />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
