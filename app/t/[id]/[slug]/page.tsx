import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveComments } from "@/components/LiveComments";
import { Sidebar } from "@/components/Sidebar";
import { ThreadActionBar } from "@/components/ThreadActionBar";
import { ThreadCard } from "@/components/ThreadCard";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getCommunities, getEvents, getRelatedThreads, getThread, getThreadComments, getThreads } from "@/lib/data";
import { absoluteUrl, youtubeThumb } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string; slug: string }>;
};

export async function generateStaticParams() {
  const threads = await getThreads("hot");
  return threads.map((thread) => ({ id: thread.id, slug: thread.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params;
  const thread = await getThread(id, slug);
  if (!thread) return {};
  const imageUrl = thread.imageUrl || (thread.videoId ? youtubeThumb(thread.videoId) : youtubeThumb("xhrdh-uFkog"));
  const description = `${thread.excerpt} 댓글과 반응은 바차타 코리아에서 이어집니다.`;

  return {
    title: thread.title,
    description,
    alternates: { canonical: absoluteUrl(`/t/${thread.id}/${thread.slug}`) },
    openGraph: {
      title: thread.title,
      description,
      type: "article",
      url: absoluteUrl(`/t/${thread.id}/${thread.slug}`),
      images: [{ url: imageUrl, width: 480, height: 360, alt: thread.title }]
    },
    twitter: {
      card: "summary_large_image",
      title: thread.title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function ThreadPage({ params }: PageProps) {
  const { id, slug } = await params;
  const thread = await getThread(id, slug);
  if (!thread) notFound();

  const [threadComments, related, communities, eventList, trending] = await Promise.all([
    getThreadComments(thread.id),
    getRelatedThreads(thread),
    getCommunities(),
    getEvents(),
    getThreads("hot")
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": absoluteUrl(`/t/${thread.id}/${thread.slug}`),
    headline: thread.title,
    articleBody: thread.body,
    datePublished: thread.createdAt,
    author: { "@type": "Person", name: thread.author },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: thread.upvotes },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: thread.commentCount }
    ],
    inLanguage: "ko-KR",
    url: absoluteUrl(`/t/${thread.id}/${thread.slug}`)
  };

  return (
    <main className="app-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="content-layout">
        <article className="thread-detail">
          <ThreadCard thread={thread} compact headingLevel={1} />
          <section className="detail-body">
            <p>{thread.body}</p>
            {thread.videoId ? <VideoEmbed videoId={thread.videoId} title={thread.title} /> : null}
            <ThreadActionBar
              score={thread.score}
              downvotes={thread.downvotes}
              commentHref="#comments-title"
              sharePath={`/t/${thread.id}/${thread.slug}`}
              shareTitle={thread.title}
              shareText={thread.excerpt}
              sourceLinks={thread.sourceLinks}
              threadId={thread.id}
            />
            <div className="source-box">
              <strong>같이 보면 좋은 링크</strong>
              <div className="source-links">
                {thread.sourceLinks.length ? thread.sourceLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                )) : <span>아직 연결된 외부 링크가 없습니다.</span>}
              </div>
            </div>
          </section>
          <LiveComments threadId={thread.id} initialComments={threadComments} />
          <section className="related">
            <h2>관련 쓰레드</h2>
            {related.map((item) => <ThreadCard key={item.id} thread={item} compact />)}
          </section>
        </article>
        <Sidebar communities={communities} events={eventList} trending={trending} />
      </div>
    </main>
  );
}
