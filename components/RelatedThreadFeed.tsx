import Link from "next/link";
import { ArrowUp, Clapperboard, Link2, MessageCircle } from "lucide-react";
import { communityThreadPath } from "@/lib/community-api";
import { communityByCategory } from "@/lib/communities";
import { formatRelativeDate } from "@/lib/format";
import { extractThreadMedia } from "@/lib/thread-media";
import type { GuestThread } from "@/lib/types";
import { CommunityIcon } from "./CommunityIcon";

export function RelatedThreadFeed({ threads }: { threads: GuestThread[] }) {
  if (!threads.length) return null;

  return (
    <section className="related-thread-feed" aria-labelledby="related-thread-title">
      <header className="related-thread-head">
        <h2 id="related-thread-title">이어서 볼 글</h2>
        <Link href="/">전체 피드</Link>
      </header>
      <div className="related-thread-list">
        {threads.map((thread) => (
          <RelatedThreadPreview key={thread.id} thread={thread} />
        ))}
      </div>
    </section>
  );
}

function RelatedThreadPreview({ thread }: { thread: GuestThread }) {
  const parsed = extractThreadMedia(thread.body, thread.linkUrl);
  const bodyText = parsed.text || thread.body;
  const media = parsed.media[0];
  const community = communityByCategory(thread.category);
  const accent = community?.color || "#ff4f3f";

  return (
    <article className="related-thread-preview">
      <Link className="related-thread-link" href={communityThreadPath(thread.id)}>
        <div className="related-thread-copy">
          <div className="related-thread-meta">
            <CommunityIcon category={thread.category} color={accent} size={14} />
            <strong>{community?.name || "바차타"}</strong>
            <span>· {formatRelativeDate(thread.createdAt)}</span>
          </div>
          <h3>{thread.title}</h3>
          {bodyText ? <p>{bodyText}</p> : null}
          <div className="related-thread-stats" aria-label={`추천 ${thread.score}, 댓글 ${thread.commentCount}`}>
            <span><ArrowUp size={13} /> {thread.score}</span>
            <span><MessageCircle size={13} /> {thread.commentCount}</span>
          </div>
        </div>
        {media || thread.linkUrl ? (
          <div className="related-thread-media" aria-hidden="true">
            {media?.type === "image" ? (
              <img src={media.url} alt="" loading="lazy" />
            ) : media?.type === "video" || media?.type === "stream" ? (
              <Clapperboard size={23} />
            ) : (
              <Link2 size={22} />
            )}
          </div>
        ) : null}
      </Link>
    </article>
  );
}
