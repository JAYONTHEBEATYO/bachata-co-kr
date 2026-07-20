"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { communityApiUrl } from "@/lib/community-api";

type ReportButtonProps = {
  targetType: "thread" | "guestThread" | "comment";
  targetId: string;
};

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setStatus("");
    try {
      const response = await fetch(communityApiUrl("/api/reports/"), {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ targetType, targetId, reason, detail })
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "신고를 접수하지 못했습니다.");
      setStatus("신고가 접수됐습니다.");
      setDetail("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "신고를 접수하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="report-control">
      <button type="button" className="thread-action-pill" onClick={() => setOpen((value) => !value)}>
        <Flag size={15} /> 신고
      </button>
      {open ? (
        <div className="report-popover">
          <strong>신고 사유</strong>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="spam">광고·도배</option>
            <option value="abuse">욕설·괴롭힘</option>
            <option value="privacy">개인정보 노출</option>
            <option value="copyright">저작권 문제</option>
            <option value="other">기타</option>
          </select>
          <textarea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="필요한 설명이 있으면 적어주세요" maxLength={500} />
          <div>
            <button type="button" onClick={() => setOpen(false)}>취소</button>
            <button type="button" onClick={submit} disabled={pending}>{pending ? "접수 중" : "신고 접수"}</button>
          </div>
          {status ? <p>{status}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
