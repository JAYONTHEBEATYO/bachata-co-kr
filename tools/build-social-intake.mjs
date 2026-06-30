import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/social-intake.json");
const radarPath = resolve(root, "data/social-radar.json");
const signalsPath = resolve(root, "data/generated/scene-signals.json");
const sourceHealthPath = resolve(root, "data/generated/source-health.json");
const outDir = resolve(root, "intake");
const outputPath = resolve(root, "data/generated/social-intake-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const slug = (value = "") => String(value)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9가-힣]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80) || "item";

const getYoutubeId = (url = "") => {
  const patterns = [
    /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{6,})/
  ];
  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match) return match[1];
  }
  return "";
};

const buildHealthIndex = (sourceHealth = {}) => {
  const map = new Map();
  for (const item of sourceHealth.results || []) {
    if (item.url) map.set(item.url, item);
    if (item.videoId) map.set(`youtube:${item.videoId}`, item);
  }
  return map;
};

const healthFor = (item, healthIndex) => {
  const videoId = item.videoId || getYoutubeId(item.sourceUrl || item.embedUrl || "");
  return healthIndex.get(item.sourceUrl)
    || healthIndex.get(item.relatedUrl)
    || (videoId ? healthIndex.get(`youtube:${videoId}`) : null)
    || null;
};

const formatById = (config) => new Map((config.publishFormats || []).map((format) => [format.id, format]));

const inferFormatId = (item, config) => {
  const role = item.role || "";
  if (role && config.roleAliases?.[role]) return config.roleAliases[role];

  const relatedUrl = item.relatedUrl || "";
  if (relatedUrl.startsWith("/events/")) return "event";
  if (relatedUrl.startsWith("/profiles/")) return "profile";
  if (relatedUrl.startsWith("/programs/") || relatedUrl.startsWith("/styles/") || relatedUrl.startsWith("/articles/")) return "learning";
  if (relatedUrl.startsWith("/gear/")) return "gear";
  if (relatedUrl.startsWith("/community/") || relatedUrl.startsWith("/submit/")) return "community";

  if (item.type === "instagram-hashtag") return "brief";
  if (item.type === "youtube") return "learning";
  return "brief";
};

const scoreItem = (item, config, health) => {
  const channelWeight = config.channelWeights?.[item.type] || config.channelWeights?.manual || 0;
  const base = Number.isFinite(item.score) ? item.score : Number(item.scoreBoost || 0);
  const relatedBoost = item.relatedUrl ? 10 : 0;
  const embedBoost = item.embedUrl || item.videoId ? 8 : 0;
  const healthPenalty = health?.status === "broken" ? -60 : health?.status === "warn" ? -14 : 0;
  return Math.max(0, Math.round(base + channelWeight + relatedBoost + embedBoost + healthPenalty));
};

const classifyStage = (item) => {
  if (item.healthStatus === "broken") {
    return {
      id: "blocked",
      label: "보류",
      nextStep: "링크나 영상이 복구되기 전까지 공개 발행에서 제외합니다."
    };
  }

  if (item.relatedUrl && (item.videoId || item.type === "editorial-queue" || item.type === "youtube")) {
    return {
      id: "ready",
      label: "오늘 발행",
      nextStep: "영상과 내부 연결이 있으므로 브리프나 관련 허브에 바로 올릴 수 있습니다."
    };
  }

  if (item.relatedUrl) {
    return {
      id: "review",
      label: "원문 검수",
      nextStep: "인스타 원문, 일정, 장소, 계정명을 확인한 뒤 기사/프로필/행사 카드로 확장합니다."
    };
  }

  if (item.videoId) {
    return {
      id: "review",
      label: "영상 검수",
      nextStep: "영상은 살아 있으므로 한국어 해설과 연결할 내부 페이지를 정합니다."
    };
  }

  return {
    id: "watch",
    label: "관찰",
    nextStep: "반복 신호가 쌓이면 브리프 후보로 올리고, 단발 신호면 watchlist에 남깁니다."
  };
};

