import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ThreadCard } from "@/components/ThreadCard";
import { getCommunities, getEvents, getThreads } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const communities = await getCommunities();
  return communities.map((community) => ({ slug: community.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const communities = await getCommunities();
  const community = communities.find((item) => item.slug === slug);
  if (!community) return {};

  return {
    title: `r/${community.name}`,
    description: community.description,
    alternates: { canonical: absoluteUrl(`/c/${community.slug}`) }
  };
}

export default async function CommunityPage({ params }: PageProps) {
  const { slug } = await params;
  const [communities, eventList, feed, trending] = await Promise.all([
    getCommunities(),
    getEvents(),
    getThreads("hot", slug),
    getThreads("hot")
  ]);
  const community = communities.find((item) => item.slug === slug);
  if (!community) notFound();

  return (
    <main className="app-shell">
      <section className="community-hero" style={{ borderColor: community.color }}>
        <span className="community-dot" style={{ backgroundColor: community.color }} />
        <div>
          <span className="eyebrow">r/{community.name}</span>
          <h1>{community.name}</h1>
          <p>{community.description}</p>
        </div>
      </section>
      <div className="content-layout">
        <section className="feed-column">
          <div className="thread-list">
            {feed.length ? feed.map((thread) => <ThreadCard key={thread.id} thread={thread} />) : (
              <div className="empty-state">아직 이 채널에 공개된 글이 없습니다.</div>
            )}
          </div>
        </section>
        <Sidebar communities={communities} events={eventList} trending={trending} />
      </div>
    </main>
  );
}
