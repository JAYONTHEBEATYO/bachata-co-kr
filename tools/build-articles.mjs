import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/articles.json");
const outDir = resolve(root, "articles");
const indexPath = resolve(root, "data/generated/article-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const formatDateKo = (dateText) => {
  const [year, month, day] = dateText.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

const articleUrl = (article) => `https://bachata.co.kr/articles/${article.slug}.html`;

const renderSourceLinks = (links = []) => links.map((link) => (
  `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`
)).join("");

const renderVideo = (video) => {
  if (!video?.id) return "";
  const title = escapeHtml(video.title || "Bachata reference video");
  return `<div class="video-frame">
              <iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${escapeHtml(video.id)}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>`;
};

const baseHead = ({ title, description, canonical }) => `    <meta charset="utf-8">
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
        --bg: #0b0a08;
        --panel: #17130f;
        --ink: #fff7e8;
        --muted: rgba(255, 247, 232, 0.68);
        --line: rgba(255, 247, 232, 0.14);
        --gold: #e2ad58;
        --wine: #9d2447;
        font-family: "SUIT Variable", SUIT, Pretendard, "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(11, 10, 8, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; }
      .brand span { color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 22px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(68px, 10vw, 126px) max(18px, calc((100vw - 1180px) / 2)) 56px; background: #f3ede3; color: #17120b; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; }
      h1, h2, h3 { font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; letter-spacing: 0; }
      h1 { max-width: 980px; margin: 14px 0 20px; font-size: clamp(46px, 8vw, 96px); line-height: 0.97; word-break: keep-all; overflow-wrap: anywhere; }
      .hero p { max-width: 760px; color: rgba(23, 18, 11, 0.72); font-size: clamp(17px, 2vw, 21px); line-height: 1.7; }
      .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
      .meta span { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border: 1px solid rgba(23, 18, 11, 0.14); border-radius: 999px; font-size: 13px; font-weight: 900; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: 54px 0 90px; }
      .article-grid { display: grid; grid-template-columns: minmax(0, 0.76fr) minmax(300px, 0.24fr); gap: 24px; align-items: start; }
      .prose { display: grid; gap: 30px; }
      .summary { display: grid; gap: 12px; padding: clamp(22px, 4vw, 34px); border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 247, 232, 0.06); }
      .summary p, .section p, .side p { color: var(--muted); line-height: 1.82; font-size: 17px; }
      .section { padding-top: 30px; border-top: 1px solid var(--line); }
      .section h2 { margin: 0 0 16px; font-size: clamp(30px, 4vw, 50px); line-height: 1.06; }
      .section ul { display: grid; gap: 10px; margin: 18px 0 0; padding-left: 20px; color: rgba(255, 247, 232, 0.74); line-height: 1.65; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: #030303; }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .side { position: sticky; top: 96px; display: grid; gap: 14px; }
      .side-card { padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 247, 232, 0.06); }
      .source-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      .source-links a, .article-card a { display: inline-flex; align-items: center; min-height: 34px; padding: 0 10px; border: 1px solid rgba(226, 173, 88, 0.36); border-radius: 999px; color: var(--gold); font-size: 12px; font-weight: 900; }
      .article-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 26px; }
      .article-card { min-height: 300px; display: grid; align-content: space-between; gap: 16px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 247, 232, 0.06); }
      .article-card h2 { margin: 10px 0 0; font-size: 30px; line-height: 1.08; }
      .article-card p { color: var(--muted); line-height: 1.68; }
      @media (max-width: 880px) {
        .nav-links { display: none; }
        .article-grid, .article-list { grid-template-columns: 1fr; }
        .side { position: static; }
        h1 { font-size: clamp(42px, 13vw, 64px); }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="기사 이동">
        <a href="/">홈</a>
        <a href="/articles/">기사</a>
        <a href="/briefs/">브리프</a>
        <a href="/#publishing-os">발행 시스템</a>
      </nav>
    </header>`;

const renderSection = (section) => {
  const paragraphs = (section.paragraphs || []).map((text) => `<p>${escapeHtml(text)}</p>`).join("\n              ");
  const bullets = section.bullets?.length
    ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  return `          <section class="section">
            <h2>${escapeHtml(section.heading)}</h2>
            ${paragraphs}
            ${bullets}
          </section>`;
};

const renderArticlePage = (article, allArticles) => {
  const related = allArticles
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3)
    .map((item) => `<a href="/articles/${escapeHtml(item.slug)}.html">${escapeHtml(item.title)}</a>`)
    .join("");
  const keywords = article.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
  const summary = article.summary.map((text) => `<p>${escapeHtml(text)}</p>`).join("\n              ");
  const sections = article.sections.map(renderSection).join("\n");
  const videoUrl = article.heroVideo?.id ? `https://www.youtube.com/watch?v=${article.heroVideo.id}` : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": articleUrl(article),
    "headline": article.title,
    "description": article.dek,
    "datePublished": `${article.publishedAt}T00:00:00+09:00`,
    "dateModified": `${article.updatedAt}T00:00:00+09:00`,
    "inLanguage": "ko-KR",
    "keywords": article.keywords.join(", "),
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "mainEntityOfPage": articleUrl(article),
    ...(videoUrl ? {
      "video": {
        "@type": "VideoObject",
        "name": article.heroVideo.title,
        "embedUrl": `https://www.youtube-nocookie.com/embed/${article.heroVideo.id}`,
        "url": videoUrl
      }
    } : {})
  };

  return `<!doctype html>
<html lang="ko">
  <head>
${baseHead({ title: `${article.title} | 바차타 코리아`, description: article.dek, canonical: articleUrl(article) })}
${styles}
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
${nav}
    <section class="hero">
      <span class="eyebrow">${escapeHtml(article.eyebrow)}</span>
      <h1>${escapeHtml(article.title)}</h1>
      <p>${escapeHtml(article.dek)}</p>
      <div class="meta">
        <span>${formatDateKo(article.updatedAt)} 업데이트</span>
        ${keywords}
      </div>
    </section>
    <main>
      <div class="article-grid">
        <article class="prose">
          ${renderVideo(article.heroVideo)}
          <section class="summary">
            ${summary}
          </section>
${sections}
        </article>
        <aside class="side" aria-label="기사 출처와 관련 기사">
          <div class="side-card">
            <span class="tag">Sources</span>
            <p>공식/공개 출처를 바탕으로 한국어 독자에게 맞게 재편집했습니다.</p>
            <div class="source-links">${renderSourceLinks(article.sourceLinks)}</div>
          </div>
          <div class="side-card">
            <span class="tag">Related</span>
            <div class="source-links">${related}</div>
          </div>
        </aside>
      </div>
    </main>
  </body>
</html>
`;
};

