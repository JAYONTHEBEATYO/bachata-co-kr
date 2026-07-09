import type { Metadata } from "next";
import { Suspense } from "react";
import { GuestThreadDetail } from "@/components/GuestThreadDetail";
import { absoluteUrl } from "@/lib/format";
import { DEFAULT_SHARE_IMAGE } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "비회원 쓰레드",
  description: "바차타 코리아에 올라온 비회원 글을 읽고, 로그인 없이 댓글을 남길 수 있습니다.",
  alternates: { canonical: absoluteUrl("/guest") },
  openGraph: {
    title: "바차타 코리아 비회원 쓰레드",
    description: "바차타 질문, 영상, 행사 이야기를 댓글과 공유로 이어가는 공간입니다.",
    url: absoluteUrl("/guest"),
    type: "article",
    images: [{ url: DEFAULT_SHARE_IMAGE, width: 1200, height: 630, alt: "바차타 코리아 비회원 쓰레드" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "바차타 코리아 비회원 쓰레드",
    description: "바차타 질문, 영상, 행사 이야기를 댓글과 공유로 이어가는 공간입니다.",
    images: [DEFAULT_SHARE_IMAGE]
  }
};

export default function GuestPage() {
  return (
    <Suspense fallback={<main className="app-shell narrow"><section className="page-head"><h1>글을 불러오는 중입니다</h1></section></main>}>
      <GuestThreadDetail />
    </Suspense>
  );
}