const normalizeItem = (raw, config, healthIndex, sourceLabel) => {
  const formatId = inferFormatId(raw, config);
  const health = healthFor(raw, healthIndex);
  const score = scoreItem(raw, config, health);
  const videoId = raw.videoId || getYoutubeId(raw.sourceUrl || raw.embedUrl || "");
  const healthStatus = health?.status || (raw.sourceUrl?.includes("instagram.com") ? "watch" : "untracked");
  const stage = classifyStage({
    ...raw,
    formatId,
    videoId,
    healthStatus
  });
  return {
    id: raw.id || `${raw.type || "source"}-${slug(raw.title || raw.handle || raw.sourceUrl || raw.relatedUrl || sourceLabel)}`,
    title: raw.title || raw.name || raw.handle || raw.tag || "Untitled signal",
    type: raw.type || "manual",
    channel: raw.channel || raw.type || sourceLabel,
    role: raw.role || (raw.tag ? "hashtag" : ""),
    watchlist: raw.watchlist || sourceLabel,
    sourceUrl: raw.sourceUrl || raw.url || "",
    relatedUrl: raw.relatedUrl || "",
    embedUrl: raw.embedUrl || (videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : ""),
    videoId,
    formatId,
    cadence: raw.cadence || "",
    evidence: raw.evidence || [],
    beat: raw.beat || "",
    status: raw.status || "",
    searchIntent: raw.searchIntent || "",
    healthStatus,
    healthNote: health?.note || "",
    stageId: stage.id,
    stageLabel: stage.label,
    nextStep: raw.nextStep || stage.nextStep,
    score
  };
};

const collectRadarItems = (radar, config, healthIndex) => {
  const items = [];
  for (const watchlist of radar.watchlists || []) {
    for (const account of watchlist.accounts || []) {
      items.push(normalizeItem({
        id: `${watchlist.id}-${account.handle}`,
        type: "instagram-watch",
        title: `${account.name} @${account.handle}`,
        sourceUrl: account.url,
        relatedUrl: account.relatedUrl,
        role: account.role,
        watchlist: watchlist.label,
        beat: account.beat,
        score: watchlist.priority
      }, config, healthIndex, watchlist.label));
    }
  }

  for (const hashtag of radar.hashtags || []) {
    items.push(normalizeItem({
      id: `hashtag-${hashtag.tag}`,
      type: "instagram-hashtag",
      title: `#${hashtag.tag} - ${hashtag.intent}`,
      sourceUrl: `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag.tag)}/`,
      role: "hashtag",
      cadence: hashtag.cadence,
      score: hashtag.cadence === "daily" ? 70 : 58,
      evidence: [hashtag.intent]
    }, config, healthIndex, "Hashtag watch"));
  }

  return items;
};

const collectSignalItems = (signals, config, healthIndex) => {
  const items = [];
  for (const topic of signals.topics || []) {
    for (const candidate of topic.candidates || []) {
      if (!["editorial-queue", "youtube", "naver"].includes(candidate.type)) continue;
      items.push(normalizeItem({
        ...candidate,
        id: candidate.id || `${topic.id}-${candidate.type}-${candidate.videoId || candidate.id || slug(candidate.title)}`,
        watchlist: topic.label,
        role: candidate.role || (candidate.type === "youtube" ? "tutorial" : ""),
        evidence: [candidate.searchIntent, ...(topic.keywords || [])].filter(Boolean)
      }, config, healthIndex, topic.label));
    }
  }
  return items;
};

