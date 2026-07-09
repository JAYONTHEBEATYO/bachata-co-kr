import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveComments } from "@/components/LiveComments";
import { ThreadActionBar } from "@/components/ThreadActionBar";
import { VideoEmbed } from "@/components/VideoEmbed";
import { getDancers } from "@/lib/data";
import { absoluteUrl, youtubeThumb, youtubeWatch } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const dancers = await getDancers();
  return dancers.map((dancer) => ({ id: dancer.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const dancer = (await getDancers()).find((item) => item.id === id);
  if (!dancer) return {};

  const imageUrl = youtubeThumb(dancer.videoId);
  const description = `${dancer.excerpt} 영상과 댓글은 바차타 코리아에서 이어집니다.`;

  return {
    title: dancer.name,
    description,
    alternates: { canonical: absoluteUrl(`/dancers/${dancer.id}`) },
    openGraph: {
      title: dancer.name,
      description,
      url: absoluteUrl(`/dancers/${dancer.id}`),
      type: "article",
      images: [{ url: imageUrl, width: 480, height: 360, alt: dancer.name }]
    },
    twitter: {
      card: "summary_large_image",
      title: dancer.name,
      description,
      images: [imageUrl]
    }
  };
}

export default async function DancerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const dancer = (await getDancers()).find((item) => item.id === id);
  if (!dancer) notFound();

  return (
    <main className="app-shell narrow">
      <article className="detail-article">
        <section className="detail-body">
          <span className="flair">{dancer.role}</span>
          <h1>{dancer.name}</h1>
          <p>{dancer.excerpt}</p>
          <VideoEmbed videoId={dancer.videoId} title={dancer.name} />
          <div className="tag-row">
            {dancer.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
          <ThreadActionBar
            score={0}
            commentHref="#comments-title"
            sharePath={`/dancers/${dancer.id}`}
            shareTitle={dancer.name}
            shareText={dancer.excerpt}
            sourceLinks={[{ label: "영상 원문", url: youtubeWatch(dancer.videoId) }]}
          />
        </section>
        <LiveComments threadId={`dancer-${dancer.id}`} initialComments={[]} />
      </article>
    </main>
  );
}
