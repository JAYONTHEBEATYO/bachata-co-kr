import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/style-guides.json");
const articlesPath = resolve(root, "data/articles.json");
const programsPath = resolve(root, "data/programs.json");
const profilesPath = resolve(root, "data/profiles.json");
const eventsPath = resolve(root, "data/events.json");
const gearPath = resolve(root, "data/gear.json");
const socialIntakePath = resolve(root, "data/generated/social-intake-index.json");
const outDir = resolve(root, "styles");
const indexPath = resolve(root, "data/generated/style-index.json");

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

const pagePath = (guide) => `/styles/${guide.id}.html`;
const pageUrl = (guide) => `https://bachata.co.kr${pagePath(guide)}`;

const videoEmbedUrl = (video = {}) => {
  const start = video.start ? `?start=${encodeURIComponent(video.start)}` : "";
  return `https://www.youtube-nocookie.com/embed/${escapeHtml(video.id)}${start}`;
};

const videoWatchUrl = (video = {}) => {
  const start = video.start ? `&t=${encodeURIComponent(video.start)}s` : "";
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}${start}`;
};

const youtubeThumb = (videoId) => videoId
  ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
  : "";

const renderLinks = (links = []) => links.map((link) => {
  const external = /^https?:\/\//.test(link.url);
  return `<a href="${escapeHtml(link.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
}).join("");

const renderVideo = (video, className = "video-frame") => {
  if (!video?.id) return "";
  return `<div class="${className}">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || "Bachata reference video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
};

const renderVideoLoader = (video, className = "video-loader") => {
  if (!video?.id) return "";
  return `<div class="${className}" data-embed="${escapeHtml(videoEmbedUrl(video))}" data-title="${escapeHtml(video.title || "Bachata reference video")}">
            <button type="button" data-video-button aria-label="${escapeHtml(video.title || "Bachata reference video")} 영상 열기">
              <img loading="lazy" src="${escapeHtml(youtubeThumb(video.id))}" alt="">
              <span>Play</span>
            </button>
            <a class="youtube-link" href="${escapeHtml(videoWatchUrl(video))}" target="_blank" rel="noreferrer">YouTube</a>
          </div>`;
};

const renderContentCard = (item, options = {}) => {
  const url = escapeHtml(item.url);
  const sourceLink = item.sourceUrl && /^https?:\/\//.test(item.sourceUrl)
    ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">출처</a>`
    : "";
  const thumb = item.videoId
    ? `<a class="content-thumb" href="${url}" aria-label="${escapeHtml(item.title)} 보기">
          <img loading="lazy" src="${escapeHtml(youtubeThumb(item.videoId))}" alt="">
          <span>영상 포함</span>
        </a>`
    : "";
  const links = [
    `<a href="${url}">${escapeHtml(options.cta || item.cta || "콘텐츠 보기")}</a>`,
    sourceLink
  ].filter(Boolean).join("\n                  ");

  return `<article class="content-card${item.videoId ? " has-video" : ""}">
                ${thumb ? `${thumb}\n                ` : ""}<div>
                  <span class="tag">${escapeHtml(item.label)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.description || "관련 기사와 영상 자료를 이어서 볼 수 있는 콘텐츠입니다.")}</p>
                </div>
                <div class="link-row">
                  ${links}
                </div>
              </article>`;
};

const styleTerms = {
  sensual: ["sensual", "센슈얼", "korke", "judith", "코르케", "주디스", "16", "onda", "wave", "body roll"],
  dominican: ["dominican", "도미니칸", "rhythm", "리듬", "footwork", "풋워크", "tap", "syncopation", "bachata dance"],
  modern: ["modern", "모던", "starter", "입문", "basic", "베이직", "fusion", "social", "소셜"],
  influence: ["influence", "인플루언스", "melvin", "gatica", "emilien", "tehina", "academy", "musicality"],
  bachazouk: ["bachazouk", "bacha zouk", "바차주크", "zouk", "brazilian zouk", "head movement"]
};

const compactText = (value) => {
  if (Array.isArray(value)) return value.map(compactText).join(" ");
  if (!value || typeof value !== "object") return String(value || "");
  return Object.values(value).map(compactText).join(" ");
};

