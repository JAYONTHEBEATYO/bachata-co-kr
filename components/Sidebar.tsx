import Link from "next/link";
import { CalendarDays, ChevronRight, Compass } from "lucide-react";
import type { Community, EventCard, Thread } from "@/lib/types";
import { EventVisual } from "./EventVisual";

type SidebarProps = {
  communities: Community[];
  events: EventCard[];
  trending: Thread[];
};

export function Sidebar({ communities, events, trending }: SidebarProps) {
  const upcomingEvents = events
    .filter((event) => new Date(event.startsAt).getTime() >= Date.now() - 24 * 60 * 60_000)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  return (
    <aside className="right-rail">
      <section className="rail-panel">
        <div className="rail-title"><Compass size={18} /> 주제 바로가기</div>
        <div className="community-list">
          {communities.map((community) => (
            <Link key={community.slug} href={`/c/${community.slug}`}>
              <span style={{ backgroundColor: community.color }} />
              <strong>{community.name}</strong>
              <em>{community.description}</em>
            </Link>
          ))}
        </div>
      </section>
      <section className="rail-panel">
        <div className="rail-title"><CalendarDays size={18} /> 곧 볼 행사</div>
        <div className="event-mini-list">
          {upcomingEvents.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <EventVisual event={event} compact />
              <span>
                <strong>{event.title}</strong>
                <em>{event.dateLabel} · {event.city}</em>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="rail-panel">
        <div className="rail-title">에디터 추천</div>
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
