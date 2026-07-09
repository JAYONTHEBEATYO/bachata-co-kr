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

const eventStories: Record<string, string[]> = {
  "k-sensual-summer-2026": [
    "K-Sensual Summer는 국내 바차타 씬에서 여름 시즌을 대표하는 일정으로 볼 만합니다. 워크숍, 소셜, Jack & Jill처럼 초보자와 경험자가 각자 다른 방식으로 즐길 수 있는 요소가 함께 묶입니다.",
    "처음 참가한다면 라인업보다 먼저 패스 범위와 타임테이블을 확인하세요. 워크숍을 들을지, 소셜 위주로 갈지에 따라 준비해야 하는 체력과 숙소 동선이 달라집니다.",
    "댓글에는 같이 가는 사람 찾기, 패스 정보, 현장 후기, 영상 링크를 남겨주세요. 행사가 가까워질수록 이 쓰레드가 참가자가 실제로 찾는 체크포인트가 되게 운영합니다."
  ],
  "seoul-bachata-festival-2026": [
    "Seoul Bachata Festival은 서울에서 바차타 워크숍과 소셜을 한 번에 경험하고 싶은 사람에게 먼저 확인할 만한 일정입니다. 국내에서 이동 부담이 비교적 적고, 수업과 파티를 같은 주말 흐름으로 볼 수 있다는 점이 큽니다.",
    "행사 페이지를 볼 때는 날짜, 장소, 패스 종류, 파티만 참여 가능한지부터 확인하면 좋습니다. 해외 아티스트가 포함된 경우에는 워크숍 레벨과 언어, 촬영 가능 여부도 체크해두면 현장에서 덜 헤맵니다.",
    "이 쓰레드는 공식 공지와 참가 후기를 모으는 공간입니다. 포스터만 보고 끝내지 말고, 실제로 다녀온 사람들의 댓글까지 같이 보면 행사 분위기를 훨씬 빨리 파악할 수 있습니다."
  ],
  "bachata-geneva-festival-2026": [
    "Bachata Geneva Festival은 해외 원정형 페스티벌을 고민할 때 참고하기 좋은 일정입니다. 항공권과 숙박이 함께 움직이기 때문에 국내 행사보다 확인해야 할 것이 많습니다.",
    "예매 전에는 날짜, 장소, 패스 범위, 환불 조건, 숙소와 행사장 거리부터 확인하세요. 라인업이 마음에 들어도 이동 동선이 무너지면 페스티벌 경험 전체가 피곤해질 수 있습니다.",
    "해외 행사 쓰레드는 참가 경험과 준비 팁이 쌓일수록 가치가 커집니다. 항공, 숙박, 패스, 현장 분위기를 댓글로 남기면 다음 사람이 훨씬 쉽게 판단할 수 있습니다."
  ]
};

const getEventStory = (id: string, title: string, city: string) =>
  eventStories[id] || [
    `${title}은 ${city}에서 바차타를 직접 경험할 수 있는 일정입니다. 포스터만 보고 넘기기보다 날짜, 장소, 패스 범위, 소셜 여부를 함께 확인하면 실제 참가 판단이 쉬워집니다.`,
    "공식 링크에서 마지막 공지를 다시 확인하고, 댓글에는 참가 후기나 동행 찾기, 현장 팁을 남겨주세요. 행사가 가까워질수록 이 페이지가 날짜, 패스, 현장 분위기를 모으는 쓰레드가 됩니다."
  ];

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
  const story = getEventStory(event.id, event.title, event.city);

  return (
    <main className="app-shell narrow">
      <article className="detail-article">
        <img className="detail-poster" src={event.posterUrl} alt={`${event.title} 대표 이미지`} />
        <section className="detail-body">
          <span className="flair">{event.region === "domestic" ? "페스티벌" : "해외페스티벌"}</span>
          <h1>{event.title}</h1>
          <p>{event.excerpt}</p>
          <div className="event-story">
            {story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className="event-meta">
            <span><CalendarDays size={15} /> {event.dateLabel}</span>
            <span><MapPin size={15} /> {event.city}</span>
            <span><MapPin size={15} /> {event.venue}</span>
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
            threadId={`event-${event.id}`}
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