const termsForGuide = (guide) => [
  guide.id,
  guide.eyebrow,
  guide.title,
  ...(guide.keywords || []),
  ...(styleTerms[guide.id] || [])
]
  .filter(Boolean)
  .map((term) => String(term).toLowerCase());

const relatedScore = (guide, item) => {
  const haystack = compactText(item).toLowerCase();
  return termsForGuide(guide).reduce((score, term) => {
    if (!term || term.length < 2) return score;
    if (haystack.includes(term)) return score + (term.length > 8 ? 12 : 8);
    return score;
  }, 0);
};

const makeRelatedItem = ({ label, title, description, url, videoId, sourceUrl, score }) => ({
  label,
  title,
  description,
  url,
  videoId: videoId || null,
  sourceUrl: sourceUrl || "",
  score
});

const buildRelatedContent = (guide, context) => {
  const items = [];
  const addScored = (item, raw) => {
    if (!item.url || item.url === pagePath(guide)) return;
    const score = relatedScore(guide, raw);
    if (score <= 0) return;
    items.push({ ...item, score });
  };

  for (const article of context.articles) {
    addScored(makeRelatedItem({
      label: "Article",
      title: article.title,
      description: article.dek || article.summary?.[0] || "",
      url: `/articles/${article.slug}.html`,
      videoId: article.heroVideo?.id,
      sourceUrl: article.sourceLinks?.[0]?.url
    }), article);
  }

  for (const program of context.programs) {
    addScored(makeRelatedItem({
      label: "Program",
      title: program.title,
      description: program.dek || program.modules?.[0]?.description || "",
      url: `/programs/${program.id}.html`,
      videoId: program.heroVideo?.id,
      sourceUrl: program.modules?.find((module) => /^https?:\/\//.test(module.url || ""))?.url
    }), program);
  }

  for (const profile of context.profiles) {
    addScored(makeRelatedItem({
      label: "Profile",
      title: profile.title,
      description: profile.subtitle || profile.summary?.[0] || "",
      url: `/profiles/${profile.id}.html`,
      videoId: profile.heroVideo?.id,
      sourceUrl: profile.sourceLinks?.[0]?.url
    }), profile);
  }

  for (const event of context.events) {
    addScored(makeRelatedItem({
      label: "Event",
      title: event.title,
      description: event.summary || event.whyItMatters || "",
      url: `/events/${event.id}.html`,
      videoId: event.video?.id,
      sourceUrl: event.sourceLinks?.[0]?.url
    }), event);
  }

  for (const product of context.gear) {
    addScored(makeRelatedItem({
      label: "Gear",
      title: product.koreanName ? `${product.koreanName} / ${product.brand}` : product.brand,
      description: product.summary || product.positioning || "",
      url: `/gear/${product.id}.html`,
      videoId: product.video?.id,
      sourceUrl: product.links?.[0]?.url
    }), product);
  }

  for (const queueItem of context.intakeQueue) {
    addScored(makeRelatedItem({
      label: queueItem.publishFormat || "Signal",
      title: queueItem.title,
      description: queueItem.beat || queueItem.searchIntent || queueItem.healthNote || "",
      url: queueItem.relatedUrl || queueItem.target || queueItem.sourceUrl,
      videoId: queueItem.videoId,
      sourceUrl: queueItem.sourceUrl
    }), queueItem);
  }

  const deduped = new Map();
  for (const item of items) {
    const existing = deduped.get(item.url);
    if (!existing || item.score > existing.score) deduped.set(item.url, item);
  }

  return [...deduped.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "ko"))
    .slice(0, 8);
};

const head = ({ title, description, canonical }) => `    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-video-preview:-1,max-snippet:-1,max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/complete/WantedSansVariable.css">`;

