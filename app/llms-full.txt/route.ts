import { cleanShareText } from "@/lib/share-meta";
import { getPublishedSeoThreads, threadPublicUrl } from "@/lib/seo-threads";

export const dynamic = "force-dynamic";

export async function GET() {
  const threads = await getPublishedSeoThreads(100);
  const body = [
    "# 바차타 코리아 공개 콘텐츠",
    "",
    "> 한국어 바차타 커뮤니티. 질문, 영상, 행사, 아카데미·댄서·소셜 후기를 다룹니다.",
    "",
    "## 최신 공개 글",
    "",
    ...threads.flatMap((thread) => [
      `### ${thread.title}`,
      `- URL: ${threadPublicUrl(thread.id)}`,
      `- 발행일: ${thread.createdAt}`,
      `- 주제: ${thread.category}`,
      `- 댓글: ${thread.commentCount}`,
      cleanShareText(thread.body, 700),
      ""
    ])
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300"
    }
  });
}
