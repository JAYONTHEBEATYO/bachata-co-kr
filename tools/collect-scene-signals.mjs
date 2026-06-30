import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = resolve(root, "data/sources.json");
const socialRadarPath = resolve(root, "data/social-radar.json");
const socialIntakePath = resolve(root, "data/social-intake.json");
const editorialDeskPath = resolve(root, "data/editorial-desk.json");
const outputPath = resolve(root, "data/generated/scene-signals.json");
const historyPath = resolve(root, "data/generated/signal-history.json");

const now = new Date();
const koreaDate = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(date);
const today = koreaDate(now);
const youtubeKey = process.env.YOUTUBE_API_KEY || "";
const instagramToken = process.env.INSTAGRAM_GRAPH_TOKEN || "";
const instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.INSTAGRAM_IG_USER_ID || "";
const instagramApiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0";
const instagramHashtagLimit = Number.parseInt(process.env.INSTAGRAM_HASHTAG_LIMIT || "8", 10);
const naverClientId = process.env.NAVER_CLIENT_ID || "";
const naverClientSecret = process.env.NAVER_CLIENT_SECRET || "";
const diagnostics = [];

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const readOptionalJson = async (path) => {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
};

const formatById = (config = {}) => new Map((config.publishFormats || []).map((format) => [format.id, format]));

const stableSignalKey = (candidate = {}) => {
  const basis = candidate.sourceUrl || candidate.id || candidate.embedUrl || candidate.title || "unknown";
  return `${candidate.type || "source"}:${String(basis).trim().toLowerCase()}`;
};

const inferPublishFormat = (candidate = {}, topic = {}, config = {}) => {
  const role = candidate.role || "";
  if (role && config.roleAliases?.[role]) return config.roleAliases[role];

  const relatedUrl = candidate.relatedUrl || candidate.sourceUrl || "";
  if (relatedUrl.startsWith("/events/")) return "event";
  if (relatedUrl.startsWith("/profiles/")) return "profile";
  if (relatedUrl.startsWith("/programs/") || relatedUrl.startsWith("/styles/") || relatedUrl.startsWith("/articles/")) return "learning";
  if (relatedUrl.startsWith("/gear/")) return "gear";
  if (relatedUrl.startsWith("/community/") || relatedUrl.startsWith("/submit/")) return "community";

  if (topic.id === "gear-market") return "gear";
  if (topic.id === "korea-scene" && /event|festival/i.test(`${candidate.role || ""} ${candidate.title || ""}`)) return "event";
  if (candidate.type?.includes("instagram") || candidate.type?.includes("naver")) return "brief";
  if (candidate.embedUrl || candidate.videoId || candidate.type?.includes("youtube")) return "learning";
  return "brief";
};

const evidenceLevel = (candidate = {}) => {
  const evidence = [
    candidate.sourceUrl,
    candidate.relatedUrl,
    candidate.embedUrl || candidate.videoId,
    ...(candidate.evidence || [])
  ].filter(Boolean).length;

  if (evidence >= 3) return "strong";
  if (evidence === 2) return "medium";
  return "watch";
};

const noveltyLabel = (historyRecord) => {
  if (!historyRecord) return "new";
  const seenCount = Number(historyRecord.seenCount || 0);
  if (seenCount >= 3) return "recurring";
  return "returning";
};

const noveltyBoost = (novelty) => {
  if (novelty === "new") return 18;
  if (novelty === "recurring") return 10;
  if (novelty === "returning") return 6;
  return 0;
};

