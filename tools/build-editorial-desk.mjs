import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/editorial-desk.json");
const outDir = resolve(root, "desk");
const indexPath = resolve(root, "data/generated/editorial-desk-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const videoEmbedUrl = (video = {}) => {
  if (!video?.id) return "";
  const start = video.start ? `?start=${encodeURIComponent(video.start)}` : "";
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}${start}`;
};

const renderLinks = (links = []) => links.map((link) => {
  const external = /^https?:\/\//.test(link.url);
  return `<a href="${escapeHtml(link.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
}).join("");

const renderVideo = (video) => {
  if (!video?.id) return "";
  return `<div class="video-frame">
              <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || "Bachata editorial video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>`;
};

const fileLabel = (file = "") => ({
  "data/sources.json": "공식 링크 목록",
  "data/social-radar.json": "소셜 소식 목록",
  "data/generated/scene-signals.json": "매일 확인한 공개 소식",
  "data/editorial-desk.json": "편집 계획"
}[file] || "운영 자료");

const head = ({ title, description, canonical }) => `    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="noindex,nofollow">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/complete/WantedSansVariable.css">`;

const styles = `    <style>
      :root {
        color-scheme: dark;
        --bg: #0b0a08;
        --ink: #fff7e8;
        --muted: rgba(255, 247, 232, 0.68);
        --line: rgba(255, 247, 232, 0.14);
        --panel: rgba(255, 247, 232, 0.06);
        --panel-strong: #17130f;
        --paper: #f4efe6;
        --paper-ink: #1a1510;
        --gold: #e2ad58;
        --wine: #a82e4b;
        --green: #5caf96;
        font-family: "Pretendard Variable", Pretendard, "Wanted Sans Variable", "Wanted Sans", "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(11, 10, 8, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 20px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(60px, 9vw, 118px) max(18px, calc((100vw - 1180px) / 2)) 50px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.76fr) minmax(320px, 0.42fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 940px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 96px); line-height: 0.95; overflow-wrap: anywhere; }
      .hero p { max-width: 790px; color: rgba(26, 21, 16, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section { margin-top: clamp(42px, 7vw, 76px); }
      .section:first-child { margin-top: 0; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .queue-card p, .series-card p, .rhythm-card p, .policy-card li, .automation-card p { color: var(--muted); line-height: 1.72; }
      .quick-nav, .link-row, .tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 26px; }
      .quick-nav a, .link-row a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
      .rhythm-grid { display: grid; gap: 12px; }
      .rhythm-card { padding: 20px; border: 1px solid rgba(26, 21, 16, 0.14); border-radius: 8px; background: rgba(26, 21, 16, 0.05); }
      .rhythm-card strong { display: block; margin: 6px 0; font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; font-size: 22px; line-height: 1.08; }
      .queue-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .queue-card, .series-card, .policy-card, .automation-card { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .queue-card { display: grid; gap: 18px; padding: clamp(20px, 3vw, 28px); }
      .queue-card h2 { margin: 10px 0; font-size: clamp(28px, 4vw, 42px); line-height: 1.04; }
      .meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .meta-row span, .tag-row span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.76); font-size: 12px; font-weight: 900; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .series-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .series-card { display: grid; gap: 18px; padding: 22px; min-height: 360px; align-content: space-between; }
      .series-card h3 { margin: 8px 0 10px; font-size: 28px; line-height: 1.08; }
      .series-card ul { display: grid; gap: 6px; margin: 12px 0 0; padding-left: 18px; color: var(--muted); line-height: 1.55; }
      .policy-grid, .automation-grid { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.38fr); gap: 14px; }
      .policy-card, .automation-card { padding: clamp(20px, 3vw, 28px); }
      .policy-card ul { display: grid; gap: 10px; margin: 16px 0 0; padding-left: 18px; }
      .automation-card dl { display: grid; gap: 12px; margin: 16px 0 0; }
      .automation-card dt { color: var(--gold); font-weight: 950; }
      .automation-card dd { margin: 4px 0 0; color: var(--muted); line-height: 1.6; }
      .paper-cta { padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: var(--paper); color: var(--paper-ink); }
      .paper-cta h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .paper-cta p { max-width: 820px; color: rgba(26, 21, 16, 0.72); line-height: 1.72; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head, .policy-grid, .automation-grid { grid-template-columns: 1fr; }
        .series-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 760px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .queue-grid, .series-grid { grid-template-columns: 1fr; }
        .queue-card, .series-card, .policy-card, .automation-card, .rhythm-card { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="편집 데스크 이동">
        <a href="/">홈</a>
        <a href="/desk/">편집실</a>
        <a href="/programs/">프로그램</a>
        <a href="/styles/">스타일</a>
        <a href="/radar/">소셜 소식</a>
        <a href="/briefs/">브리핑</a>
      </nav>
    </header>`;

const renderQueueCard = (item) => `<article class="queue-card" id="${escapeHtml(item.id)}">
          <div>
            <span class="tag">${escapeHtml(item.beat)}</span>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.angle)}</p>
            <div class="meta-row">
              <span>${escapeHtml(item.priority)}</span>
              <span>${escapeHtml(item.status)}</span>
              <span>${escapeHtml(item.searchIntent)}</span>
            </div>
          </div>
          ${renderVideo(item.video)}
          <div>
            <div class="link-row">${renderLinks(item.internalLinks)}</div>
            <div class="tag-row" style="margin-top:12px">
              ${(item.sourceChecklist || []).map((source) => `<span>${escapeHtml(source)}</span>`).join("")}
            </div>
          </div>
        </article>`;

