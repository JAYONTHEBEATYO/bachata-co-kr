import { ArrowBigUp, MessageCircle } from "lucide-react";
import { formatRelativeDate } from "@/lib/format";
import type { Comment } from "@/lib/types";

export function CommentTree({ comments }: { comments: Comment[] }) {
  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">댓글</h2>
      {comments.length ? comments.map((comment) => <CommentNode key={comment.id} comment={comment} />) : (
        <p className="empty-copy">아직 댓글이 없습니다. 궁금한 점이나 경험을 편하게 남겨보세요.</p>
      )}
    </section>
  );
}

function CommentNode({ comment }: { comment: Comment }) {
  return (
    <article className="comment">
      <div className="comment-score"><ArrowBigUp size={16} /> {comment.score}</div>
      <div>
        <div className="comment-meta">
          <strong>{comment.author}</strong>
          <span>{formatRelativeDate(comment.createdAt)}</span>
        </div>
        <p>{comment.body}</p>
        <button type="button"><MessageCircle size={15} /> 답글</button>
        {comment.replies?.length ? (
          <div className="comment-replies">
            {comment.replies.map((reply) => <CommentNode key={reply.id} comment={reply} />)}
          </div>
        ) : null}
      </div>
    </article>
  );
}
