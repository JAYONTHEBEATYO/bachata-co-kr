import { ArrowBigDown, ArrowBigUp } from "lucide-react";

type VoteRailProps = {
  score: number;
  downvotes?: number;
};

export function VoteRail({ score, downvotes = 0 }: VoteRailProps) {
  return (
    <div className="vote-rail" aria-label="추천과 비추천">
      <button type="button" aria-label="추천">
        <ArrowBigUp size={22} />
      </button>
      <strong>{score}</strong>
      <button type="button" aria-label="비추천">
        <ArrowBigDown size={22} />
      </button>
      {downvotes ? <em>{downvotes}</em> : null}
    </div>
  );
}