const styles = `    <style>
      :root {
        color-scheme: dark;
        --bg: #0c0b09;
        --ink: #fff7e8;
        --muted: rgba(255, 247, 232, 0.68);
        --line: rgba(255, 247, 232, 0.14);
        --panel: rgba(255, 247, 232, 0.06);
        --panel-strong: #17130f;
        --gold: #e2ad58;
        --wine: #a72c4d;
        --green: #58a999;
        font-family: "Pretendard Variable", Pretendard, "Wanted Sans Variable", "Wanted Sans", "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(12, 11, 9, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 20px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(64px, 10vw, 126px) max(18px, calc((100vw - 1180px) / 2)) 46px; background: #f3ede3; color: #18130d; }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.78fr) minmax(320px, 0.46fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 900px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 98px); line-height: 0.95; overflow-wrap: anywhere; }
      .hero p { max-width: 780px; color: rgba(24, 19, 13, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .hero .video-frame { border-color: rgba(24, 19, 13, 0.16); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22); }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .quick-nav, .link-row, .tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 26px; }
      .quick-nav a, .link-row a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .summary p, .guide-card p, .section-card p, .watch-card p { color: var(--muted); line-height: 1.72; }
      .guide-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
      .guide-card { display: grid; min-height: 320px; align-content: space-between; gap: 18px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .guide-card h2 { margin: 10px 0 0; font-size: 28px; line-height: 1.05; }
      .guide-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 22px; align-items: start; }
      .main-stack, .side-stack { display: grid; gap: 16px; }
      .summary, .section-card, .watch-card, .side-box { padding: clamp(20px, 4vw, 30px); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .summary { background: rgba(226, 173, 88, 0.08); }
      .section-card h2 { margin: 8px 0 12px; font-size: clamp(30px, 4vw, 46px); line-height: 1.06; }
      .section-card ul { display: grid; gap: 8px; margin: 16px 0 0; padding-left: 20px; color: rgba(255, 247, 232, 0.76); line-height: 1.65; }
      .watch-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .watch-card { padding: 0; overflow: hidden; background: var(--panel-strong); }
      .watch-card-body { padding: 18px; }
      .watch-card h3 { margin: 8px 0 10px; font-size: 24px; line-height: 1.08; }
      .video-loader { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border-bottom: 1px solid var(--line); background: #050505; }
      .video-loader button { all: unset; position: absolute; inset: 0; display: block; cursor: pointer; }
      .video-loader img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.9) contrast(1.08); transform: scale(1.02); transition: transform 180ms ease; }
      .video-loader button::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5, 5, 5, 0.08), rgba(5, 5, 5, 0.56)); }
      .video-loader span { position: absolute; left: 14px; bottom: 12px; z-index: 1; display: inline-flex; align-items: center; min-height: 32px; padding: 0 11px; border-radius: 999px; background: rgba(12, 11, 9, 0.76); color: var(--ink); font-size: 12px; font-weight: 950; letter-spacing: 0.08em; text-transform: uppercase; }
      .video-loader button:hover img, .video-loader button:focus-visible img { transform: scale(1.055); }
      .video-loader button:focus-visible { outline: 2px solid var(--gold); outline-offset: -4px; }
      .video-loader iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .youtube-link { position: absolute; right: 12px; bottom: 12px; z-index: 2; display: inline-flex; align-items: center; min-height: 32px; padding: 0 10px; border: 1px solid rgba(255, 247, 232, 0.32); border-radius: 999px; background: rgba(12, 11, 9, 0.68); color: var(--ink); font-size: 12px; font-weight: 900; }
      .video-loader[data-loaded="true"] .youtube-link { display: none; }
      .content-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .content-card { display: grid; align-content: space-between; min-height: 300px; gap: 18px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-strong); overflow: hidden; }
      .content-card.has-video { padding-top: 0; }
      .content-thumb { position: relative; display: block; min-height: 0; margin: 0 -22px; aspect-ratio: 16 / 9; overflow: hidden; border: 0; border-radius: 0; }
      .content-thumb img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.88) contrast(1.08); transform: scale(1.02); }
      .content-thumb::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3, 3, 3, 0.08), rgba(3, 3, 3, 0.54)); }
      .content-thumb span { position: absolute; left: 14px; bottom: 12px; z-index: 1; display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border-radius: 999px; background: rgba(12, 11, 9, 0.72); color: var(--ink); font-size: 12px; font-weight: 950; }
      .content-card h3 { margin: 8px 0 10px; font-size: 26px; line-height: 1.08; }
      .content-card p { color: var(--muted); line-height: 1.72; }
      .content-card a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid rgba(226, 173, 88, 0.38); border-radius: 999px; color: var(--gold); font-size: 13px; font-weight: 900; }
      .fundamental-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
      .fundamental-card { padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 247, 232, 0.045); }
      .fundamental-card strong { display: block; font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; font-size: 20px; line-height: 1.05; }
      .fundamental-card em { display: block; margin: 6px 0 10px; color: var(--gold); font-size: 12px; font-style: normal; font-weight: 950; text-transform: uppercase; }
      .fundamental-card span { display: block; color: var(--muted); font-size: 14px; line-height: 1.6; }
      .side-stack { position: sticky; top: 96px; }
      .side-box h2 { margin: 8px 0 12px; font-size: 28px; line-height: 1.08; }
      .tag-row span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.72); font-size: 12px; font-weight: 900; }
      .index-cta { margin-top: 32px; padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: #f3ede3; color: #18130d; }
      .index-cta h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .index-cta p { max-width: 760px; color: rgba(24, 19, 13, 0.72); line-height: 1.72; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head, .guide-layout { grid-template-columns: 1fr; }
        .guide-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .side-stack { position: static; }
      }
      @media (max-width: 700px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .guide-grid, .watch-grid, .content-grid, .fundamental-grid { grid-template-columns: 1fr; }
        .summary, .section-card, .side-box { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="스타일 가이드 이동">
        <a href="/">홈</a>
        <a href="/styles/">스타일</a>
        <a href="/articles/">기사</a>
        <a href="/community/">커뮤니티</a>
        <a href="/briefs/">브리핑</a>
      </nav>
    </header>`;

