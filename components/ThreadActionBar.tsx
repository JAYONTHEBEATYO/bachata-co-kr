import { MessageCircle } from "lucide-react";
import { absoluteUrl } from "@/lib/format";
import { sharePreviewUrl } from "@/lib/share-meta";
import type { SourceLink } from "@/lib/types";
import { AwardPicker } from "./AwardPicker";
import { ShareButton } from "./ShareButton";
import { VoteRail } from "./VoteRail";

type ThreadActionBarProps = {
  score: number;
  downvotes?: number;
  voteTargetId: string;
  voteTargetType?: "thread" | "guestThread";
  commentHref?: string;
  sharePath: string;
  shareTitle: string;
  shareText?: string;
  sourceLinks?: SourceLink[];
  showAward?: boolean;
  threadId?: string;
};

export function ThreadActionBar({
  score,
  downvotes = 0,
  voteTargetId,
  voteTargetType = "thread",
  commentHref,
  sharePath,
  shareTitle,
  shareText,
  sourceLinks = [],
  showAward = true,
  threadId
}: ThreadActionBarProps) {
  const shareUrl = sharePath.startsWith("http") ? sharePath : absoluteUrl(sharePath);
  const cacheFreshShareUrl = sharePreviewUrl(shareUrl);

  return (
    <div className="thread-actions">
      <VoteRail targetId={voteTargetId} targetType={voteTargetType} score={score} downvotes={downvotes} />
      {showAward && threadId ? <AwardPicker threadId={threadId} /> : null}
      {commentHref ? <a href={commentHref}><MessageCircle size={16} /> 댓글</a> : null}
      <ShareButton url={cacheFreshShareUrl} title={shareTitle} text={shareText} />
      {sourceLinks.slice(0, 2).map((link) => (
        <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
      ))}
    </div>
  );
}
