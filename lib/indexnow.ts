import { getCloudflareContext } from "@opennextjs/cloudflare";
import { threadPublicUrl } from "@/lib/seo-threads";

export const INDEXNOW_KEY = "1353108c09c8b3355a91d53d08852030";
export const INDEXNOW_KEY_LOCATION = `https://bachata.co.kr/${INDEXNOW_KEY}.txt`;

const submitIndexNow = async (urls: string[]) => {
  const urlList = [...new Set(urls)].filter((url) => url.startsWith("https://bachata.co.kr/"));
  if (!urlList.length) return;

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: "bachata.co.kr",
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList
    })
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`IndexNow submission failed: ${response.status}`);
  }
};

export const queueThreadIndexUpdate = async (id: string) => {
  const task = submitIndexNow([
    threadPublicUrl(id),
    "https://bachata.co.kr/",
    "https://bachata.co.kr/sitemap.xml",
    "https://bachata.co.kr/feed.xml"
  ]).catch(() => undefined);

  try {
    const { ctx } = await getCloudflareContext({ async: true });
    ctx.waitUntil(task);
  } catch {
    await task;
  }
};
