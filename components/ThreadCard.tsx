import Link from "next/link";
import { ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { formatRelativeDate } from "@/lib/format";
import type { Thread } from "@/lib/types";
import { VideoEmbed } from "./VideoEmbed";
import { VoteRail } from "./VoteRail";

type ThreadCardProps = {
  thread: Thread;
  compact?: boolean;
  headingLevel?: 1 | 2;
};

export function ThreadCard({ thread, compact = false, headingLevel = 2 }: ThreadCardProps) {
  const href = `/t/${thread.id}/${thread.slug}`;

  return (
    <article className={thread.pinned ? "thread-card pinned" : "thread-card"}>
      <VoteRail score={thread.score} downvotes={thread.downvotes} />
      <div className="thread-body">
        <div className="thread-meta">
          <Link href={`/c/${thread.communitySlug}`}>r/{thread.communityName}</Link>
          <span>{thread.author}</span>
          <span>{formatRelativeDate(thread.createdAt)}</span>
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
        <div className="thread-actions">
          <Link href={href}><MessageCircle size={16} /> 댓글</Link>
          <button type="button"><Share2 size={16} /> 공유</button>
          {thread.sourceLinks.slice(0, 2).map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> {link.label}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
