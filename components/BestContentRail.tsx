import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { youtubeThumb } from "@/lib/format";
import type { Thread } from "@/lib/types";

type BestContentRailProps = {
  threads: Thread[];
};

export function BestContentRail({ threads }: BestContentRailProps) {
  const bestThreads = threads
    .slice()
    .sort((a, b) => b.score + b.commentCount * 3 - (a.score + a.commentCount * 3))
    .slice(0, 3);

  return (
    <section className="best-rail" id="best-rail" aria-labelledby="best-rail-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">토픽 베스트</span>
          <h2 id="best-rail-title">지금 먼저 눌러볼 만한 글</h2>
        </div>
        <Link href="/?sort=top">베스트 더보기</Link>
      </div>
      <div className="best-grid">
        {bestThreads.map((thread, index) => {
          const href = `/t/${thread.id}/${thread.slug}`;
          const imageUrl = thread.imageUrl || (thread.videoId ? youtubeThumb(thread.videoId) : "");

          return (
            <article key={thread.id} className="best-card">
              <Link href={href}>
                {imageUrl ? <img src={imageUrl} alt={`${thread.title} 썸네일`} /> : <span className="best-rank">{index + 1}</span>}
                <div>
                  <span className="best-meta"><TrendingUp size={15} /> {thread.flair}</span>
                  <h3>{thread.title}</h3>
                  <p>{thread.excerpt}</p>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
