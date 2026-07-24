const baseUrl = (process.env.SEO_BASE_URL || process.argv[2] || "https://bachata.co.kr")
  .replace(/\/+$/, "");
const canonicalUrl = (process.env.SEO_CANONICAL_URL || "https://bachata.co.kr")
  .replace(/\/+$/, "");

const failures = [];

const fetchText = async (path, expectedStatus = 200) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "user-agent": "BachataKorea-SEO-Audit/1.0" },
    redirect: "follow"
  });
  const text = await response.text();
  if (response.status !== expectedStatus) {
    failures.push(`${path}: HTTP ${response.status}, expected ${expectedStatus}`);
  }
  return { response, text };
};

const assertIncludes = (path, text, expected) => {
  if (!text.includes(expected)) failures.push(`${path}: missing ${expected}`);
};

const assertMatches = (path, text, pattern, label) => {
  if (!pattern.test(text)) failures.push(`${path}: missing ${label}`);
};

const robots = await fetchText("/robots.txt");
assertIncludes("/robots.txt", robots.text, "OAI-SearchBot");
assertIncludes("/robots.txt", robots.text, `Sitemap: ${canonicalUrl}/sitemap.xml`);

const sitemap = await fetchText("/sitemap.xml");
assertIncludes("/sitemap.xml", sitemap.text, `${canonicalUrl}/`);
assertMatches("/sitemap.xml", sitemap.text, /<loc>https:\/\/bachata\.co\.kr\/g\/[^<]+<\/loc>/, "thread URL");

const feed = await fetchText("/feed.xml");
assertIncludes("/feed.xml", feed.text, "<rss");
assertIncludes("/feed.xml", feed.text, "<item>");
assertMatches("/feed.xml", feed.text, /<link>https:\/\/bachata\.co\.kr\/g\/[^<]+<\/link>/, "canonical thread link");

const llms = await fetchText("/llms.txt");
assertIncludes("/llms.txt", llms.text, "/llms-full.txt");
assertIncludes("/llms.txt", llms.text, "/feed.xml");

const llmsFull = await fetchText("/llms-full.txt");
assertIncludes("/llms-full.txt", llmsFull.text, "# 바차타 코리아 공개 콘텐츠");
assertMatches("/llms-full.txt", llmsFull.text, /https:\/\/bachata\.co\.kr\/g\//, "thread URL");

const key = "1353108c09c8b3355a91d53d08852030";
const indexNowKey = await fetchText(`/${key}.txt`);
if (indexNowKey.text.trim() !== key) failures.push("IndexNow key file: content mismatch");

const sampleMatch = sitemap.text.match(/<loc>(https:\/\/bachata\.co\.kr\/g\/[^<]+)<\/loc>/);
if (sampleMatch) {
  const samplePath = new URL(sampleMatch[1]).pathname;
  const sample = await fetchText(samplePath);
  assertIncludes(samplePath, sample.text, `<link rel="canonical" href="${sampleMatch[1]}"`);
  assertIncludes(samplePath, sample.text, '"@type":"DiscussionForumPosting"');
  assertIncludes(samplePath, sample.text, '"mainEntityOfPage"');
  if (sample.text.includes("비회원 쓰레드 | 바차타 코리아")) {
    failures.push(`${samplePath}: generic client-only title is still present`);
  }
}

for (const path of ["/write", "/search"]) {
  const page = await fetchText(path);
  assertMatches(path, page.text, /<meta name="robots" content="[^"]*noindex/i, "noindex robots meta");
}

if (failures.length) {
  console.error(`SEO runtime audit failed for ${baseUrl}`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`SEO runtime audit passed for ${baseUrl}`);
