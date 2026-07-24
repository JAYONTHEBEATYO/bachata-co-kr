import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { AppNavigation } from "@/components/AppNavigation";
import { CommunityIcon } from "@/components/CommunityIcon";
import { FeedTabs } from "@/components/FeedTabs";
import { LiveThreadList } from "@/components/LiveThreadList";
import { QuickComposer } from "@/components/QuickComposer";
import { Sidebar } from "@/components/Sidebar";
import { getCommunities } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";
import { getServerFeedThreads } from "@/lib/seo-threads";

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
  const initialThreads = await getServerFeedThreads({ category: community.category, sort });

  return (
    <main className="app-shell">
      <div className="app-grid">
        <AppNavigation communities={communities} />
        <section className="feed-column">
          <header className="community-head" style={{ "--topic-color": community.color } as CSSProperties}>
            <CommunityIcon category={community.category} color={community.color} size={24} />
            <div>
              <span className="section-kicker">BOARD</span>
              <h1>{community.name}</h1>
              <p>{community.description}</p>
            </div>
            <Link className="secondary-button" href={`/write?topic=${community.category}`}>새 글</Link>
          </header>
          <QuickComposer topic={community.category} />
          <FeedTabs sort={sort} basePath={`/c/${community.slug}`} />
          <LiveThreadList
            category={community.category}
            sort={sort}
            initialThreads={initialThreads}
            emptyCopy={`${community.name}에 아직 글이 없습니다. 첫 이야기를 남겨보세요.`}
          />
        </section>
        <Sidebar communities={communities} />
      </div>
    </main>
  );
}
