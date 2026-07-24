import { getCommunities } from "@/lib/data";
import { siteUrl } from "@/lib/format";
import { getPublishedSeoThreads, threadPublicUrl } from "@/lib/seo-threads";

export const dynamic = "force-dynamic";

export async function GET() {
  const communities = await getCommunities();
  const threads = await getPublishedSeoThreads(30);
  const body = [
    "# 바차타 코리아",
    "",
    "> 바차타 질문, 영상, 행사와 소셜 후기를 글과 댓글로 나누는 한국어 커뮤니티입니다.",
    "",
    "## 주요 페이지",
    `- 홈: ${siteUrl}/`,
    `- 주제 탐색: ${siteUrl}/topics`,
    `- RSS: ${siteUrl}/feed.xml`,
    `- 전체 AI용 콘텐츠: ${siteUrl}/llms-full.txt`,
    ...communities.map((community) => `- ${community.name}: ${siteUrl}/c/${community.slug}`),
    "",
    "## 최신 공개 글",
    ...threads.map((thread) => `- ${thread.title}: ${threadPublicUrl(thread.id)}`)
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300"
    }
  });
}