const dedupeQueue = (items) => {
  const map = new Map();
  for (const item of items) {
    const key = item.sourceUrl || item.relatedUrl || item.id;
    const existing = map.get(key);
    if (!existing || item.score > existing.score) map.set(key, item);
  }
  return [...map.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ko"));
};

const stageCounts = (queue) => queue.reduce((counts, item) => {
  counts[item.stageId] = (counts[item.stageId] || 0) + 1;
  return counts;
}, {});

const summarize = (queue, radar, sourceHealth) => {
  const stages = stageCounts(queue);
  return {
    totalQueue: queue.length,
    watchlistAccounts: (radar.watchlists || []).reduce((sum, item) => sum + (item.accounts || []).length, 0),
    hashtags: (radar.hashtags || []).length,
    publishReady: queue.filter((item) => item.relatedUrl && item.healthStatus !== "broken").length,
    readyNow: stages.ready || 0,
    needsReview: stages.review || 0,
    watchOnly: stages.watch || 0,
    blocked: stages.blocked || 0,
    videos: queue.filter((item) => item.videoId).length,
    brokenLinks: sourceHealth.summary?.broken || 0,
    stages
  };
};

const renderFormat = (format, counts) => `<article class="format-card">
          <span class="tag">${escapeHtml(format.cadence)}</span>
          <h3>${escapeHtml(format.label)}</h3>
          <p>${escapeHtml(format.nextAction)}</p>
          <div class="pill-row">
            <span>${escapeHtml(format.target)}</span>
            <span>${counts[format.id] || 0} signals</span>
          </div>
        </article>`;

const renderAutomationCard = ([id, item]) => `<article class="automation-card">
          <span class="tag">${escapeHtml(item.status || id)}</span>
          <h3>${escapeHtml(item.label || id)}</h3>
          <p>${escapeHtml(item.note || "")}</p>
          ${item.env ? `<p class="env-pill">${escapeHtml(item.env)}</p>` : ""}
        </article>`;

const renderStageCard = ({ label, count, body }) => `<article class="stage-card">
          <strong>${escapeHtml(count)}</strong>
          <h3>${escapeHtml(label)}</h3>
          <p>${escapeHtml(body)}</p>
        </article>`;

const renderQueueItem = (item, formats) => {
  const format = formats.get(item.formatId);
  const embed = item.embedUrl
    ? `<div class="video-frame"><iframe loading="lazy" src="${escapeHtml(item.embedUrl)}" title="${escapeHtml(item.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    : "";
  const links = [
    item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">원본 보기</a>` : "",
    item.relatedUrl ? `<a href="${escapeHtml(item.relatedUrl)}">관련 페이지</a>` : "",
    format?.target ? `<a href="${escapeHtml(format.target)}">${escapeHtml(format.label)}</a>` : ""
  ].filter(Boolean).join("");

  return `<article class="queue-card">
          ${embed}
          <div class="queue-body">
            <div class="meta-row">
              <span>${escapeHtml(item.type)}</span>
              <span>${escapeHtml(format?.label || item.formatId)}</span>
              <span>${escapeHtml(item.stageLabel)}</span>
              <span class="health-${escapeHtml(item.healthStatus)}">${escapeHtml(item.healthStatus)}</span>
              <span>score ${escapeHtml(item.score)}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.beat || item.searchIntent || item.healthNote || "편집자가 원본과 관련 페이지를 확인해 발행 포맷을 결정합니다.")}</p>
            <p class="next-step">${escapeHtml(item.nextStep)}</p>
            <div class="link-row">${links}</div>
          </div>
        </article>`;
};

const renderPolicy = (policy) => `<article class="policy-card">
          <span class="tag">${escapeHtml(policy.channel)}</span>
          <h3>${escapeHtml(policy.use)}</h3>
          <p>${escapeHtml(policy.limit)}</p>
          <p>${escapeHtml(policy.publishRule)}</p>
          <a href="${escapeHtml(policy.sourceUrl)}" target="_blank" rel="noreferrer">공식/참고 문서</a>
        </article>`;