const videoLoaderScript = `    <script>
      document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-video-button]");
        if (!button) return;
        const loader = button.closest(".video-loader");
        if (!loader || loader.dataset.loaded === "true") return;
        const iframe = document.createElement("iframe");
        iframe.loading = "lazy";
        iframe.src = loader.dataset.embed;
        iframe.title = loader.dataset.title || "Bachata reference video";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        loader.dataset.loaded = "true";
        loader.textContent = "";
        loader.appendChild(iframe);
      });
    </script>`;

const layout = ({ title, description, canonical, jsonLd, body }) => `<!doctype html>
<html lang="ko">
  <head>
${head({ title, description, canonical })}
${styles}
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
${nav}
${body}
${videoLoaderScript}
  </body>
</html>
`;

const renderIndex = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/styles/",
    "name": "바차타 스타일 가이드",
    "description": "센슈얼, 도미니칸, 모던, Bachata Influence, Bachazouk의 차이를 영상과 학습 순서로 정리한 바차타 스타일 가이드.",
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "hasPart": data.guides.map((guide) => ({ "@id": pageUrl(guide), "name": guide.title }))
  };

  const cards = data.guides.map((guide) => `<article class="guide-card">
          <div>
            <span class="tag">${escapeHtml(guide.eyebrow)}</span>
            <h2>${escapeHtml(guide.title)}</h2>
            <p>${escapeHtml(guide.dek)}</p>
          </div>
          <div>
            <div class="tag-row">${guide.keywords.slice(0, 3).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
            <div class="link-row" style="margin-top:14px"><a href="${pagePath(guide)}">가이드 보기</a></div>
          </div>
        </article>`).join("\n");

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">스타일 가이드</span>
          <h1>바차타 스타일을 영상으로 먼저 보는 가이드</h1>
          <p>센슈얼 16 펀더멘탈, 도미니칸 리듬, 모던 입문, Bachata Influence, Bachazouk를 따로 살펴볼 수 있게 정리했습니다. 처음 보는 사람도 차이를 비교하고, 필요한 영상과 글로 바로 이동할 수 있습니다.</p>
          <div class="quick-nav">
            ${data.guides.map((guide) => `<a href="${pagePath(guide)}">${escapeHtml(guide.eyebrow)}</a>`).join("")}
          </div>
        </div>
        ${renderVideo(data.guides[0].heroVideo)}
      </div>
    </section>
    <main>
      <section>
        <div class="section-head">
          <div>
            <span class="eyebrow">가이드</span>
            <h2>클릭하면 바로 읽는 스타일별 가이드</h2>
          </div>
          <p>각 가이드는 관련 영상, 핵심 개념, 안전 기준, 관련 기사와 커뮤니티 안내로 이어집니다.</p>
        </div>
        <div class="guide-grid">
          ${cards}
        </div>
      </section>
      <section class="index-cta">
        <span class="tag">연결해서 보기</span>
        <h2>새 영상은 관련 가이드와 기사로 연결합니다</h2>
        <p>브리핑에서 영상과 출처가 확인되면 관련 스타일 가이드, 개별 기사, 커뮤니티 안내로 이동합니다.</p>
        <div class="link-row">
          <a href="/briefs/">오늘 브리핑</a>
          <a href="/articles/">기사 라이브러리</a>
          <a href="/community/">커뮤니티 보드</a>
        </div>
      </section>
    </main>`;

  return layout({
    title: "바차타 스타일 가이드 | 센슈얼·도미니칸·모던 차이",
    description: "센슈얼, 도미니칸, 모던, Bachata Influence, Bachazouk의 차이를 영상과 학습 순서로 정리합니다.",
    canonical: "https://bachata.co.kr/styles/",
    jsonLd,
    body
  });
};

const renderGuide = (guide, allGuides) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": pageUrl(guide),
    "name": guide.title,
    "description": guide.dek,
    "inLanguage": "ko-KR",
    "keywords": guide.keywords.join(", "),
    "isPartOf": { "@id": "https://bachata.co.kr/styles/" },
    "mainEntityOfPage": pageUrl(guide),
    "video": {
      "@type": "VideoObject",
      "name": guide.heroVideo.title,
      "embedUrl": videoEmbedUrl(guide.heroVideo),
      "url": videoWatchUrl(guide.heroVideo)
    }
  };

  const quickNav = allGuides
    .filter((item) => item.id !== guide.id)
    .map((item) => `<a href="${pagePath(item)}">${escapeHtml(item.eyebrow)}</a>`)
    .join("");
  const summary = guide.summary.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n            ");
  const watchlist = guide.watchlist.map((item) => `<article class="watch-card">
          ${renderVideoLoader({ id: item.videoId, start: item.start, title: item.title })}
          <div class="watch-card-body">
            <span class="tag">${escapeHtml(item.label)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.note)}</p>
          </div>
        </article>`).join("\n");
  const contentDrops = guide.contentDrops?.length ? `<section>
            <div class="section-head">
              <div>
                <span class="eyebrow">Published</span>
                <h2>이 스타일로 읽을 콘텐츠</h2>
              </div>
              <p>함께 읽으면 좋은 심화 기사와 커뮤니티/행사 페이지입니다. 새 영상이 확인되면 관련 글로 연결합니다.</p>
            </div>
            <div class="content-grid">
              ${guide.contentDrops.map((item) => renderContentCard(item)).join("\n              ")}
            </div>
          </section>` : "";
  const relatedContent = guide.relatedContent?.length ? `<section>
            <div class="section-head">
              <div>
                <span class="eyebrow">Content Graph</span>
                <h2>이 스타일로 이어지는 글과 가이드</h2>
              </div>
              <p>기사, 프로그램, 프로필, 행사, 장비, 한국 바차타 현장 콘텐츠를 같은 키워드로 묶었습니다. 스타일을 클릭한 뒤 다음에 볼 콘텐츠가 끊기지 않도록 매일 갱신됩니다.</p>
            </div>
            <div class="content-grid">
              ${guide.relatedContent.map((item) => renderContentCard(item, { cta: "콘텐츠 보기" })).join("\n              ")}
            </div>
          </section>` : "";
  const fundamentals = guide.fundamentals?.length ? `<section class="section-card">
            <span class="tag">${escapeHtml(guide.fundamentalsLabel || "Fundamentals")}</span>
            <h2>${escapeHtml(guide.fundamentalsTitle || "핵심 개념")}</h2>
            ${guide.fundamentalsIntro ? `<p>${escapeHtml(guide.fundamentalsIntro)}</p>` : ""}
            <div class="fundamental-grid">
              ${guide.fundamentals.map((item) => `<div class="fundamental-card">
                <strong>${escapeHtml(item.name)}</strong>
                <em>${escapeHtml(item.translation)}</em>
                <span>${escapeHtml(item.description)}</span>
              </div>`).join("\n              ")}
            </div>
          </section>` : "";
  const sections = guide.sections.map((section) => `<section class="section-card">
            <span class="tag">Guide</span>
            <h2>${escapeHtml(section.heading)}</h2>
            ${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n            ")}
            ${section.bullets?.length ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
          </section>`).join("\n");

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(guide.eyebrow)}</span>
          <h1>${escapeHtml(guide.title)}</h1>
          <p>${escapeHtml(guide.dek)}</p>
          <div class="quick-nav">
            <a href="/styles/">전체 스타일</a>
            ${quickNav}
          </div>
        </div>
        ${renderVideo(guide.heroVideo)}
      </div>
    </section>
    <main>
      <div class="guide-layout">
        <article class="main-stack">
          <section class="summary">
            ${summary}
          </section>
          <section>
            <div class="section-head">
              <div>
                <span class="eyebrow">추천 영상</span>
                <h2>먼저 볼 영상</h2>
              </div>
              <p>깨진 링크를 피하려고 재생 가능한 공개 YouTube 영상만 연결합니다.</p>
            </div>
            <div class="watch-grid">${watchlist}</div>
          </section>
${contentDrops}
${relatedContent}
${fundamentals}
          ${sections}
        </article>
        <aside class="side-stack" aria-label="관련 링크와 출처">
          <section class="side-box">
            <span class="tag">Keywords</span>
            <h2>관련 검색어</h2>
            <div class="tag-row">${guide.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
          </section>
          <section class="side-box">
            <span class="tag">관련 글</span>
            <h2>이어 보기</h2>
            <div class="link-row">${renderLinks(guide.related)}</div>
          </section>
          <section class="side-box">
            <span class="tag">참고 링크</span>
            <h2>출처</h2>
            <div class="link-row">${renderLinks(guide.sourceLinks)}</div>
          </section>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${guide.title} | 바차타 스타일 가이드`,
    description: guide.dek,
    canonical: pageUrl(guide),
    jsonLd,
    body
  });
};

