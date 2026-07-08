import { ArrowBigDown, ArrowBigUp } from "lucide-react";

type VoteRailProps = {
  score: number;
  downvotes?: number;
};

export function VoteRail({ score, downvotes = 0 }: VoteRailProps) {
  return (
    <aside className="vote-rail" aria-label="추천 점수">
      <button type="button" aria-label="추천">
        <ArrowBigUp size={24} />
      </button>
      <strong>{score}</strong>
      <button type="button" aria-label="비추천">
        <ArrowBigDown size={24} />
      </button>
      <span>{downvotes}</span>
    </aside>
  );
}