const renderSeriesCard = (item) => `<article class="series-card" id="${escapeHtml(item.id)}">
          <div>
            <span class="tag">${escapeHtml(item.label)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.brief)}</p>
            <div class="meta-row">
              <span>${escapeHtml(item.priority)}</span>
              <span>${escapeHtml(item.status)}</span>
            </div>
          </div>
          <div>
            <ul>${(item.nextPieces || []).map((piece) => `<li>${escapeHtml(piece)}</li>`).join("")}</ul>
            <div class="link-row" style="margin-top:14px"><a href="${escapeHtml(item.linkedUrl)}">관련 글 보기</a></div>
          </div>
        </article>`;

const renderPage = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/desk/",
    "name": data.title,
    "description": data.dek,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "about": data.series.map((series) => series.title),
    "hasPart": data.queue.map((item) => ({
      "@type": "CreativeWork",
      "name": item.title,
      "description": item.angle,
      "keywords": item.searchIntent
    }))
  };

  return `<!doctype html>
<html lang="ko">
  <head>
${head({
  title: `${data.title} | Bachata Korea`,
  description: data.dek,
  canonical: "https://bachata.co.kr/desk/"
})}
${styles}
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
${nav}
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">기획 노트</span>
          <h1>곧 다룰 바차타 이야기를 모아둡니다</h1>
          <p>${escapeHtml(data.dek)}</p>
          <div class="quick-nav">
            ${data.queue.slice(0, 6).map((item) => `<a href="#${escapeHtml(item.id)}">${escapeHtml(item.priority)} · ${escapeHtml(item.beat)}</a>`).join("")}
          </div>
        </div>
        <aside class="rhythm-grid" aria-label="업데이트 리듬">
          ${data.cadence.map((item) => `<article class="rhythm-card">
            <span class="tag">${escapeHtml(item.cadence)}</span>
            <strong>${escapeHtml(item.label)}</strong>
            <p>${escapeHtml(item.output)}</p>
          </article>`).join("")}
        </aside>
      </div>
    </section>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Next Stories</span>
            <h2>영상과 출처가 있는 준비 중인 주제</h2>
          </div>
          <p>준비 중인 주제를 모아두었습니다. 각 주제는 영상과 출처를 확인한 뒤 기사, 프로그램, 프로필, 커뮤니티 안내로 이어집니다.</p>
        </div>
        <div class="queue-grid">
          ${data.queue.map(renderQueueCard).join("\n")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Magazine Series</span>
            <h2>반복해서 다룰 수 있는 시리즈</h2>
          </div>
          <p>코어 개념은 오래 읽히는 evergreen으로 두고, 한국 씬·내한·상품·커뮤니티는 주기적으로 갱신하는 방식으로 분리합니다.</p>
        </div>
        <div class="series-grid">
          ${data.series.map(renderSeriesCard).join("\n")}
        </div>
      </section>
      <section class="section">
        <div class="policy-grid">
          <article class="policy-card">
            <span class="tag">Source Rules</span>
            <h2>무단 복제가 아니라 출처 기반 편집</h2>
            <ul>${data.sourceRules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
          </article>
          <article class="automation-card">
            <span class="tag">운영 기준</span>
            <h2>글을 만들 때 확인하는 기준</h2>
            <dl>
              ${data.automation.map((item) => `<div><dt>${escapeHtml(fileLabel(item.file))}</dt><dd>${escapeHtml(item.role)}</dd></div>`).join("")}
            </dl>
          </article>
        </div>
      </section>
      <section class="section paper-cta">
        <span class="tag">Next Publishing Loop</span>
        <h2>브리핑은 매일, 깊은 기획은 시리즈로 쌓습니다</h2>
        <p>오늘 확인한 소식은 짧게 전하고, 오래 볼 주제는 스타일 가이드·프로그램·프로필·기사·커뮤니티 안내로 정리합니다. 빠른 소식과 기본 가이드를 분리해 처음 온 사람도 필요한 정보를 찾기 쉽게 만듭니다.</p>
        <div class="link-row">
          <a href="/briefs/">오늘 브리핑</a>
          <a href="/radar/">소셜 소식</a>
          <a href="/programs/">학습 프로그램</a>
          <a href="/community/">커뮤니티 보드</a>
        </div>
      </section>
    </main>
  </body>
</html>
`;
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(resolve(outDir, "index.html"), renderPage(data), "utf8");
  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    title: data.title,
    url: "/desk/",
    queue: data.queue.map((item) => ({
      id: item.id,
      title: item.title,
      priority: item.priority,
      beat: item.beat,
      status: item.status,
      videoId: item.video?.id,
      searchIntent: item.searchIntent
    })),
    series: data.series.map((item) => ({
      id: item.id,
      title: item.title,
      priority: item.priority,
      status: item.status,
      linkedUrl: item.linkedUrl
    }))
  }, null, 2)}\n`, "utf8");
  console.log("Wrote editorial desk");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
