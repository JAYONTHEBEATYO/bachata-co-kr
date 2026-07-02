import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/korea-scene.json");
const profilesPath = resolve(root, "data/profiles.json");
const boardPath = resolve(root, "data/board.json");
const eventsPath = resolve(root, "data/events.json");
const outDir = resolve(root, "korea-scene");
const outputPath = resolve(root, "data/generated/korea-scene-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const isExternal = (url = "") => /^https?:\/\//.test(url);
const pageUrl = (path) => `https://bachata.co.kr${path}`;

const videoEmbedUrl = (video = {}) => video?.id
  ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`
  : "";

const youtubeThumb = (videoId) => videoId
  ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
  : "";

const videoWatchUrl = (video = {}) => video?.id
  ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`
  : "";

const renderVideo = (video, title = "바차타 참고 영상") => {
  if (!video?.id) return "";
  return `<div class="video-frame">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
};

const renderVideoLoader = (video, title = "바차타 참고 영상") => {
  if (!video?.id) return "";
  const videoTitle = escapeHtml(video.title || title);
  return `<div class="video-loader" data-embed="${escapeHtml(videoEmbedUrl(video))}" data-title="${videoTitle}">
            <button type="button" data-video-button aria-label="${videoTitle} 영상 열기">
              <img loading="lazy" src="${escapeHtml(youtubeThumb(video.id))}" alt="">
              <span>Play</span>
            </button>
            <a class="youtube-link" href="${escapeHtml(videoWatchUrl(video))}" target="_blank" rel="noreferrer">YouTube</a>
          </div>`;
};

const firstSource = (links = []) => links.find((link) => isExternal(link.url)) || links[0] || null;

const profileCard = (profile) => ({
  id: profile.id,
  label: profile.category === "venues" ? "장소" : "팀·댄서",
  title: profile.title,
  description: profile.subtitle || profile.summary?.[0] || "공개 영상과 공식 링크 기준으로 정리한 국내 바차타 프로필입니다.",
  url: `/profiles/${profile.id}.html`,
  sourceUrl: firstSource(profile.sourceLinks)?.url || "",
  sourceLabel: firstSource(profile.sourceLinks)?.label || "공식 링크",
  video: profile.heroVideo || null,
  tags: profile.tags || []
});

const eventCard = (event) => ({
  id: event.id,
  label: event.status === "archive" ? "기록" : "행사",
  title: event.title,
  description: event.summary || event.whyItMatters || "공식 링크와 일정 기준으로 확인한 바차타 행사입니다.",
  url: `/events/${event.id}.html`,
  sourceUrl: firstSource(event.sourceLinks)?.url || "",
  sourceLabel: firstSource(event.sourceLinks)?.label || "공식 링크",
  video: event.video || null,
  tags: [event.city, event.category, event.status].filter(Boolean)
});

const boardCard = (entry) => ({
  id: entry.id,
  label: "커뮤니티",
  title: entry.title,
  description: entry.summary || "제보를 바탕으로 정리한 한국 바차타 커뮤니티 항목입니다.",
  url: `/community/${entry.category}.html#${entry.id}`,
  sourceUrl: firstSource(entry.sourceLinks)?.url || "",
  sourceLabel: firstSource(entry.sourceLinks)?.label || "제보 링크",
  video: null,
  tags: entry.tags || []
});

const buildCards = ({ lens, profiles, boardEntries, events }) => {
  if (lens.id === "teams") {
    return profiles
      .filter((profile) => profile.category === "korea-scene")
      .map(profileCard)
      .slice(0, 12);
  }

  if (lens.id === "venues") {
    const venueProfiles = profiles
      .filter((profile) => profile.category === "venues")
      .map(profileCard);
    const venueBoard = boardEntries
      .filter((entry) => /보니따|라틴씨엘로|에버라틴|라스트댄스|장소|팀/.test(`${entry.title} ${entry.summary} ${(entry.tags || []).join(" ")}`))
      .map(boardCard);
    return [...venueProfiles, ...venueBoard].slice(0, 12);
  }

  if (lens.id === "events") {
    return events
      .filter((event) => event.regionScope !== "overseas")
      .map(eventCard)
      .slice(0, 12);
  }

  if (lens.id === "community") {
    return boardEntries.map(boardCard).slice(0, 12);
  }

  return [];
};

const renderTags = (tags = []) => tags.slice(0, 4)
  .map((tag) => `<span>${escapeHtml(tag)}</span>`)
  .join("");

const renderLinks = (card) => {
  const source = card.sourceUrl
    ? `<a href="${escapeHtml(card.sourceUrl)}"${isExternal(card.sourceUrl) ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(card.sourceLabel)}</a>`
    : "";
  return `<div class="link-row">
            <a href="${escapeHtml(card.url)}">자세히 보기</a>
            ${source}
          </div>`;
};

const renderCard = (card) => `<article class="scene-card">
          ${renderVideoLoader(card.video, card.title)}
          <div class="scene-card-body">
            <span class="tag">${escapeHtml(card.label)}</span>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description)}</p>
            <div class="tag-row">${renderTags(card.tags)}</div>
            ${renderLinks(card)}
          </div>
        </article>`;

