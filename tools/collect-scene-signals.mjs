import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = resolve(root, "data/sources.json");
const socialRadarPath = resolve(root, "data/social-radar.json");
const editorialDeskPath = resolve(root, "data/editorial-desk.json");
const outputPath = resolve(root, "data/generated/scene-signals.json");

const now = new Date();
const today = now.toISOString().slice(0, 10);
const youtubeKey = process.env.YOUTUBE_API_KEY || "";
const instagramToken = process.env.INSTAGRAM_GRAPH_TOKEN || "";
const naverClientId = process.env.NAVER_CLIENT_ID || "";
const naverClientSecret = process.env.NAVER_CLIENT_SECRET || "";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const readOptionalJson = async (path) => {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
};

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

const buildSocialRadarTopic = (socialRadar) => {
  if (!socialRadar?.watchlists?.length) return null;

  const accountCandidates = socialRadar.watchlists.flatMap((watchlist) => (
    watchlist.accounts.map((account) => ({
      type: "instagram-watch",
      title: `${account.name} @${account.handle}`,
      sourceUrl: account.url,
      relatedUrl: account.relatedUrl,
      role: account.role,
      watchlist: watchlist.label,
      scoreBoost: watchlist.priority || 50
    }))
  ));

  const hashtagCandidates = (socialRadar.hashtags || []).map((hashtag) => ({
    type: "instagram-hashtag",
    title: `#${hashtag.tag} ${hashtag.intent}`,
    sourceUrl: `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag.tag)}/`,
    cadence: hashtag.cadence,
    scoreBoost: hashtag.cadence === "daily" ? 70 : 54
  }));

  const graphSignal = instagramToken ? [{
    type: "instagram-graph",
    title: "Instagram Graph token configured for Social Radar",
    sourceUrl: "https://developers.facebook.com/documentation/instagram-platform/overview",
    scoreBoost: 82
  }] : [];

  const candidates = [...graphSignal, ...accountCandidates, ...hashtagCandidates]
    .map((candidate) => ({
      ...candidate,
      score: candidate.scoreBoost + (candidate.type === "instagram-watch" ? 18 : 10)
    }))
    .sort((a, b) => b.score - a.score);

  return {
    id: "social-radar",
    label: "Social Radar",
    keywords: ["Instagram", "바차타 인스타", "한국 바차타 소식", "bachata Korea", "bachata event"],
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 12)
  };
};

const priorityScore = (priority = "") => {
  if (priority.startsWith("A1")) return 98;
  if (priority.startsWith("A2")) return 90;
  if (priority.startsWith("B1")) return 78;
  if (priority.startsWith("B2")) return 68;
  return 58;
};

const buildEditorialDeskTopic = (editorialDesk) => {
  if (!editorialDesk?.queue?.length) return null;

  const candidates = editorialDesk.queue.map((item) => ({
    type: "editorial-queue",
    id: item.id,
    title: `${item.priority} · ${item.title}`,
    sourceUrl: "/desk/",
    relatedUrl: item.internalLinks?.[0]?.url || item.linkedUrl || "/desk/",
    embedUrl: item.video?.id ? `https://www.youtube-nocookie.com/embed/${item.video.id}${item.video.start ? `?start=${encodeURIComponent(item.video.start)}` : ""}` : undefined,
    videoId: item.video?.id,
    beat: item.beat,
    status: item.status,
    searchIntent: item.searchIntent,
    scoreBoost: priorityScore(item.priority)
  })).map((candidate) => ({
    ...candidate,
    score: candidate.scoreBoost + (candidate.embedUrl ? 20 : 0)
  })).sort((a, b) => b.score - a.score);

  return {
    id: "editorial-desk",
    label: "Editorial Desk",
    keywords: ["바차타 편집 데스크", "바차타 콘텐츠 발행", "센슈얼 바차타", "도미니칸 바차타", "Bachata Influence"],
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 12)
  };
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
  const socialRadar = await readOptionalJson(socialRadarPath);
  const editorialDesk = await readOptionalJson(editorialDeskPath);
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

  const socialRadarTopic = buildSocialRadarTopic(socialRadar);
  if (socialRadarTopic) {
    topics.push(socialRadarTopic);
  }

  const editorialDeskTopic = buildEditorialDeskTopic(editorialDesk);
  if (editorialDeskTopic) {
    topics.push(editorialDeskTopic);
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