const renderPage = ({ config, queue, summary, sourceHealth, automation }) => {
  const formats = formatById(config);
  const formatCounts = queue.reduce((counts, item) => {
    counts[item.formatId] = (counts[item.formatId] || 0) + 1;
    return counts;
  }, {});
  const generatedAt = new Date().toISOString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/intake/",
    "name": "바차타 소셜 인테이크",
    "description": config.dek,
    "inLanguage": "ko-KR",
    "dateModified": generatedAt,
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "about": ["바차타", "bachata", "Instagram", "YouTube", "서울 바차타", "센슈얼 바차타"]
  };

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>바차타 소셜 인테이크 | Bachata Korea</title>
    <meta name="description" content="Instagram, YouTube, Naver, 커뮤니티 신호를 한국 바차타 웹매거진의 기사, 행사, 프로필, 프로그램 발행 후보로 정규화하는 편집 큐.">
    <meta name="robots" content="index,follow,max-video-preview:-1,max-snippet:-1,max-image-preview:large">
    <link rel="canonical" href="https://bachata.co.kr/intake/">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/Pretendard/subsets/Pretendard-dynamic-subset.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css">
    <style>
      :root {
        color-scheme: dark;
        --bg: #08080a;
        --ink: #fff8ed;
        --paper: #f6f0e7;
        --paper-ink: #17120d;
        --muted: rgba(255, 248, 237, 0.68);
        --line: rgba(255, 248, 237, 0.14);
        --panel: rgba(255, 248, 237, 0.055);
        --gold: #d8a75e;
        --red: #b73b51;
        --blue: #53a7b7;
        --green: #60b891;
        font-family: Pretendard, "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(8, 8, 10, 0.9); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 18px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(64px, 11vw, 132px) max(18px, calc((100vw - 1180px) / 2)) 54px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid, .section-head { display: grid; grid-template-columns: minmax(0, 0.76fr) minmax(300px, 0.4fr); gap: clamp(22px, 4vw, 48px); align-items: end; }
      .eyebrow, .tag { color: var(--red); font-size: 12px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; }
      h1, h2, h3 { font-family: Paperlogy, Pretendard, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 900px; margin: 12px 0 18px; font-size: clamp(46px, 8.5vw, 104px); line-height: 0.94; overflow-wrap: anywhere; }
      .hero p { max-width: 760px; color: rgba(23, 18, 13, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .hero-note { padding: 22px; border: 1px solid rgba(23, 18, 13, 0.14); border-radius: 8px; background: rgba(255, 255, 255, 0.42); }
      .hero-note strong { display: block; margin-bottom: 10px; font-size: 20px; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .summary-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
      .summary-card, .format-card, .queue-card, .policy-card, .automation-card, .stage-card { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .summary-card { padding: 18px; }
      .summary-card strong { display: block; margin-top: 8px; font-family: Paperlogy, Pretendard, sans-serif; font-size: clamp(28px, 4vw, 46px); line-height: 1; }
      .section { margin-top: clamp(46px, 7vw, 80px); }
      .section-head { margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 66px); line-height: 1.02; }
      p { word-break: keep-all; overflow-wrap: anywhere; }
      .section-head p, .format-card p, .queue-card p, .policy-card p, .automation-card p, .stage-card p { color: var(--muted); line-height: 1.72; }
      .format-grid, .policy-grid, .automation-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .stage-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
      .format-card, .policy-card, .automation-card, .stage-card { padding: 20px; }
      .format-card h3, .policy-card h3, .automation-card h3, .stage-card h3 { margin: 10px 0; font-size: 24px; line-height: 1.12; }
      .stage-card strong { display: block; font-family: Paperlogy, Pretendard, sans-serif; font-size: clamp(34px, 5vw, 58px); line-height: 0.96; color: var(--gold); }
      .pill-row, .meta-row, .link-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .pill-row span, .meta-row span, .link-row a { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 248, 237, 0.78); font-size: 12px; font-weight: 900; }
      .queue-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .queue-card { overflow: hidden; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; background: #050505; }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .queue-body { padding: 20px; }
      .queue-body h3 { margin: 12px 0 10px; font-size: clamp(22px, 3vw, 32px); line-height: 1.08; overflow-wrap: anywhere; }
      .next-step { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); color: rgba(255, 248, 237, 0.86) !important; }
      .env-pill { display: inline-flex; width: fit-content; min-height: 30px; align-items: center; padding: 0 10px; border: 1px solid rgba(255, 248, 237, 0.16); border-radius: 999px; color: rgba(255, 248, 237, 0.8) !important; font-size: 12px; font-weight: 900; }
      .health-ok { color: var(--green) !important; }
      .health-watch, .health-untracked { color: var(--gold) !important; }
      .health-warn, .health-broken { color: #ff8aa3 !important; }
      .policy-card { background: var(--paper); color: var(--paper-ink); }
      .policy-card .tag { color: var(--blue); }
      .policy-card p { color: rgba(23, 18, 13, 0.72); }
      .policy-card a { display: inline-flex; margin-top: 6px; color: #7f2639; font-weight: 900; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head { grid-template-columns: 1fr; }
        .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .format-grid, .policy-grid, .automation-grid, .stage-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 760px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .summary-grid, .format-grid, .queue-grid, .policy-grid, .automation-grid, .stage-grid { grid-template-columns: 1fr; }
      }
    </style>
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="소셜 인테이크 이동">
        <a href="/radar/">Radar</a>
        <a href="/desk/">Desk</a>
        <a href="/briefs/">Briefs</a>
        <a href="/health/">Health</a>
      </nav>
    </header>
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Social Intake</span>
          <h1>소셜 신호를 바로 발행 후보로 바꾸는 큐</h1>
          <p>${escapeHtml(config.dek)} 센슈얼, 도미니칸, Bachata Influence, 한국 소셜, 기어, 행사 신호를 각각 맞는 콘텐츠 포맷으로 보냅니다.</p>
        </div>
        <aside class="hero-note">
          <strong>편집 원칙</strong>
          <p>${escapeHtml(config.principles[0])}</p>
          <p>출처 점검 기준 깨진 링크 ${escapeHtml(summary.brokenLinks)}개, 내부 페이지와 연결된 발행 후보 ${escapeHtml(summary.publishReady)}개입니다.</p>
        </aside>
      </div>
    </section>
    <main>
      <section class="summary-grid" aria-label="소셜 인테이크 요약">
        <article class="summary-card"><span class="tag">Queue</span><strong>${escapeHtml(summary.totalQueue)}</strong></article>
        <article class="summary-card"><span class="tag">Today</span><strong>${escapeHtml(summary.readyNow)}</strong></article>
        <article class="summary-card"><span class="tag">Review</span><strong>${escapeHtml(summary.needsReview)}</strong></article>
        <article class="summary-card"><span class="tag">Watch</span><strong>${escapeHtml(summary.watchOnly)}</strong></article>
        <article class="summary-card"><span class="tag">Videos</span><strong>${escapeHtml(summary.videos)}</strong></article>
        <article class="summary-card"><span class="tag">Broken</span><strong>${escapeHtml(summary.brokenLinks)}</strong></article>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Collection Stack</span>
            <h2>인스타에서 시작해 사이트 발행까지</h2>
          </div>
          <p>Graph API, hashtag watch, oEmbed, YouTube, Naver, 편집 watchlist를 역할별로 나눠 씁니다. 자동화는 후보를 만들고, 사이트에는 출처 확인이 끝난 맥락만 발행합니다.</p>
        </div>
        <div class="automation-grid">
          ${Object.entries(automation || {}).map(renderAutomationCard).join("\n          ")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Publishing Stages</span>
            <h2>큐를 그냥 쌓지 않고 발행 단계로 나눕니다</h2>
          </div>
          <p>유튜브가 살아 있고 내부 페이지와 연결된 후보는 바로 브리프에 올립니다. 인스타 기반 신호는 계정, 일정, 장소, 공지 원문을 확인한 뒤 기사나 프로필로 넘깁니다.</p>
        </div>
        <div class="stage-grid">
          ${[
            { label: "오늘 발행", count: summary.readyNow, body: "영상과 내부 연결이 있어 바로 브리프나 허브에 넣을 수 있는 후보입니다." },
            { label: "원문 검수", count: summary.needsReview, body: "인스타 공지, 계정명, 일정, 장소를 편집자가 확인해야 하는 후보입니다." },
            { label: "관찰", count: summary.watchOnly, body: "반복 신호가 쌓이는지 더 보며 주간 브리프로 넘길 후보입니다." },
            { label: "보류", count: summary.blocked, body: "링크 상태가 깨졌거나 공개 발행 근거가 부족해 제외한 후보입니다." }
          ].map(renderStageCard).join("\n          ")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Format Matrix</span>
            <h2>클릭 이후 보일 콘텐츠 구조</h2>
          </div>
          <p>센슈얼은 16개 펀더멘탈과 영상 기반 학습 프로그램으로, 도미니칸은 리듬·풋워크·음악성으로, 행사와 팀 신호는 이벤트와 프로필로 이어지게 설계했습니다.</p>
        </div>
        <div class="format-grid">
          ${(config.publishFormats || []).map((format) => renderFormat(format, formatCounts)).join("\n          ")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Priority Queue</span>
            <h2>오늘 발행 후보</h2>
          </div>
          <p>점수는 기존 watchlist 우선순위, 영상 여부, 관련 페이지 존재, source health 상태를 합산합니다. 인스타 신호는 원문 복제가 아니라 편집자가 확인할 링크로만 둡니다.</p>
        </div>
        <div class="queue-grid">
          ${queue.slice(0, 18).map((item) => renderQueueItem(item, formats)).join("\n          ")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Policy</span>
            <h2>수집과 발행의 선</h2>
          </div>
          <p>자동 수집은 후보를 만드는 데까지만 씁니다. 실제 글은 출처를 확인하고 한국 바차타 독자가 읽기 좋은 맥락으로 다시 작성합니다.</p>
        </div>
        <div class="policy-grid">
          ${(config.sourcePolicy || []).map(renderPolicy).join("\n          ")}
        </div>
      </section>
    </main>
  </body>
</html>
`;
};

const main = async () => {
  const [config, radar, signals, sourceHealth] = await Promise.all([
    readJson(dataPath),
    readJson(radarPath),
    readJson(signalsPath),
    readJson(sourceHealthPath)
  ]);

  const healthIndex = buildHealthIndex(sourceHealth);
  const queue = dedupeQueue([
    ...collectRadarItems(radar, config, healthIndex),
    ...collectSignalItems(signals, config, healthIndex)
  ]);
  const summary = summarize(queue, radar, sourceHealth);
  const formats = formatById(config);
  const generatedAt = new Date().toISOString();
  const automation = config.automation || radar.automation || {};

  const index = {
    generatedAt,
    updatedAt: config.updatedAt,
    title: config.title,
    url: "/intake/",
    summary,
    automation,
    stageCounts: summary.stages,
    publishFormats: (config.publishFormats || []).map((format) => ({
      id: format.id,
      label: format.label,
      target: format.target,
      cadence: format.cadence,
      queueCount: queue.filter((item) => item.formatId === format.id).length
    })),
    queue: queue.map((item) => ({
      ...item,
      publishFormat: formats.get(item.formatId)?.label || item.formatId,
      target: formats.get(item.formatId)?.target || ""
    })),
    sourcePolicy: config.sourcePolicy
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "index.html"), renderPage({ config, queue, summary, sourceHealth, automation }), "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${resolve(outDir, "index.html")}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