const renderLens = (lens, options = {}) => `<section class="section${options.lead ? " scene-lead" : ""}" id="${escapeHtml(lens.id)}">
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

const renderPage = ({ config, lenses, summary }) => {
  const heroVideo = config.heroVideo || { id: "nrJM-arshvE", title: "한국 바차타 소셜 참고 영상" };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/korea-scene/",
    name: config.title,
    description: config.dek,
    inLanguage: "ko-KR",
    dateModified: new Date().toISOString(),
    isPartOf: { "@id": "https://bachata.co.kr/#website" },
    about: ["한국 바차타", "서울 바차타", "바차타 소셜", "바차타 동호회", "바차타 내한"]
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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/complete/WantedSansVariable.css">
    <style>
      :root {
        color-scheme: light;
        --ink: #171412;
        --paper: #f6f3ee;
        --panel: #fffdf8;
        --muted: #6f675f;
        --line: rgba(23, 20, 18, 0.13);
        --accent: #176f65;
        --wine: #a33552;
        --gold: #c28a38;
        font-family: "Pretendard Variable", Pretendard, "Wanted Sans Variable", "Wanted Sans", "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(255, 253, 248, 0.94); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--accent); font-size: 12px; font-weight: 900; letter-spacing: 0; text-transform: uppercase; }
      .nav-links { display: flex; gap: 18px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(62px, 10vw, 122px) max(18px, calc((100vw - 1180px) / 2)) 54px; background: var(--panel); border-bottom: 1px solid var(--line); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.75fr) minmax(330px, 0.48fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0; text-transform: uppercase; }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 900px; margin: 12px 0 18px; font-size: clamp(46px, 8.4vw, 102px); line-height: 0.94; overflow-wrap: anywhere; }
      .hero p { max-width: 790px; color: var(--muted); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; word-break: keep-all; overflow-wrap: anywhere; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .quick-nav, .summary-grid, .tag-row, .link-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 24px; }
      .quick-nav a, .link-row a, .tag-row span, .summary-card span { display: inline-flex; align-items: center; min-height: 32px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: #4c4640; font-size: 12px; font-weight: 900; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .summary-card, .scene-card, .policy-card { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .summary-card { padding: 18px; }
      .summary-card strong { display: block; margin-top: 8px; font-size: clamp(30px, 4vw, 48px); line-height: 1; }
      .section { margin-top: clamp(46px, 7vw, 80px); }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 66px); line-height: 1.02; }
      .section-head p, .scene-card p, .policy-card p { color: var(--muted); line-height: 1.72; word-break: keep-all; overflow-wrap: anywhere; }
      .scene-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .scene-card { overflow: hidden; }
      .scene-card-body { display: grid; align-content: start; gap: 12px; padding: 20px; }
      .scene-card h3 { margin: 0; font-size: clamp(22px, 3vw, 31px); line-height: 1.08; overflow-wrap: anywhere; }
      .policy-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .policy-card { padding: 22px; }
      .policy-card h3 { margin: 10px 0; font-size: 24px; line-height: 1.12; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head { grid-template-columns: 1fr; }
        .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
      <nav class="nav-links" aria-label="국내 소식 이동">
        <a href="/profiles/">댄서 소개</a>
        <a href="/events/">페스티벌 정보</a>
        <a href="/community/">커뮤니티</a>
        <a href="/briefs/">최신소식</a>
      </nav>
    </header>
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">국내 소식</span>
          <h1>${escapeHtml(config.title)}</h1>
          <p>${escapeHtml(config.dek)} 흩어진 팀·장소·동호회·페스티벌 정보를 한 화면에 모아, 처음 찾는 사람도 어디서 배우고 어디로 가면 좋을지 바로 볼 수 있게 정리합니다.</p>
          <div class="quick-nav">
            ${lenses.map((lens) => `<a href="#${escapeHtml(lens.id)}">${escapeHtml(lens.label)}</a>`).join("")}
            <a href="/submit/">제보하기</a>
          </div>
        </div>
        ${renderVideoLoader(heroVideo, heroVideo.title)}
      </div>
    </section>
    <main>
      ${lenses.map((lens, index) => renderLens(lens, { lead: index === 0 })).join("\n      ")}
      <section class="summary-grid" aria-label="국내 바차타 요약">
        <article class="summary-card"><span>팀·댄서</span><strong>${summary.teams}</strong></article>
        <article class="summary-card"><span>행사</span><strong>${summary.events}</strong></article>
        <article class="summary-card"><span>커뮤니티 항목</span><strong>${summary.board}</strong></article>
        <article class="summary-card"><span>장소·팀 제보</span><strong>${summary.localItems}</strong></article>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">확인 기준</span>
            <h2>국내 바차타 소식을 다루는 방식</h2>
          </div>
          <p>홍보 문구를 그대로 옮기지 않고, 영상·공식 링크·제보 내용을 확인해 독자가 바로 쓸 수 있는 정보로 다시 정리합니다.</p>
        </div>
        <div class="policy-grid">
          ${(config.sourcePolicy || []).map((item) => `<article class="policy-card"><span class="tag">${escapeHtml(item.label)}</span><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.body)}</p></article>`).join("\n          ")}
        </div>
      </section>
    </main>
  </body>
</html>`;
};

const main = async () => {
  const [config, profilesData, boardData, eventsData] = await Promise.all([
    readJson(dataPath),
    readJson(profilesPath),
    readJson(boardPath),
    readJson(eventsPath)
  ]);

  const profiles = profilesData.profiles || [];
  const boardEntries = boardData.entries || [];
  const events = eventsData.radar || [];
  const lenses = (config.lenses || []).map((lens) => ({
    ...lens,
    cards: buildCards({ lens, profiles, boardEntries, events })
  }));
  const summary = {
    teams: profiles.filter((profile) => profile.category === "korea-scene").length,
    events: events.filter((event) => event.regionScope !== "overseas").length,
    board: boardEntries.length,
    localItems: boardEntries.filter((entry) => entry.category === "promo").length
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
        videoId: card.video?.id || null
      }))
    }))
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "index.html"), renderPage({ config, lenses, summary }), "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${resolve(outDir, "index.html")}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
