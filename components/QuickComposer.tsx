import Link from "next/link";
import { ImagePlus, Link2, PenLine } from "lucide-react";

export function QuickComposer({ topic }: { topic?: string }) {
  const href = topic ? `/write?topic=${encodeURIComponent(topic)}` : "/write";
  return (
    <section className="quick-composer" aria-label="빠른 글쓰기">
      <span className="quick-avatar" aria-hidden="true">B</span>
      <Link className="quick-composer-prompt" href={href}>오늘 어떤 바차타 이야기가 있었나요?</Link>
      <Link className="quick-tool" href={`${href}${href.includes("?") ? "&" : "?"}type=media`} aria-label="사진이나 영상 올리기">
        <ImagePlus size={19} />
      </Link>
      <Link className="quick-tool" href={`${href}${href.includes("?") ? "&" : "?"}type=link`} aria-label="링크 공유하기">
        <Link2 size={18} />
      </Link>
      <Link className="quick-write" href={href}><PenLine size={17} />쓰기</Link>
    </section>
  );
}