const renderIndexPage = (articles) => {
  const cards = articles.map((article) => `<article class="article-card">
          <div>
            <span class="tag">${escapeHtml(article.eyebrow)}</span>
            <h2>${escapeHtml(article.title)}</h2>
            <p>${escapeHtml(article.dek)}</p>
          </div>
          <a href="/articles/${escapeHtml(article.slug)}.html">기사 읽기</a>
        </article>`).join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/articles/",
    "name": "바차타 코리아 기사 라이브러리",
    "description": "Bachata Influence, Bachazouk, 글로벌 댄서, 한국 바차타 씬, 댄스화 콘텐츠를 모은 기사 라이브러리.",
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "hasPart": articles.map((article) => ({ "@id": articleUrl(article), "name": article.title }))
  };

  return `<!doctype html>
<html lang="ko">
  <head>
${baseHead({
  title: "바차타 코리아 기사 라이브러리 | Bachata Korea",
  description: "Bachata Influence, Bachazouk, 글로벌 댄서, 한국 바차타 씬, 댄스화 콘텐츠를 모은 기사 라이브러리.",
  canonical: "https://bachata.co.kr/articles/"
})}
${styles}
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
${nav}
    <section class="hero">
      <span class="eyebrow">Article Library</span>
      <h1>바차타 코리아 기사 라이브러리</h1>
      <p>일간 브리프에서 발견한 신호를 오래 남는 개별 기사로 정리합니다. Influence, Bachazouk, 글로벌 페어, 한국 씬, 댄스화와 마켓 콘텐츠가 이곳에 누적됩니다.</p>
    </section>
    <main>
      <div class="article-list">
        ${cards}
      </div>
    </main>
  </body>
</html>
`;
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  for (const article of data.articles) {
    await writeFile(resolve(outDir, `${article.slug}.html`), renderArticlePage(article, data.articles), "utf8");
  }

  await writeFile(resolve(outDir, "index.html"), renderIndexPage(data.articles), "utf8");
  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    articles: data.articles.map((article) => ({
      slug: article.slug,
      title: article.title,
      url: `/articles/${article.slug}.html`,
      updatedAt: article.updatedAt,
      keywords: article.keywords
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${data.articles.length} article pages`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
