"use client";

import { useEffect, useMemo, useState } from "react";
import { Award } from "lucide-react";
import { communityApiUrl } from "@/lib/community-api";

type AwardPickerProps = {
  threadId: string;
};

type AwardCount = {
  awardType: string;
  count: number;
};

const awards = [
  { type: "footwork", emoji: "🕺", label: "풋워크 불꽃" },
  { type: "flow", emoji: "💃", label: "무브 맛집" },
  { type: "music", emoji: "🎧", label: "음악천재" },
  { type: "manners", emoji: "🤝", label: "매너굿" }
];

const awardsApiUrl = () => communityApiUrl("/api/awards");

const guestId = () => {
  if (typeof window === "undefined") return "guest";
  const key = "bachata.awardGuest.v1";
  const stored = window.sessionStorage.getItem(key);
  if (stored) return stored;
  const next = crypto.randomUUID();
  window.sessionStorage.setItem(key, next);
  return next;
};

export function AwardPicker({ threadId }: AwardPickerProps) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");

  const total = useMemo(() => Object.values(counts).reduce((sum, count) => sum + count, 0), [counts]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${awardsApiUrl()}?threadId=${encodeURIComponent(threadId)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { awards?: AwardCount[] };
        if (cancelled) return;
        const next: Record<string, number> = {};
        (data.awards || []).forEach((item) => {
          next[item.awardType] = Number(item.count || 0);
        });
        setCounts(next);
      } catch {
        if (!cancelled) setStatus("");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const giveAward = async (awardType: string) => {
    setStatus("");
    try {
      const response = await fetch(awardsApiUrl(), {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ threadId, awardType, guestId: guestId() })
      });
      const data = await response.json() as { awards?: AwardCount[]; error?: string };
      if (!response.ok) throw new Error(data.error || "어워드를 남기지 못했습니다.");
      const next: Record<string, number> = {};
      (data.awards || []).forEach((item) => {
        next[item.awardType] = Number(item.count || 0);
      });
      setCounts(next);
      setStatus("어워드 완료");
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "어워드를 남기지 못했습니다.");
    }
  };

  return (
    <span className="award-picker">
      <button type="button" className="award-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Award size={16} />
        어워드{total ? ` ${total}` : ""}
      </button>
      {open ? (
        <span className="award-popover" role="menu">
          {awards.map((award) => (
            <button key={award.type} type="button" onClick={() => giveAward(award.type)}>
              <span>{award.emoji}</span>
              <strong>{award.label}</strong>
              {counts[award.type] ? <em>{counts[award.type]}</em> : null}
            </button>
          ))}
        </span>
      ) : null}
      {status ? <span className="award-status">{status}</span> : null}
    </span>
  );
}
