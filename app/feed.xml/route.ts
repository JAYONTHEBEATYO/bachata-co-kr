import { getPublishedSeoThreads, threadPublicUrl } from "@/lib/seo-threads";
import { extractThreadMedia } from "@/lib/thread-media";

export const dynamic = "force-dynamic";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const threads = await getPublishedSeoThreads(50);
  const items = threads.map((thread) => {
    const url = threadPublicUrl(thread.id);
    const content = extractThreadMedia(thread.body, thread.linkUrl).text || thread.body;
    return [
      "<item>",
      `<title>${escapeXml(thread.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `<description>${escapeXml(content)}</description>`,
      `<pubDate>${new Date(thread.createdAt).toUTCString()}</pubDate>`,
      `<category>${escapeXml(thread.category)}</category>`,
      "</item>"
    ].join("");
  }).join("");

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    "<title>바차타 코리아 최신 글</title>",
    "<link>https://bachata.co.kr/</link>",
    "<description>한국 바차타 커뮤니티의 최신 질문, 영상, 행사와 소셜 후기</description>",
    "<language>ko-KR</language>",
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    "</channel></rss>"
  ].join("");

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300"
    }
  });
}
