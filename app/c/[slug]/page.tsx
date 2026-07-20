import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { Sidebar } from "@/components/Sidebar";
import { getCommunities } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateStaticParams() {
  const communities = await getCommunities();
  return communities.map((community) => ({ slug: community.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const community = (await getCommunities()).find((item) => item.slug === slug);
  if (!community) return {};
  return {
    title: community.name,
    description: community.description,
    alternates: { canonical: absoluteUrl(`/c/${community.slug}`) }
  };
}

export default async function CommunityPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { sort: requestedSort } = await searchParams;
  const communities = await getCommunities();
  const community = communities.find((item) => item.slug === slug);
  if (!community) notFound();
  const sort = requestedSort === "new" || requestedSort === "top" ? requestedSort : "hot";

  return (
    <main className="app-shell">
      <div className="content-layout">
        <section className="feed-column">
          <header className="community-head">
            <span className="topic-avatar" style={{ backgroundColor: community.color }}>{community.name.slice(0, 1)}</span>
            <div>
              <h1>{community.name}</h1>
              <p>{community.description}</p>
            </div>
            <Link className="secondary-button" href={`/write?topic=${community.category}`}>글쓰기</Link>
          </header>
          <FeedTabs sort={sort} basePath={`/c/${community.slug}`} />
          <LiveThreadList
            category={community.category}
            sort={sort}
            emptyCopy={`${community.name}에 아직 글이 없습니다. 첫 이야기를 남겨보세요.`}
          />
        </section>
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
