import Link from "next/link";
import type { Thread } from "@/lib/types";
import { RelativeTime } from "./RelativeTime";
import { ThreadActionBar } from "./ThreadActionBar";
import { VideoEmbed } from "./VideoEmbed";

type ThreadCardProps = {
  thread: Thread;
  compact?: boolean;
  headingLevel?: 1 | 2;
};

export function ThreadCard({ thread, compact = false, headingLevel = 2 }: ThreadCardProps) {
  const href = `/t/${thread.id}/${thread.slug}`;

  return (
    <article className={thread.pinned ? "thread-card pinned" : "thread-card"}>
      <div className="thread-body">
        <div className="thread-meta">
          <Link href={`/c/${thread.communitySlug}`}>주제 · {thread.communityName}</Link>
          <span>{thread.author}</span>
          <RelativeTime value={thread.createdAt} />
          <span className="flair">{thread.flair}</span>
        </div>
        {headingLevel === 1 ? (
          <h1><Link href={href}>{thread.title}</Link></h1>
        ) : (
          <h2><Link href={href}>{thread.title}</Link></h2>
        )}
        <p>{thread.excerpt}</p>
        {!compact && thread.videoId ? <VideoEmbed videoId={thread.videoId} title={thread.title} compact /> : null}
        <div className="tag-row">
          {thread.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
        <ThreadActionBar
          score={thread.score}
          downvotes={thread.downvotes}
          voteTargetId={thread.id}
          voteTargetType="thread"
          commentHref={href}
          sharePath={href}
          shareTitle={thread.title}
          shareText={thread.excerpt}
          sourceLinks={thread.sourceLinks}
          showAward={false}
        />
      </div>
    </article>
  );
}
