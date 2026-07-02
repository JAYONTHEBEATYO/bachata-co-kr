import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/korea-scene.json");
const profilesPath = resolve(root, "data/profiles.json");
const boardPath = resolve(root, "data/board.json");
const eventsPath = resolve(root, "data/events.json");
const intakePath = resolve(root, "data/generated/social-intake-index.json");
const sourceHealthPath = resolve(root, "data/generated/source-health.json");
const outDir = resolve(root, "korea-scene");
const outputPath = resolve(root, "data/generated/korea-scene-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const optionalReadJson = async (path, fallback = {}) => {
  try {
    return await readJson(path);
  } catch {
    return fallback;
  }
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const videoEmbedUrl = (video = {}) => video?.id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}` : "";

const videoWatchUrl = (video = {}) => video?.id ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}` : "";

const renderVideo = (video, title = "Korea bachata scene video") => {
  if (!video?.id) return "";
  return `<div class="video-frame">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
};

const renderHeroPoster = (video = {}) => `<a class="hero-poster" href="${escapeHtml(videoWatchUrl(video))}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(video.title || "한국 바차타 현장 영상 보기")}">
          <span>영상으로 보기</span>
          <strong>${escapeHtml(video.title || "한국 바차타 영상")}</strong>
        </a>`;

const isExternal = (url = "") => /^https?:\/\//.test(url);

const compactText = (value) => {
  if (Array.isArray(value)) return value.map(compactText).join(" ");
  if (!value || typeof value !== "object") return String(value || "");
  return Object.values(value).map(compactText).join(" ");
};

const visibleTag = (tag = "") => ({
  "artist": "댄서",
  "club": "동호회",
  "community": "커뮤니티",
  "editorial-queue": "기획 노트",
  "event": "행사",
  "instagram-watch": "인스타그램",
  "korea": "한국",
  "learning": "배우기",
  "profile": "프로필",
  "ready": "바로 확인",
  "review": "추가 확인",
  "team": "팀",
  "venue": "장소",
  "watch": "확인 중",
  "youtube": "YouTube"
}[String(tag).toLowerCase()] || tag);

const matchesKeywords = (item, keywords = []) => {
  const haystack = compactText(item).toLowerCase();
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
};

const healthMap = (sourceHealth = {}) => {
  const map = new Map();
  for (const item of sourceHealth.results || []) {
    if (item.url) map.set(item.url, item.status);
    if (item.videoId) map.set(`youtube:${item.videoId}`, item.status);
  }
  return map;
};

const statusFor = (item, health) => {
  if (item.sourceUrl && health.has(item.sourceUrl)) return health.get(item.sourceUrl);
  if (item.videoId && health.has(`youtube:${item.videoId}`)) return health.get(`youtube:${item.videoId}`);
  return item.sourceUrl?.includes("instagram.com") ? "watch" : "ok";
};

const statusLabel = (status = "") => ({
  ok: "확인됨",
  watch: "확인 중",
  untracked: "확인 중",
  warn: "재확인 필요",
  broken: "링크 점검 중"
}[status] || status);

const profileToCard = (profile, health) => ({
  id: profile.id,
  label: profile.category === "venues" ? "장소" : "프로필",
  title: profile.title,
  description: profile.subtitle || profile.summary?.[0] || "",
  url: `/profiles/${profile.id}.html`,
  sourceUrl: profile.sourceLinks?.[0]?.url || "",
  videoId: profile.heroVideo?.id || "",
  tags: profile.tags || [],
  location: profile.location || "한국",
  health: statusFor({
    sourceUrl: profile.sourceLinks?.[0]?.url,
    videoId: profile.heroVideo?.id
  }, health)
});

const boardToCard = (entry, health) => ({
  id: entry.id,
  label: "게시판",
  title: entry.title,
  description: entry.description || entry.summary || "제보와 운영 보드로 이어지는 한국 바차타 커뮤니티 항목입니다.",
  url: `/community/${entry.category}.html`,
  sourceUrl: entry.sourceLinks?.[0]?.url || "",
  videoId: "",
  tags: entry.tags || [],
  location: entry.location || "한국",
  health: statusFor({ sourceUrl: entry.sourceLinks?.[0]?.url }, health)
});

const eventToCard = (event, health) => ({
  id: event.id,
  label: event.status === "archive" ? "Archive" : "Event",
  title: event.title,
  description: event.summary || event.whyItMatters || "",
  url: `/events/${event.id}.html`,
  sourceUrl: event.sourceLinks?.[0]?.url || "",
  videoId: event.video?.id || "",
  tags: [event.category, event.status, event.city].filter(Boolean),
  location: [event.city, event.venue].filter(Boolean).join(" · "),
  health: statusFor({
    sourceUrl: event.sourceLinks?.[0]?.url,
    videoId: event.video?.id
  }, health)
});

const intakeToCard = (item, health) => ({
  id: item.id,
  label: item.publishFormat || "소식",
  title: item.title,
  description: item.beat || item.searchIntent || item.healthNote || "소셜 소식에서 들어온 확인 대상입니다.",
  url: item.relatedUrl || item.target || "/community/",
  sourceUrl: item.sourceUrl || "",
  videoId: item.videoId || "",
  tags: [item.type, item.role, item.watchlist].map(visibleTag).filter(Boolean),
  location: "한국 바차타 소식",
  health: item.healthStatus || statusFor(item, health)
});

const dedupeCards = (cards) => {
  const map = new Map();
  for (const card of cards) {
    const key = card.url || card.sourceUrl || card.id;
    if (!map.has(key)) map.set(key, card);
  }
  return [...map.values()];
};

const buildLensCards = ({ lens, profiles, boardEntries, events, intakeQueue, health }) => {
  const cards = [];
  for (const profile of profiles) {
    if (lens.profileCategories?.includes(profile.category)) {
      cards.push(profileToCard(profile, health));
    }
  }
  for (const entry of boardEntries) {
    const boardCategoryMatch = lens.boardCategories?.includes(entry.category);
    const needsKeywordMatch = ["teams", "venues"].includes(lens.id);
    if (boardCategoryMatch && (!needsKeywordMatch || matchesKeywords(entry, lens.keywords))) {
      cards.push(boardToCard(entry, health));
    }
  }
  for (const event of events) {
    if (lens.eventStatuses?.includes(event.status)) {
      cards.push(eventToCard(event, health));
    }
  }
  for (const item of intakeQueue) {
    const target = item.relatedUrl || item.target || "";
    const text = compactText(item);
    const isKoreaSignal = /korea|seoul|한국|서울|강남|홍대|라틴씨엘로|에버라틴|bonita|latin cielo/i.test(text);
    const matchesLens = matchesKeywords(item, lens.keywords);
    const role = item.role || "";
    const shouldInclude = lens.id === "teams"
      ? target.startsWith("/profiles/") && matchesLens && ["team", "club", "artist"].includes(role)
      : lens.id === "venues"
        ? (target.startsWith("/profiles/") || target.startsWith("/community/venues")) && (role === "venue" || /bonita|보니따|홍대|강남/i.test(text))
        : lens.id === "events"
          ? target.startsWith("/events/") || target.startsWith("/community/events")
          : lens.id === "community"
            ? target.startsWith("/community/") || (isKoreaSignal && matchesLens)
            : isKoreaSignal && matchesLens;
    if (shouldInclude) {
      cards.push(intakeToCard(item, health));
    }
  }
  return dedupeCards(cards).slice(0, 12);
};

const renderCard = (card) => {
  const sourceLink = card.sourceUrl
    ? `<a href="${escapeHtml(card.sourceUrl)}"${isExternal(card.sourceUrl) ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>출처</a>`
    : "";
  const tags = card.tags.slice(0, 4).map((tag) => `<span>${escapeHtml(visibleTag(tag))}</span>`).join("");
  const video = card.videoId ? renderVideo({ id: card.videoId, title: card.title }) : "";
  return `<article class="scene-card">
          ${video ? `${video}
          ` : ""}<div class="scene-card-body">
            <div class="meta-row">
              <span>${escapeHtml(card.label)}</span>
              <span class="health-${escapeHtml(card.health)}">${escapeHtml(statusLabel(card.health))}</span>
            </div>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description)}</p>
            <div class="tag-row">${tags}</div>
            <div class="link-row">
              <a href="${escapeHtml(card.url)}">자세히</a>
              ${sourceLink}
            </div>
          </div>
        </article>`;
};

const renderLens = (lens) => `<section class="section" id="${escapeHtml(lens.id)}">
        <div class="section-head">
          <div>
            <span class="eyebrow">${escapeHtml(lens.label)}</span>
            <h2>${escapeHtml(lens.title)}</h2>
          </div>
          <p>${escapeHtml(lens.description)}</p>
        </div>
        <div class="scene-grid">
          ${lens.cards.map(renderCard).join("\n          ")}
        </div>
      </section>`;

const renderPage = ({ config, lenses, summary, sourceHealth }) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/korea-scene/",
    "name": config.title,
    "description": config.dek,
    "inLanguage": "ko-KR",
    "dateModified": new Date().toISOString(),
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "about": ["한국 바차타", "서울 바차타", "바차타 소셜", "바차타 동호회", "바차타 내한"]
  };

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(config.title)} | Bachata Korea</title>
    <meta name="description" content="${escapeHtml(config.dek)}">
    <meta name="robots" content="index,follow,max-video-preview:-1,max-snippet:-1,max-image-preview:large">
    <link rel="canonical" href="https://bachata.co.kr/korea-scene/">
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
        --panel-strong: #17130f;
        --gold: #d8a75e;
        --red: #b73b51;
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
      .hero { padding: clamp(62px, 10vw, 122px) max(18px, calc((100vw - 1180px) / 2)) 54px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.75fr) minmax(330px, 0.48fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--red); font-size: 12px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; }
      h1, h2, h3 { font-family: Paperlogy, Pretendard, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 900px; margin: 12px 0 18px; font-size: clamp(46px, 8.4vw, 102px); line-height: 0.94; overflow-wrap: anywhere; }
      .hero p { max-width: 790px; color: rgba(23, 18, 13, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; word-break: keep-all; overflow-wrap: anywhere; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .hero .video-frame { border-color: rgba(23, 18, 13, 0.16); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22); }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .hero-poster { position: relative; display: grid; align-content: end; width: 100%; min-height: clamp(230px, 28vw, 340px); overflow: hidden; padding: 24px; border: 1px solid rgba(23, 18, 13, 0.16); border-radius: 8px; color: #fff8ed; background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.72)), url("/assets/bachata-seoul-hero.png") center / cover; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22); }
      .hero-poster::before { content: ""; position: absolute; right: 22px; top: 22px; width: 58px; height: 58px; border-radius: 50%; background: rgba(255, 248, 237, 0.92); box-shadow: 0 10px 30px rgba(0,0,0,0.26); }
      .hero-poster::after { content: ""; position: absolute; right: 42px; top: 39px; border-left: 17px solid #17120d; border-top: 11px solid transparent; border-bottom: 11px solid transparent; }
      .hero-poster span, .hero-poster strong { position: relative; z-index: 1; }
      .hero-poster span { color: var(--gold); font-size: 12px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; }
      .hero-poster strong { display: block; max-width: 360px; margin-top: 8px; font-family: Paperlogy, Pretendard, sans-serif; font-size: clamp(22px, 3vw, 34px); line-height: 1.05; }
      .quick-nav, .summary-grid, .meta-row, .tag-row, .link-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 24px; }
      .quick-nav a, .link-row a, .meta-row span, .tag-row span { display: inline-flex; align-items: center; min-height: 32px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 248, 237, 0.78); font-size: 12px; font-weight: 900; }
      .hero .quick-nav a { border-color: rgba(23, 18, 13, 0.22); color: #4c3427; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
      .summary-card, .scene-card, .policy-card { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .summary-card { padding: 18px; }
      .summary-card strong { display: block; margin-top: 8px; font-family: Paperlogy, Pretendard, sans-serif; font-size: clamp(30px, 4vw, 48px); line-height: 1; }
      .section { margin-top: clamp(46px, 7vw, 80px); }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 66px); line-height: 1.02; }
      .section-head p, .scene-card p, .policy-card p { color: var(--muted); line-height: 1.72; word-break: keep-all; overflow-wrap: anywhere; }
      .scene-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .scene-card { overflow: hidden; background: var(--panel-strong); }
      .scene-card-body { display: grid; align-content: start; gap: 12px; padding: 20px; }
      .scene-card h3 { margin: 0; font-size: clamp(22px, 3vw, 31px); line-height: 1.08; overflow-wrap: anywhere; }
      .health-ok { color: var(--green) !important; }
      .health-watch, .health-untracked { color: var(--gold) !important; }
      .health-warn, .health-broken { color: #ff8aa3 !important; }
      .policy-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .policy-card { padding: 22px; background: var(--paper); color: var(--paper-ink); }
      .policy-card p { color: rgba(23, 18, 13, 0.72); }
      .policy-card h3 { margin: 10px 0; font-size: 24px; line-height: 1.12; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head { grid-template-columns: 1fr; }
        .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .scene-grid, .policy-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 760px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .summary-grid, .scene-grid, .policy-grid { grid-template-columns: 1fr; }
      }
    </style>
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="한국 바차타 페이지 이동">
        <a href="/profiles/">프로필</a>
        <a href="/events/">행사</a>
        <a href="/community/">커뮤니티</a>
        <a href="/briefs/">브리핑</a>
      </nav>
    </header>
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">국내 소식</span>
          <h1>${escapeHtml(config.title)}</h1>
          <p>${escapeHtml(config.dek)} 흩어진 팀·장소·동호회·페스티벌 정보를 한 화면에 모아, 처음 찾는 사람도 어디서 배우고 어디로 가면 좋을지 한눈에 볼 수 있게 정리합니다.</p>
          <div class="quick-nav">
            ${lenses.map((lens) => `<a href="#${escapeHtml(lens.id)}">${escapeHtml(lens.label)}</a>`).join("")}
            <a href="/submit/">제보하기</a>
          </div>
        </div>
        ${renderHeroPoster(config.heroVideo)}
      </div>
    </section>
    <main>
      <section class="summary-grid" aria-label="한국 바차타 요약">
        <article class="summary-card"><span class="tag">프로필</span><strong>${escapeHtml(summary.profiles)}</strong></article>
        <article class="summary-card"><span class="tag">행사</span><strong>${escapeHtml(summary.events)}</strong></article>
        <article class="summary-card"><span class="tag">게시판</span><strong>${escapeHtml(summary.board)}</strong></article>
        <article class="summary-card"><span class="tag">소식</span><strong>${escapeHtml(summary.signals)}</strong></article>
        <article class="summary-card"><span class="tag">링크 점검</span><strong>${escapeHtml(summary.brokenLinks)}</strong></article>
      </section>
      ${lenses.map(renderLens).join("\n      ")}
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">확인 기준</span>
            <h2>국내 바차타 소식을 다룰 때 지키는 기준</h2>
          </div>
          <p>홍보문을 그대로 붙이지 않고 영상, 공식 링크, 인스타그램 계정, 제보 내용을 나눠 확인합니다. 출처가 불확실한 정보는 확인될 때까지 공개하지 않습니다.</p>
        </div>
        <div class="policy-grid">
          ${config.sourcePolicy.map((item) => `<article class="policy-card"><span class="tag">${escapeHtml(item.label)}</span><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.body)}</p></article>`).join("\n          ")}
        </div>
      </section>
    </main>
  </body>
</html>`;
};

