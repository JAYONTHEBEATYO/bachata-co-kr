import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { compactThreadId } from "@/lib/community-api";
import { absoluteUrl } from "@/lib/format";

export const metadata: Metadata = {
  title: "이전 글 주소",
  description: "바차타 코리아의 이전 글 주소입니다.",
  alternates: { canonical: absoluteUrl("/guest") },
  robots: { index: false, follow: true }
};

export const dynamic = "force-dynamic";

export default async function GuestPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id = "" } = await searchParams;
  if (id) redirect(`/g/${encodeURIComponent(compactThreadId(id))}`);
  redirect("/");
}