const enrichTopicsWithHistory = ({ topics, history, socialIntake }) => {
  const previous = history?.signals || {};
  const formats = formatById(socialIntake);
  const nextSignals = {};
  const noveltyCounts = { new: 0, returning: 0, recurring: 0 };
  const formatCounts = {};

  const enrichedTopics = topics.map((topic) => {
    const candidates = (topic.candidates || []).map((candidate) => {
      const signalKey = stableSignalKey(candidate);
      const existing = previous[signalKey];
      const novelty = noveltyLabel(existing);
      const seenCount = Number(existing?.seenCount || 0) + 1;
      const publishFormatId = inferPublishFormat(candidate, topic, socialIntake);
      const format = formats.get(publishFormatId);
      const targetUrl = candidate.relatedUrl || format?.target || "/briefs/";
      const level = evidenceLevel(candidate);
      const nextScore = Math.round((candidate.score || candidate.scoreBoost || 0) + noveltyBoost(novelty));

      noveltyCounts[novelty] = (noveltyCounts[novelty] || 0) + 1;
      formatCounts[publishFormatId] = (formatCounts[publishFormatId] || 0) + 1;
      nextSignals[signalKey] = {
        key: signalKey,
        title: candidate.title || "",
        type: candidate.type || "source",
        sourceUrl: candidate.sourceUrl || "",
        relatedUrl: candidate.relatedUrl || "",
        publishFormatId,
        firstSeenAt: existing?.firstSeenAt || today,
        lastSeenAt: today,
        seenCount
      };

      return {
        ...candidate,
        signalKey,
        novelty,
        seenCount,
        firstSeenAt: existing?.firstSeenAt || today,
        lastSeenAt: today,
        publishFormatId,
        publishFormat: format?.label || publishFormatId,
        targetUrl,
        evidenceLevel: level,
        score: nextScore
      };
    }).sort((a, b) => b.score - a.score);

    return {
      ...topic,
      candidateCount: candidates.length,
      candidates
    };
  });

  return {
    topics: enrichedTopics,
    history: {
      generatedAt: now.toISOString(),
      generationDate: today,
      summary: {
        totalSignals: Object.keys(nextSignals).length,
        novelty: noveltyCounts,
        formats: formatCounts
      },
      signals: nextSignals
    }
  };
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

const trimText = (value = "", max = 140) => {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const fetchInstagramGraph = async (path, params = {}) => {
  const url = new URL(`https://graph.facebook.com/${instagramApiVersion}/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", instagramToken);
  return fetchJson(url);
};

const searchInstagramHashtag = async (hashtag) => {
  if (!instagramToken || !instagramBusinessAccountId) return [];

  try {
    const search = await fetchInstagramGraph("ig_hashtag_search", {
      user_id: instagramBusinessAccountId,
      q: hashtag.tag
    });
    const hashtagId = search.data?.[0]?.id;
    if (!hashtagId) return [];

    const media = await fetchInstagramGraph(`${hashtagId}/recent_media`, {
      user_id: instagramBusinessAccountId,
      fields: "id,caption,media_type,media_url,permalink,timestamp,username",
      limit: hashtag.cadence === "daily" ? 5 : 3
    });

    return (media.data || []).map((item) => ({
      type: "instagram-hashtag-media",
      id: item.id,
      title: `#${hashtag.tag} · ${item.username || "Instagram"} · ${trimText(item.caption || hashtag.intent, 72)}`,
      sourceUrl: item.permalink,
      publishedAt: item.timestamp,
      username: item.username,
      mediaType: item.media_type,
      tag: hashtag.tag,
      role: "hashtag",
      cadence: hashtag.cadence,
      evidence: [hashtag.intent, trimText(item.caption || "", 160)].filter(Boolean),
      scoreBoost: hashtag.cadence === "daily" ? 74 : 60
    }));
  } catch (error) {
    diagnostics.push({
      type: "instagram-hashtag-error",
      tag: hashtag.tag,
      message: error.message
    });
    return [];
  }
};

const collectInstagramHashtagSignals = async (socialRadar) => {
  if (!socialRadar?.hashtags?.length || !instagramToken || !instagramBusinessAccountId) return [];

  const limit = Number.isFinite(instagramHashtagLimit) && instagramHashtagLimit > 0
    ? Math.min(instagramHashtagLimit, 30)
    : 8;
  const hashtags = [...socialRadar.hashtags]
    .sort((a, b) => (a.cadence === "daily" ? -1 : 1) - (b.cadence === "daily" ? -1 : 1))
    .slice(0, limit);

  const settled = await Promise.all(hashtags.map(searchInstagramHashtag));
  return settled.flat();
};

const buildSocialRadarTopic = (socialRadar, instagramMedia = []) => {
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

  const candidates = [...instagramMedia, ...graphSignal, ...accountCandidates, ...hashtagCandidates]
    .map((candidate) => ({
      ...candidate,
      score: candidate.scoreBoost + (candidate.type === "instagram-watch" ? 18 : candidate.type === "instagram-hashtag-media" ? 24 : 10)
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
    sourceUrl: item.internalLinks?.[0]?.url || item.linkedUrl || "/articles/",
    relatedUrl: item.internalLinks?.[0]?.url || item.linkedUrl || "/articles/",
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
    label: "기획 노트",
    keywords: ["바차타 기획 노트", "바차타 콘텐츠", "센슈얼 바차타", "도미니칸 바차타", "Bachata Influence"],
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
  const socialIntake = await readOptionalJson(socialIntakePath) || {};
  const editorialDesk = await readOptionalJson(editorialDeskPath);
  const signalHistory = await readOptionalJson(historyPath) || {};
  const instagramMedia = await collectInstagramHashtagSignals(socialRadar);
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

  const socialRadarTopic = buildSocialRadarTopic(socialRadar, instagramMedia);
  if (socialRadarTopic) {
    topics.push(socialRadarTopic);
  }

  const editorialDeskTopic = buildEditorialDeskTopic(editorialDesk);
  if (editorialDeskTopic) {
    topics.push(editorialDeskTopic);
  }

  const enriched = enrichTopicsWithHistory({
    topics,
    history: signalHistory,
    socialIntake
  });

  const output = {
    generatedAt: now.toISOString(),
    generationDate: today,
    mode: {
      youtubeApi: Boolean(youtubeKey),
      naverApi: Boolean(naverClientId && naverClientSecret),
      instagramGraph: Boolean(instagramToken),
      instagramHashtagSearch: Boolean(instagramToken && instagramBusinessAccountId),
      instagramApiVersion
    },
    diagnostics,
    historySummary: enriched.history.summary,
    editorialPrinciples: sourceMap.editorialPrinciples,
    topics: enriched.topics
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await writeFile(historyPath, `${JSON.stringify(enriched.history, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${historyPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
