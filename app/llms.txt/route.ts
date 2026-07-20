import { getCommunities } from "@/lib/data";
import { siteUrl } from "@/lib/format";

export async function GET() {
  const communities = await getCommunities();
  const body = [
    "# 바차타 코리아",
    "",
    "바차타 질문, 영상, 행사와 소셜 후기를 글과 댓글로 나누는 한국어 커뮤니티입니다.",
    "",
    "## 페이지",
    `- 홈: ${siteUrl}/`,
    `- 주제 탐색: ${siteUrl}/topics`,
    `- 글쓰기: ${siteUrl}/write`,
    ...communities.map((community) => `- ${community.name}: ${siteUrl}/c/${community.slug}`)
  ].join("\n");

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