const main = async () => {
  const [data, articlesData, programsData, profilesData, eventsData, gearData, intakeData] = await Promise.all([
    readJson(dataPath),
    optionalReadJson(articlesPath, { articles: [] }),
    optionalReadJson(programsPath, { programs: [] }),
    optionalReadJson(profilesPath, { profiles: [] }),
    optionalReadJson(eventsPath, { radar: [] }),
    optionalReadJson(gearPath, { products: [] }),
    optionalReadJson(socialIntakePath, { queue: [] })
  ]);
  const context = {
    articles: articlesData.articles || [],
    programs: programsData.programs || [],
    profiles: profilesData.profiles || [],
    events: eventsData.radar || [],
    gear: gearData.products || [],
    intakeQueue: intakeData.queue || []
  };
  const enrichedData = {
    ...data,
    guides: data.guides.map((guide) => ({
      ...guide,
      relatedContent: buildRelatedContent(guide, context)
    }))
  };

  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  await writeFile(resolve(outDir, "index.html"), renderIndex(enrichedData), "utf8");
  for (const guide of enrichedData.guides) {
    await writeFile(resolve(outDir, `${guide.id}.html`), renderGuide(guide, enrichedData.guides), "utf8");
  }

  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: enrichedData.updatedAt,
    guides: enrichedData.guides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      url: pagePath(guide),
      keywords: guide.keywords,
      heroVideo: guide.heroVideo?.id || null,
      relatedContent: guide.relatedContent.map((item) => ({
        label: item.label,
        title: item.title,
        url: item.url,
        score: item.score,
        videoId: item.videoId
      }))
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${enrichedData.guides.length + 1} style guide pages`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
