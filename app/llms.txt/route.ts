import { getThreads } from "@/lib/data";
import { siteUrl } from "@/lib/format";

export async function GET() {
  const threads = await getThreads("hot");
  const body = [
    "# 바차타 코리아",
    "",
    "바차타 코리아는 한국어 바차타 커뮤니티입니다. 바차타 영상, 소셜, 페스티벌, 댄서, 입문 질문을 쓰레드 구조로 보여줍니다.",
    "",
    "## 주요 페이지",
    `- 홈: ${siteUrl}/`,
    `- 영상: ${siteUrl}/videos`,
    `- 행사: ${siteUrl}/events`,
    `- 초보자 가이드: ${siteUrl}/guide`,
    `- 댄서: ${siteUrl}/dancers`,
    "",
    "## 최근 쓰레드",
    ...threads.slice(0, 10).map((thread) => `- ${thread.title}: ${siteUrl}/t/${thread.id}/${thread.slug}`)
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}