const main = async () => {
  const [config, profilesData, boardData, eventsData, intakeData, sourceHealth] = await Promise.all([
    readJson(dataPath),
    readJson(profilesPath),
    readJson(boardPath),
    readJson(eventsPath),
    optionalReadJson(intakePath, { queue: [] }),
    optionalReadJson(sourceHealthPath, { summary: {}, results: [] })
  ]);

  const health = healthMap(sourceHealth);
  const profiles = profilesData.profiles || [];
  const boardEntries = boardData.entries || [];
  const events = eventsData.radar || [];
  const intakeQueue = intakeData.queue || [];
  const lenses = config.lenses.map((lens) => ({
    ...lens,
    cards: buildLensCards({ lens, profiles, boardEntries, events, intakeQueue, health })
  }));
  const summary = {
    profiles: profiles.filter((profile) => ["korea-scene", "venues"].includes(profile.category)).length,
    events: events.length,
    board: boardEntries.length,
    signals: intakeQueue.filter((item) => /korea|seoul|한국|서울|강남|홍대|라틴씨엘로|에버라틴|bonita/i.test(compactText(item))).length,
    brokenLinks: sourceHealth.summary?.broken || 0
  };

  const index = {
    generatedAt: new Date().toISOString(),
    updatedAt: config.updatedAt,
    title: config.title,
    url: "/korea-scene/",
    summary,
    lenses: lenses.map((lens) => ({
      id: lens.id,
      label: lens.label,
      title: lens.title,
      url: `/korea-scene/#${lens.id}`,
      cards: lens.cards.map((card) => ({
        label: card.label,
        title: card.title,
        url: card.url,
        sourceUrl: card.sourceUrl,
        videoId: card.videoId,
        health: card.health
      }))
    }))
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "index.html"), renderPage({ config, lenses, summary, sourceHealth }), "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${resolve(outDir, "index.html")}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
