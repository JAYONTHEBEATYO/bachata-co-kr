import { Award, MessageCircle } from "lucide-react";
import { absoluteUrl } from "@/lib/format";
import type { SourceLink } from "@/lib/types";
import { ShareButton } from "./ShareButton";
import { VoteRail } from "./VoteRail";

type ThreadActionBarProps = {
  score: number;
  downvotes?: number;
  commentHref?: string;
  sharePath: string;
  shareTitle: string;
  shareText?: string;
  sourceLinks?: SourceLink[];
  showAward?: boolean;
};

export function ThreadActionBar({
  score,
  downvotes = 0,
  commentHref,
  sharePath,
  shareTitle,
  shareText,
  sourceLinks = [],
  showAward = true
}: ThreadActionBarProps) {
  const shareUrl = sharePath.startsWith("http") ? sharePath : absoluteUrl(sharePath);

  return (
    <div className="thread-actions">
      <VoteRail score={score} downvotes={downvotes} />
      {showAward ? (
        <button
          type="button"
          className="award-button"
          title="어워드는 정성 들인 후기나 가이드에 감사 배지를 남기는 기능입니다. 지금은 포인트나 결제 없이 반응 표시로만 둡니다."
        >
          <Award size={16} />
          어워드
        </button>
      ) : null}
      {commentHref ? <a href={commentHref}><MessageCircle size={16} /> 댓글</a> : null}
      <ShareButton url={shareUrl} title={shareTitle} text={shareText} />
      {sourceLinks.slice(0, 2).map((link) => (
        <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
      ))}
    </div>
  );
}
