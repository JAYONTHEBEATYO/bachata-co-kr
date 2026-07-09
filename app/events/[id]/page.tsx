import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { LiveComments } from "@/components/LiveComments";
import { ThreadActionBar } from "@/components/ThreadActionBar";
import { getEvents } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((event) => ({ id: event.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = (await getEvents()).find((item) => item.id === id);
  if (!event) return {};

  const description = `${event.dateLabel} ${event.city}. ${event.excerpt} 댓글과 업데이트는 바차타 코리아에서 이어집니다.`;

  return {
    title: event.title,
    description,
    alternates: { canonical: absoluteUrl(`/events/${event.id}`) },
    openGraph: {
      title: event.title,
      description,
      url: absoluteUrl(`/events/${event.id}`),
      type: "article",
      images: [{ url: event.posterUrl, width: 480, height: 360, alt: event.title }]
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [event.posterUrl]
    }
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = (await getEvents()).find((item) => item.id === id);
  if (!event) notFound();

  return (
    <main className="app-shell narrow">
      <article className="detail-article">
        <img className="detail-poster" src={event.posterUrl} alt={`${event.title} 대표 이미지`} />
        <section className="detail-body">
          <span className="flair">{event.region === "domestic" ? "페스티벌" : "해외페스티벌"}</span>
          <h1>{event.title}</h1>
          <p>{event.excerpt}</p>
          <div className="event-meta">
            <span><CalendarDays size={15} /> {event.dateLabel}</span>
            <span><MapPin size={15} /> {event.city}</span>
          </div>
          <div className="tag-row">
            {event.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
          <ThreadActionBar
            score={0}
            commentHref="#comments-title"
            sharePath={`/events/${event.id}`}
            shareTitle={event.title}
            shareText={event.excerpt}
            sourceLinks={[{ label: "공식 링크", url: event.sourceUrl }]}
          />
          <a className="primary-link" href={event.sourceUrl} target="_blank" rel="noreferrer">
            공식 링크 열기 <ExternalLink size={16} />
          </a>
        </section>
        <LiveComments threadId={`event-${event.id}`} initialComments={[]} />
      </article>
    </main>
  );
}
