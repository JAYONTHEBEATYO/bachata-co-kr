import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { getEvents } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "바차타 행사",
  description: "국내 바차타 페스티벌과 해외페스티벌, 워크숍·소셜 일정을 놓치지 않게 모았습니다.",
  alternates: { canonical: absoluteUrl("/events") }
};

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <main className="app-shell">
      <section className="page-head">
        <span className="eyebrow">Festival Board</span>
        <h1>페스티벌과 워크숍, 한 번에 보기</h1>
        <p>국내 일정과 해외페스티벌을 같은 기준으로 봅니다. 날짜, 장소, 패스 범위는 공식 링크에서 다시 확인하세요.</p>
      </section>
      <section className="event-grid">
        {events.map((event) => (
          <article key={event.id} className="event-card">
            <Link href={`/events/${event.id}`} aria-label={`${event.title} 상세 보기`}>
              <img src={event.posterUrl} alt={`${event.title} 대표 이미지`} />
            </Link>
            <div>
              <span className="flair">{event.region === "domestic" ? "페스티벌" : "해외페스티벌"}</span>
              <h2><Link href={`/events/${event.id}`}>{event.title}</Link></h2>
              <p>{event.excerpt}</p>
              <div className="event-meta">
                <span><CalendarDays size={15} /> {event.dateLabel}</span>
                <span><MapPin size={15} /> {event.city}</span>
              </div>
              <div className="tag-row">
                {event.tags.map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
              <div className="card-actions">
                <Link className="primary-link" href={`/events/${event.id}`}>상세 쓰레드</Link>
                <a className="thread-action-pill" href={event.sourceUrl} target="_blank" rel="noreferrer">
                  공식 링크 <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
