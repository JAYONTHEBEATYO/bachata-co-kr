import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/gear.json");
const outDir = resolve(root, "gear");
const indexPath = resolve(root, "data/generated/gear-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const pagePath = (product) => `/gear/${product.id}.html`;
const pageUrl = (product) => `https://bachata.co.kr${pagePath(product)}`;

const videoEmbedUrl = (video = {}) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`;
const videoWatchUrl = (video = {}) => `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;

const renderVideo = (video, className = "video-frame") => {
  if (!video?.id) return "";
  return `<div class="${className}">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || "Bachata dance shoes video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
};

const renderLinks = (links = []) => links.map((link) => {
  const external = /^https?:\/\//.test(link.url);
  return `<a href="${escapeHtml(link.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
}).join("");

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
        --bg: #0d0c09;
        --ink: #fff7e8;
        --muted: rgba(255, 247, 232, 0.68);
        --line: rgba(255, 247, 232, 0.14);
        --panel: rgba(255, 247, 232, 0.06);
        --paper: #f4efe6;
        --paper-ink: #1a1510;
        --gold: #e2ad58;
        --wine: #9f2649;
        --teal: #4ca390;
        font-family: "Pretendard Variable", Pretendard, "Wanted Sans Variable", "Wanted Sans", "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(13, 12, 9, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 20px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(58px, 9vw, 118px) max(18px, calc((100vw - 1180px) / 2)) 48px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.76fr) minmax(320px, 0.46fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 920px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 96px); line-height: 0.95; overflow-wrap: anywhere; }
      .hero p { max-width: 790px; color: rgba(26, 21, 16, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .hero .video-frame { border-color: rgba(26, 21, 16, 0.18); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22); }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .quick-nav, .link-row, .tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 26px; }
      .quick-nav a, .link-row a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section { margin-top: clamp(42px, 7vw, 76px); }
      .section:first-child { margin-top: 0; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .principle p, .product-card p, .product-main p, .side-box p, .note p { color: var(--muted); line-height: 1.72; }
      .principle-grid, .product-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .principle, .product-card, .score-card, .side-box, .note { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .principle { padding: 22px; }
      .principle h3 { margin: 10px 0 10px; font-size: 26px; line-height: 1.08; }
      .product-card { display: grid; gap: 16px; align-content: space-between; min-height: 360px; padding: 20px; }
      .product-card h2 { margin: 8px 0 10px; font-size: 34px; line-height: 1.02; }
      .tag-row span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.72); font-size: 12px; font-weight: 900; }
      .compare { width: 100%; border-collapse: collapse; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; }
      .compare th, .compare td { padding: 14px; border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; line-height: 1.6; }
      .compare th { width: 140px; color: var(--gold); font-size: 13px; }
      .compare td { color: rgba(255, 247, 232, 0.76); }
      .product-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 22px; align-items: start; }
      .product-main, .side-stack { display: grid; gap: 16px; }
      .summary, .score-card, .note { padding: clamp(20px, 4vw, 30px); }
      .summary { background: rgba(226, 173, 88, 0.08); border: 1px solid rgba(226, 173, 88, 0.24); border-radius: 8px; }
      .score-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .score-card strong { display: block; margin-bottom: 8px; color: var(--gold); font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
      .score-card p { margin: 0; color: rgba(255, 247, 232, 0.76); }
      .note h2, .side-box h2 { margin: 8px 0 12px; font-size: 28px; line-height: 1.08; }
      .note ul, .side-box ul, .checklist { display: grid; gap: 8px; margin: 14px 0 0; padding-left: 20px; color: rgba(255, 247, 232, 0.76); line-height: 1.65; }
      .side-stack { position: sticky; top: 96px; }
      .side-box { padding: 22px; }
      .paper-cta { padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: var(--paper); color: var(--paper-ink); }
      .paper-cta h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .paper-cta p { max-width: 760px; color: rgba(26, 21, 16, 0.72); line-height: 1.72; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head, .product-layout { grid-template-columns: 1fr; }
        .principle-grid, .product-grid, .score-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .side-stack { position: static; }
      }
      @media (max-width: 700px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .principle-grid, .product-grid, .score-grid { grid-template-columns: 1fr; }
        .summary, .score-card, .note, .side-box { padding: 20px; }
        .compare { display: block; overflow-x: auto; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="댄스화 비교 페이지 이동">
        <a href="/">홈</a>
        <a href="/styles/">스타일</a>
        <a href="/profiles/">인물·팀</a>
        <a href="/articles/">기사</a>
        <a href="/community/">커뮤니티</a>
        <a href="/briefs/">브리핑</a>
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

const productCard = (product) => `<article class="product-card">
          <div>
            <span class="tag">${escapeHtml(product.eyebrow)}</span>
            <h2>${escapeHtml(product.brand)}</h2>
            <p>${escapeHtml(product.positioning)}</p>
          </div>
          <div>
            <div class="tag-row">${product.keywords.slice(0, 3).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
            <div class="link-row" style="margin-top:14px"><a href="${pagePath(product)}">비교 노트 보기</a></div>
          </div>
        </article>`;

const renderComparisonTable = (data) => {
  const rows = data.compareFields.map((field) => `<tr>
            <th>${escapeHtml(field.label)}</th>
            ${data.products.map((product) => `<td><strong>${escapeHtml(product.brand)}</strong><br>${escapeHtml(product.scores[field.key] || "")}</td>`).join("")}
          </tr>`).join("\n");

  return `<table class="compare">
          <tbody>
          ${rows}
          </tbody>
        </table>`;
};

const renderIndex = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/gear/",
    "name": data.title,
    "description": data.dek,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "hasPart": data.products.map((product) => ({
      "@type": "WebPage",
      "@id": pageUrl(product),
      "name": `${product.brand} 바차타 댄스화 비교`
    }))
  };

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">댄스화 가이드</span>
          <h1>바차타 댄스화, 브랜드보다 플로어 감각</h1>
          <p>${escapeHtml(data.dek)}</p>
          <div class="quick-nav">
            ${data.products.map((product) => `<a href="${pagePath(product)}">${escapeHtml(product.brand)}</a>`).join("")}
          </div>
        </div>
        ${renderVideo(data.heroVideo)}
      </div>
    </section>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Buying Lens</span>
            <h2>한국 바차테로가 먼저 봐야 할 기준</h2>
          </div>
          <p>공식 사이트 문구와 커뮤니티 후기를 같은 테이블에 넣되, 추천 순위처럼 보이지 않게 기준을 분리합니다. 신발은 사람의 발과 바닥을 동시에 타기 때문입니다.</p>
        </div>
        <div class="principle-grid">
          ${data.principles.map((item) => `<article class="principle">
            <span class="tag">${escapeHtml(item.label)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.body)}</p>
          </article>`).join("\n")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Brand Notes</span>
            <h2>Fuego, Pana Mio, On1, Pulse 비교 노트</h2>
          </div>
          <p>각 페이지는 공식 링크, 관련 유튜브, 한국 소비자 체크포인트를 묶습니다. 가격과 재고는 변동이 커서 고정값보다 원본 링크 확인을 우선합니다.</p>
        </div>
        <div class="product-grid">
          ${data.products.map(productCard).join("\n")}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Comparison</span>
            <h2>회전감, 접지, 쿠션, 바닥, 리스크</h2>
          </div>
          <p>브랜드 홍보 문구를 그대로 복제하지 않고, 바차타 소셜에서 실제로 문제가 되는 기준으로 다시 나눕니다.</p>
        </div>
        ${renderComparisonTable(data)}
      </section>

      <section class="section paper-cta">
        <span class="tag">구매·양도 안내</span>
        <h2>중고·양도 보드와 연결되는 구매 체크리스트</h2>
        <p>이 페이지는 구매 추천만 하는 곳이 아니라 바차타 커뮤니티에서 신발을 고를 때 확인할 기준을 모아둔 곳입니다. 새 제품, 중고, 양도, 협찬 영상까지 같은 기준으로 비교합니다.</p>
        <ul class="checklist">
          ${data.buyerChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <div class="link-row" style="margin-top:18px">${renderLinks(data.related)}</div>
      </section>
    </main>`;

  return layout({
    title: `${data.title} | Bachata Korea`,
    description: data.dek,
    canonical: "https://bachata.co.kr/gear/",
    jsonLd,
    body
  });
};

const renderProduct = (product, data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl(product),
    "headline": `${product.brand} 바차타 댄스화 비교 노트`,
    "description": product.summary,
    "dateModified": data.updatedAt,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/gear/" },
    "mainEntityOfPage": pageUrl(product),
    "about": {
      "@type": "Product",
      "name": product.brand,
      "alternateName": product.koreanName,
      "brand": { "@type": "Brand", "name": product.brand },
      "sameAs": product.links.filter((link) => /^https?:\/\//.test(link.url)).map((link) => link.url)
    },
    "video": product.video?.id ? {
      "@type": "VideoObject",
      "name": product.video.title,
      "embedUrl": videoEmbedUrl(product.video),
      "url": videoWatchUrl(product.video)
    } : undefined
  };

  const scoreCards = data.compareFields.map((field) => `<article class="score-card">
            <strong>${escapeHtml(field.label)}</strong>
            <p>${escapeHtml(product.scores[field.key] || "")}</p>
          </article>`).join("\n");
  const otherProducts = data.products.filter((item) => item.id !== product.id);

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(product.eyebrow)}</span>
          <h1>${escapeHtml(product.brand)} 바차타 댄스화 비교</h1>
          <p>${escapeHtml(product.summary)}</p>
          <div class="quick-nav">
            <a href="/gear/">댄스화 비교</a>
            ${otherProducts.map((item) => `<a href="${pagePath(item)}">${escapeHtml(item.brand)}</a>`).join("")}
          </div>
        </div>
        ${renderVideo(product.video)}
      </div>
    </section>
    <main>
      <div class="product-layout">
        <div class="product-main">
          <section class="summary">
            <span class="tag">Editor Note</span>
            <p>${escapeHtml(product.editorNote)}</p>
          </section>

          <section class="section">
            <div class="section-head">
              <div>
                <span class="eyebrow">Field View</span>
                <h2>핵심 비교 기준</h2>
              </div>
              <p>공식 기능 설명, 영상 자료, 구매 리스크를 한 화면에서 확인할 수 있게 정리했습니다.</p>
            </div>
            <div class="score-grid">
              ${scoreCards}
            </div>
          </section>

          <section class="note">
            <span class="tag">Best For</span>
            <h2>이런 사람에게 먼저 맞습니다</h2>
            <ul>${product.bestFor.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </section>

          <section class="note">
            <span class="tag">Watch Out</span>
            <h2>구매 전 따로 확인할 것</h2>
            <ul>${product.watchOut.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </section>
        </div>

        <aside class="side-stack">
          <section class="side-box">
            <span class="tag">참고 링크</span>
            <h2>원본 링크</h2>
            <div class="link-row">${renderLinks(product.links)}</div>
          </section>
          <section class="side-box">
            <span class="tag">Keywords</span>
            <h2>관련 검색어</h2>
            <div class="tag-row">${product.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
          </section>
          <section class="side-box">
            <span class="tag">관련 글</span>
            <h2>같이 볼 페이지</h2>
            <div class="link-row">${renderLinks(data.related)}</div>
          </section>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${product.brand} 바차타 댄스화 비교 | Bachata Korea`,
    description: product.summary,
    canonical: pageUrl(product),
    jsonLd,
    body
  });
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  await writeFile(resolve(outDir, "index.html"), renderIndex(data), "utf8");
  await Promise.all(data.products.map((product) => writeFile(resolve(outDir, `${product.id}.html`), renderProduct(product, data), "utf8")));

  const index = {
    updatedAt: data.updatedAt,
    title: data.title,
    url: "/gear/",
    products: data.products.map((product) => ({
      id: product.id,
      brand: product.brand,
      koreanName: product.koreanName,
      url: pagePath(product),
      summary: product.summary,
      videoId: product.video?.id || null,
      keywords: product.keywords,
      sourceUrls: product.links.map((link) => link.url)
    }))
  };

  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`Wrote ${resolve(outDir, "index.html")}`);
  console.log(`Wrote ${indexPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
