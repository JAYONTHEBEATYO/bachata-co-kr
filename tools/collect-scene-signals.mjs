import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = resolve(root, "data/sources.json");
const outputPath = resolve(root, "data/generated/scene-signals.json");

const now = new Date();
const today = now.toISOString().slice(0, 10);
const youtubeKey = process.env.YOUTUBE_API_KEY || "";
const instagramToken = process.env.INSTAGRAM_GRAPH_TOKEN || "";
const naverClientId = process.env.NAVER_CLIENT_ID || "";
const naverClientSecret = process.env.NAVER_CLIENT_SECRET || "";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
};

const getYoutubeId = (url) => {
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return match ? match[1] : null;
};

const validateYoutubeVideo = async (url) => {
  const id = getYoutubeId(url);
  if (!id) return null;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;
  const oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;

  try {
    const [head, oembed] = await Promise.all([
      fetch(embedUrl, { method: "HEAD" }),
      fetchJson(oembedUrl)
    ]);
    if (!head.ok) return null;
    return {
      type: "youtube",
      id,
      title: oembed.title,
      sourceUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl,
      scoreBoost: 25
    };
  } catch {
    return null;
  }
};

const searchYoutube = async (topic) => {
  if (!youtubeKey) return [];

  const query = encodeURIComponent(topic.keywords.slice(0, 4).join(" "));
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&order=date&q=${query}&key=${youtubeKey}`;
  const data = await fetchJson(url);

  return data.items.map((item) => ({
    type: "youtube-search",
    id: item.id.videoId,
    title: item.snippet.title,
    sourceUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${item.id.videoId}`,
    publishedAt: item.snippet.publishedAt,
    scoreBoost: 18
  }));
};

const searchNaver = async (topic) => {
  if (!naverClientId || !naverClientSecret) return [];

  const query = encodeURIComponent(topic.keywords.slice(0, 3).join(" "));
  const url = `https://openapi.naver.com/v1/search/blog.json?display=5&sort=date&query=${query}`;
  const data = await fetchJson(url, {
    headers: {
      "X-Naver-Client-Id": naverClientId,
      "X-Naver-Client-Secret": naverClientSecret
    }
  });

  return data.items.map((item) => ({
    type: "naver-blog",
    title: item.title.replace(/<[^>]+>/g, ""),
    sourceUrl: item.link,
    publishedAt: item.postdate,
    scoreBoost: 12
  }));
};

const checkInstagramReady = () => {
  if (!instagramToken) return [];
  return [{
    type: "instagram-ready",
    title: "Instagram Graph token configured",
    sourceUrl: "https://developers.facebook.com/documentation/instagram-platform/overview",
    scoreBoost: 8
  }];
};

const scoreCandidate = (candidate, topic) => {
  const text = `${candidate.title || ""} ${candidate.sourceUrl || ""}`.toLowerCase();
  const keywordHits = topic.keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;
  const videoScore = candidate.embedUrl ? 20 : 0;
  const koreaScore = /korea|seoul|한국|서울|강남|홍대|보니따|에버라틴|그레이|로렌|클루니/.test(text) ? 15 : 0;
  return (candidate.scoreBoost || 0) + keywordHits * 10 + videoScore + koreaScore;
};

const main = async () => {
  const sourceMap = await readJson(sourcesPath);
  const topics = [];

  for (const topic of sourceMap.topics) {
    const seededVideos = [];
    for (const sourceUrl of topic.sources) {
      const video = await validateYoutubeVideo(sourceUrl);
      if (video) seededVideos.push(video);
    }

    const [youtubeSearch, naverSearch] = await Promise.all([
      searchYoutube(topic).catch((error) => [{ type: "error", title: `YouTube search failed: ${error.message}`, scoreBoost: 0 }]),
      searchNaver(topic).catch((error) => [{ type: "error", title: `Naver search failed: ${error.message}`, scoreBoost: 0 }])
    ]);

    const candidates = [
      ...seededVideos,
      ...youtubeSearch,
      ...naverSearch,
      ...checkInstagramReady()
    ].map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, topic)
    })).sort((a, b) => b.score - a.score);

    topics.push({
      id: topic.id,
      label: topic.label,
      keywords: topic.keywords,
      candidateCount: candidates.length,
      candidates: candidates.slice(0, 12)
    });
  }

  const output = {
    generatedAt: now.toISOString(),
    generationDate: today,
    mode: {
      youtubeApi: Boolean(youtubeKey),
      naverApi: Boolean(naverClientId && naverClientSecret),
      instagramGraph: Boolean(instagramToken)
    },
    editorialPrinciples: sourceMap.editorialPrinciples,
    topics
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
