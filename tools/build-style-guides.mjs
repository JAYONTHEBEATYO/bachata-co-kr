import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/style-guides.json");
const outDir = resolve(root, "styles");
const indexPath = resolve(root, "data/generated/style-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

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

const head = ({ title, description, canonical }) => `    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-video-preview:-1,max-snippet:-1,max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css">`;

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
        font-family: "SUIT Variable", SUIT, Pretendard, "Noto Sans KR", system-ui, sans-serif;
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
      h1, h2, h3 { font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; letter-spacing: 0; word-break: keep-all; }
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
      .content-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .content-card { display: grid; align-content: space-between; min-height: 260px; gap: 18px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-strong); }
      .content-card h3 { margin: 8px 0 10px; font-size: 26px; line-height: 1.08; }
      .content-card p { color: var(--muted); line-height: 1.72; }
      .content-card a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid rgba(226, 173, 88, 0.38); border-radius: 999px; color: var(--gold); font-size: 13px; font-weight: 900; }
      .fundamental-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
      .fundamental-card { padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 247, 232, 0.045); }
      .fundamental-card strong { display: block; font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; font-size: 20px; line-height: 1.05; }
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
      <nav class="nav-links" aria-label="스타일 허브 이동">
        <a href="/">홈</a>
        <a href="/styles/">스타일</a>
        <a href="/articles/">기사</a>
        <a href="/community/">커뮤니티</a>
        <a href="/briefs/">브리프</a>
      </nav>
    </header>`;

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
  </body>
</html>
`;

const renderIndex = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/styles/",
    "name": "바차타 스타일 허브",
    "description": "센슈얼, 도미니칸, 모던, Bachata Influence, Bachazouk를 영상과 학습 순서로 정리한 바차타 스타일 허브.",
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
            <div class="link-row" style="margin-top:14px"><a href="${pagePath(guide)}">허브 보기</a></div>
          </div>
        </article>`).join("\n");

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Style Library</span>
          <h1>바차타 스타일을 영상으로 먼저 읽는 허브</h1>
          <p>센슈얼 16 펀더멘탈, 도미니칸 리듬, 모던 입문, Bachata Influence, Bachazouk를 각각 별도 URL로 정리했습니다. 홈의 긴 매거진을 검색·공유 가능한 학습 페이지로 나눈 구조입니다.</p>
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
            <span class="eyebrow">Guides</span>
            <h2>클릭하면 바로 들어가는 스타일 지도</h2>
          </div>
          <p>각 허브는 관련 영상, 핵심 개념, 안전 기준, 관련 기사와 커뮤니티 보드로 이어집니다.</p>
        </div>
        <div class="guide-grid">
          ${cards}
        </div>
      </section>
      <section class="index-cta">
        <span class="tag">Editorial Loop</span>
        <h2>브리프에서 발견한 영상은 허브로 누적합니다</h2>
        <p>매일 생성되는 브리프의 후보 영상과 출처가 검수되면 관련 스타일 허브, 개별 기사, 커뮤니티 보드로 이동합니다.</p>
        <div class="link-row">
          <a href="/briefs/">오늘 브리프</a>
          <a href="/articles/">기사 라이브러리</a>
          <a href="/community/">커뮤니티 보드</a>
        </div>
      </section>
    </main>`;

  return layout({
    title: "바차타 스타일 허브 | Bachata Korea",
    description: "센슈얼, 도미니칸, 모던, Bachata Influence, Bachazouk를 영상과 학습 순서로 정리한 바차타 스타일 허브.",
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
          ${renderVideo({ id: item.videoId, start: item.start, title: item.title })}
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
                <h2>이 스타일로 발행된 콘텐츠</h2>
              </div>
              <p>허브에서 바로 읽을 수 있는 심화 기사와 커뮤니티/행사 페이지입니다. 새 영상이 검증되면 이 블록에 계속 붙습니다.</p>
            </div>
            <div class="content-grid">
              ${guide.contentDrops.map((item) => `<article class="content-card">
                <div>
                  <span class="tag">${escapeHtml(item.label)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.description)}</p>
                </div>
                <a href="${escapeHtml(item.url)}">${escapeHtml(item.cta || "읽기")}</a>
              </article>`).join("\n              ")}
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
                <span class="eyebrow">Watchlist</span>
                <h2>먼저 볼 영상</h2>
              </div>
              <p>죽은 링크를 피하려고 YouTube oEmbed 기준으로 확인 가능한 영상만 허브에 넣습니다.</p>
            </div>
            <div class="watch-grid">${watchlist}</div>
          </section>
${contentDrops}
${fundamentals}
          ${sections}
        </article>
        <aside class="side-stack" aria-label="관련 링크와 출처">
          <section class="side-box">
            <span class="tag">Keywords</span>
            <h2>검색 키워드</h2>
            <div class="tag-row">${guide.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
          </section>
          <section class="side-box">
            <span class="tag">Related</span>
            <h2>이어 보기</h2>
            <div class="link-row">${renderLinks(guide.related)}</div>
          </section>
          <section class="side-box">
            <span class="tag">Sources</span>
            <h2>출처</h2>
            <div class="link-row">${renderLinks(guide.sourceLinks)}</div>
          </section>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${guide.title} | 바차타 스타일 허브`,
    description: guide.dek,
    canonical: pageUrl(guide),
    jsonLd,
    body
  });
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  await writeFile(resolve(outDir, "index.html"), renderIndex(data), "utf8");
  for (const guide of data.guides) {
    await writeFile(resolve(outDir, `${guide.id}.html`), renderGuide(guide, data.guides), "utf8");
  }

  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    guides: data.guides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      url: pagePath(guide),
      keywords: guide.keywords,
      heroVideo: guide.heroVideo?.id || null
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${data.guides.length + 1} style guide pages`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
