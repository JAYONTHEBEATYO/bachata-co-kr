"use client";

import { useEffect, useState } from "react";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { communityApiUrl } from "@/lib/community-api";

type VoteTargetType = "thread" | "guestThread";

type VoteRailProps = {
  targetId: string;
  targetType?: VoteTargetType;
  score: number;
  downvotes?: number;
};

const votesApiUrl = () => communityApiUrl("/api/votes/");

export function VoteRail({ targetId, targetType = "thread", score, downvotes = 0 }: VoteRailProps) {
  const [currentScore, setCurrentScore] = useState(score);
  const [currentDownvotes, setCurrentDownvotes] = useState(downvotes);
  const [userVote, setUserVote] = useState(0);
  const [pending, setPending] = useState<"up" | "down" | "">("");

  useEffect(() => {
    setCurrentScore(score);
    setCurrentDownvotes(downvotes);
  }, [score, downvotes]);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({ targetId, targetType });
        const response = await fetch(`${votesApiUrl()}?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { score?: number; downvotes?: number; hasTotals?: boolean; userVote?: number };
        if (cancelled) return;
        if (data.hasTotals && typeof data.score === "number") setCurrentScore(data.score);
        if (data.hasTotals && typeof data.downvotes === "number") setCurrentDownvotes(data.downvotes);
        setUserVote(Number(data.userVote || 0));
      } catch {
        // Voting is progressive enhancement; keep the visible fallback score.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [targetId, targetType]);

  const vote = async (direction: "up" | "down") => {
    setPending(direction);
    try {
      const response = await fetch(votesApiUrl(), {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          targetId,
          targetType,
          direction,
          initialScore: score,
          initialDownvotes: downvotes
        })
      });
      const data = await response.json() as {
        score?: number;
        downvotes?: number;
        userVote?: number;
      };
      if (!response.ok) return;
      setCurrentScore(Number(data.score || 0));
      setCurrentDownvotes(Number(data.downvotes || 0));
      setUserVote(Number(data.userVote || 0));
    } finally {
      setPending("");
    }
  };

  return (
    <div className="vote-rail" aria-label="추천과 비추천">
      <button
        type="button"
        aria-label="추천"
        aria-pressed={userVote === 1}
        disabled={pending !== ""}
        onClick={() => vote("up")}
      >
        <ArrowBigUp size={22} />
      </button>
      <strong>{currentScore}</strong>
      <button
        type="button"
        aria-label="비추천"
        aria-pressed={userVote === -1}
        disabled={pending !== ""}
        onClick={() => vote("down")}
      >
        <ArrowBigDown size={22} />
      </button>
      {currentDownvotes ? <em>{currentDownvotes}</em> : null}
    </div>
  );
}
