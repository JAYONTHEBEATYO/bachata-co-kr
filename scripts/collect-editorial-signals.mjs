const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const endpoint = process.env.AUTOMATION_ENDPOINT || "https://bachata.co.kr/api/admin/automation";
const token = required("ADMIN_AUTOMATION_TOKEN");

const queries = [
  "바차타",
  "센슈얼 바차타",
  "도미니칸 바차타",
  "바차타 소셜",
  "바차타 페스티벌",
  "바차타 워크샵",
  "바차타 공연",
  "바차타 음악"
];

const dayIndex = Math.floor(Date.now() / 86_400_000);
const dailyQueries = [
  queries[dayIndex % queries.length],
  queries[(dayIndex + 3) % queries.length],
  queries[(dayIndex + 5) % queries.length]
];

const stripHtml = (value = "") => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"")
  .replace(/&#39;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/\s+/g, " ")
  .trim();

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
};

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "BachataKoreaBot/1.0 (+https://bachata.co.kr)",
      ...headers
    },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { "user-agent": "BachataKoreaBot/1.0 (+https://bachata.co.kr)" },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
};

const collectNaverCafe = async () => {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return [];
  const results = [];
  for (const query of dailyQueries) {
    const params = new URLSearchParams({ query, display: "6", sort: "date" });
    const data = await fetchJson(
      `https://openapi.naver.com/v1/search/cafearticle.json?${params}`,
      {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret
      }
    );
    for (const item of Array.isArray(data.items) ? data.items : []) {
      const url = safeUrl(item.link);
      if (!url) continue;
      results.push({
        sourceId: "source-naver-cafe",
        sourceName: item.cafename ? `네이버 카페 · ${stripHtml(item.cafename)}` : "네이버 카페 검색",
        sourceType: "naver-cafe-api",
        title: stripHtml(item.title).slice(0, 180),
        snippet: stripHtml(item.description).slice(0, 450),
        url,
        publishedAt: item.postdate || null,
        thumbnail: null,
        query
      });
    }
  }
  return results;
};

const collectKakao = async (kind) => {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return [];
  const isVideo = kind === "vclip";
  const results = [];
  for (const query of dailyQueries) {
    const params = new URLSearchParams({ query, size: "6", sort: isVideo ? "recency" : "recency" });
    const data = await fetchJson(
      `https://dapi.kakao.com/v2/search/${kind}?${params}`,
      { Authorization: `KakaoAK ${key}` }
    );
    for (const item of Array.isArray(data.documents) ? data.documents : []) {
      const url = safeUrl(item.url);
      if (!url) continue;
      results.push({
        sourceId: isVideo ? "source-daum-video" : "source-daum-cafe",
        sourceName: isVideo
          ? `동영상 · ${stripHtml(item.author || "공개 영상")}`
          : `다음 카페 · ${stripHtml(item.cafename || "공개 카페")}`,
        sourceType: isVideo ? "kakao-video-api" : "kakao-cafe-api",
        title: stripHtml(item.title).slice(0, 180),
        snippet: stripHtml(item.contents || item.title).slice(0, 450),
        url,
        publishedAt: item.datetime || null,
        thumbnail: safeUrl(item.thumbnail) || null,
        query
      });
    }
  }
  return results;
};

const publicSources = [
  { sourceId: "source-danceinfo", sourceName: "댄스인포", url: "https://danceinfo.net/" },
  { sourceId: "source-bchata", sourceName: "Bchata", url: "https://bchata.vercel.app/" },
  { sourceId: "source-simpson", sourceName: "심슨 라틴스쿨", url: "https://simspson-latinsch.netlify.app/" }
];

const collectPublicSites = async () => {
  const results = [];
  for (const source of publicSources) {
    const html = (await fetchText(source.url)).slice(0, 300_000);
    const pageTitle = stripHtml(
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]
      || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      || source.sourceName
    );
    const description = stripHtml(
      html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)/i)?.[1]
      || ""
    );
    results.push({
      ...source,
      sourceType: "public-web",
      title: pageTitle,
      snippet: description.slice(0, 450),
      publishedAt: null,
      thumbnail: null,
      query: "바차타"
    });

    const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    for (const match of links) {
      const title = stripHtml(match[2]);
      if (title.length < 8 || !/바차타|bachata|페스티벌|워크숍|워크샵|소셜|댄스/i.test(title)) continue;
      const url = safeUrl(new URL(match[1], source.url).toString());
      if (!url || url === source.url) continue;
      results.push({
        ...source,
        sourceType: "public-web",
        title: title.slice(0, 180),
        snippet: "",
        url,
        publishedAt: null,
        thumbnail: null,
        query: "바차타"
      });
      if (results.filter((item) => item.sourceId === source.sourceId).length >= 6) break;
    }
  }
  return results;
};

const settled = await Promise.allSettled([
  collectNaverCafe(),
  collectKakao("cafe"),
  collectKakao("vclip"),
  collectPublicSites()
]);

const signals = [];
for (const result of settled) {
  if (result.status === "fulfilled") signals.push(...result.value);
  else console.error(result.reason);
}

const unique = [...new Map(
  signals
    .filter((signal) => signal.title && signal.url)
    .map((signal) => [signal.url, signal])
).values()]
  .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
  .slice(0, 40);

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({ mode: "daily", signals: unique }),
  signal: AbortSignal.timeout(180_000)
});

const body = await response.text();
if (!response.ok) throw new Error(`Automation endpoint failed: ${response.status} ${body}`);
console.log(body);
