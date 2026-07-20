"use client";

import { useEffect, useState } from "react";
import { formatRelativeDate } from "@/lib/format";

const absoluteDate = (value: string) => new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "short",
  day: "numeric"
}).format(new Date(value));

export function RelativeTime({ value }: { value: string }) {
  const [label, setLabel] = useState(() => absoluteDate(value));

  useEffect(() => {
    setLabel(formatRelativeDate(value));
  }, [value]);

  return <time dateTime={value}>{label}</time>;
}
