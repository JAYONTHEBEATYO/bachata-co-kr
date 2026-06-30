import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/board.json");
const outDir = resolve(root, "community");
const indexPath = resolve(root, "data/generated/board-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const slugPath = (categoryId) => categoryId === "index" ? "/community/" : `/community/${categoryId}.html`;
const absoluteUrl = (path) => `https://bachata.co.kr${path}`;

const statusLabels = {
  "editorial-series": "편집 시리즈",
  "collecting": "수집 중",
  "submission-ready": "제보 접수",
  "research-queue": "취재 대기"
};

const categoryIntro = {
  events: {
    eyebrow: "Scene Calendar",
    note: "정기 소셜, 워크숍, 내한, 페스티벌을 한 번에 찾을 수 있도록 일정형 콘텐츠로 확장합니다."
  },
  market: {
    eyebrow: "Safe Transfer",
    note: "티켓 양도와 댄스화 중고는 가격·상태·주최측 양도 가능 여부를 같이 보존하는 방식으로 운영합니다."
  },
  jobs: {
    eyebrow: "Dance Jobs",
    note: "강사, DJ, 운영 스태프, 촬영자, 공간 제휴처럼 한국 라틴댄스 씬에 필요한 실무 연결을 모읍니다."
  },
  venues: {
    eyebrow: "Korea Directory",
    note: "초보자가 실제로 갈 수 있는 장소와 팀을 영상, 주소, 분위기, 음악 비율 중심으로 정리합니다."
  }
};

const extractYouTubeId = (url = "") => {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return "";
};

const renderLinks = (links = []) => links.map((link) => (
  `<a href="${escapeHtml(link.url)}"${link.url.startsWith("http") ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`
)).join("");

const renderVideoFromLinks = (entry) => {
  const source = (entry.sourceLinks || []).find((link) => extractYouTubeId(link.url));
  const id = source ? extractYouTubeId(source.url) : "";
  if (!id) return "";
  return `<div class="video-frame">
            <iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}" title="${escapeHtml(entry.title)} reference video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
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
        color-scheme: light dark;
        --ink: #191512;
        --paper: #f4efe6;
        --paper-soft: #fffaf0;
        --charcoal: #0d0c0b;
        --cream: #fff7e8;
        --muted: rgba(25, 21, 18, 0.66);
        --line: rgba(25, 21, 18, 0.13);
        --gold: #d89f46;
        --wine: #9d2447;
        --green: #1b6f61;
        font-family: "SUIT Variable", SUIT, Pretendard, "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; background: var(--paper); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid rgba(255, 247, 232, 0.14); background: rgba(13, 12, 11, 0.92); color: var(--cream); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; align-items: center; gap: 20px; color: rgba(255, 247, 232, 0.72); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(70px, 10vw, 132px) max(18px, calc((100vw - 1180px) / 2)) clamp(34px, 6vw, 70px); background: #11100e; color: var(--cream); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.86fr) minmax(280px, 0.36fr); gap: clamp(24px, 5vw, 64px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      .hero .eyebrow, .hero .tag { color: var(--gold); }
      h1, h2, h3 { font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 960px; margin: 16px 0 18px; font-size: clamp(48px, 8vw, 104px); line-height: 0.94; overflow-wrap: anywhere; }
      .hero p { max-width: 800px; margin: 0; color: rgba(255, 247, 232, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .hero-note { padding: 22px; border: 1px solid rgba(255, 247, 232, 0.16); border-radius: 8px; background: rgba(255, 247, 232, 0.06); }
      .hero-note strong { display: block; margin-bottom: 10px; color: var(--gold); font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; font-size: 24px; }
      .quick-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
      .quick-nav a, .button { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 13px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
      .button.primary { background: var(--ink); border-color: var(--ink); color: var(--cream); }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 24px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .entry p, .category-card p, .side-note p { color: var(--muted); line-height: 1.72; }
      .category-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .category-card { display: grid; min-height: 245px; align-content: space-between; gap: 18px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper-soft); }
      .category-card h3 { margin: 8px 0 0; font-size: 26px; line-height: 1.08; }
      .category-card .count { color: var(--green); font-size: 13px; font-weight: 950; }
      .board-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 24px; align-items: start; }
      .entry-list { display: grid; gap: 14px; }
      .entry { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, 0.34fr); gap: 18px; padding: clamp(20px, 4vw, 30px); border: 1px solid var(--line); border-radius: 8px; background: var(--paper-soft); }
      .entry h2 { margin: 10px 0 12px; font-size: clamp(28px, 4vw, 44px); line-height: 1.06; }
      .entry-meta { display: flex; flex-wrap: wrap; gap: 8px; }
      .entry-meta span, .pill { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid rgba(25, 21, 18, 0.14); border-radius: 999px; color: rgba(25, 21, 18, 0.72); font-size: 12px; font-weight: 900; }
      .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
      .tag-list span { background: rgba(216, 159, 70, 0.16); border-color: rgba(216, 159, 70, 0.25); color: #73501f; }
      .entry-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
      .entry-links a { display: inline-flex; align-items: center; min-height: 34px; padding: 0 11px; border: 1px solid rgba(25, 21, 18, 0.2); border-radius: 999px; font-size: 12px; font-weight: 950; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #070707; }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .entry-side { display: grid; gap: 12px; align-content: start; }
      .side-note { position: sticky; top: 96px; display: grid; gap: 14px; }
      .side-note article { padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 250, 240, 0.72); }
      .submission { margin-top: 32px; padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: #191512; color: var(--cream); }
      .submission h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .submission p { max-width: 760px; color: rgba(255, 247, 232, 0.72); line-height: 1.72; }
      .submission .entry-links a { border-color: rgba(255, 247, 232, 0.24); color: var(--cream); }
      @media (max-width: 980px) {
        .hero-grid, .section-head, .board-layout, .entry { grid-template-columns: 1fr; }
        .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .side-note { position: static; }
      }
      @media (max-width: 700px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .category-grid { grid-template-columns: 1fr; }
        .entry { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="커뮤니티 이동">
        <a href="/">홈</a>
        <a href="/articles/">기사</a>
        <a href="/briefs/">브리프</a>
        <a href="/community/">커뮤니티</a>
        <a href="http://test.bachata.co.kr/">테스트</a>
      </nav>
    </header>`;

const renderCategoryCard = (category, entries) => {
  const categoryEntries = entries.filter((entry) => entry.category === category.id);
  return `<article class="category-card">
          <div>
            <span class="tag">${escapeHtml(categoryIntro[category.id]?.eyebrow || "Board")}</span>
            <h3>${escapeHtml(category.label)}</h3>
            <p>${escapeHtml(category.description)}</p>
          </div>
          <div>
            <span class="count">${categoryEntries.length}개 큐레이션</span>
            <div class="entry-links"><a href="${slugPath(category.id)}">보드 보기</a></div>
          </div>
        </article>`;
};

const renderEntry = (entry) => {
  const tags = (entry.tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  const links = renderLinks(entry.sourceLinks);
  const video = renderVideoFromLinks(entry);
  const status = statusLabels[entry.status] || entry.status;
  return `<article class="entry" id="${escapeHtml(entry.id)}">
            <div>
              <span class="tag">${escapeHtml(status)}</span>
              <h2>${escapeHtml(entry.title)}</h2>
              <div class="entry-meta">
                <span>${escapeHtml(entry.location)}</span>
                <span>${escapeHtml(entry.dateLabel)}</span>
                <span>${escapeHtml(entry.callToAction)}</span>
              </div>
              <p>${escapeHtml(entry.summary)}</p>
              <div class="tag-list">${tags}</div>
              <div class="entry-links">${links}</div>
            </div>
            <div class="entry-side">
              ${video || `<div class="side-note"><article><span class="tag">Editorial Check</span><p>영상·이미지·가격·일정 같은 원본 근거를 확인한 뒤 개별 기사나 공지로 확장합니다.</p></article></div>`}
            </div>
          </article>`;
};

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

const renderIndexPage = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/community/",
    "name": "바차타 코리아 커뮤니티 보드",
    "description": "한국 바차타 소셜, 워크숍, 양도, 중고, 구인구직, 장소, 팀 정보를 검수해 모으는 커뮤니티 보드.",
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "hasPart": data.categories.map((category) => ({
      "@type": "CollectionPage",
      "@id": absoluteUrl(slugPath(category.id)),
      "name": category.title
    }))
  };

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Community Desk</span>
          <h1>한국 바차타씬의 소식과 연결을 모으는 보드</h1>
          <p>소셜·워크숍·내한, 티켓 양도, 댄스화 중고, 강사·DJ 구인, 장소·팀 디렉터리를 제보와 공개 출처 기반으로 정리합니다. 지금은 검수형 보드로 시작하고, 축적된 항목은 기사와 캘린더로 확장합니다.</p>
          <div class="quick-nav">
            ${data.categories.map((category) => `<a href="${slugPath(category.id)}">${escapeHtml(category.label)}</a>`).join("")}
          </div>
        </div>
        <aside class="hero-note">
          <strong>제보 우선 공개</strong>
          <p>운영자가 원본 링크, 날짜, 장소, 가격, 영상 유효성을 확인한 뒤 게재합니다. 홍보성 문구를 그대로 복제하지 않고 검색 가능한 요약으로 편집합니다.</p>
        </aside>
      </div>
    </section>
    <main>
      <section>
        <div class="section-head">
          <div>
            <span class="eyebrow">Board Channels</span>
            <h2>운영 카테고리</h2>
          </div>
          <p>바차타 입문자가 실제로 움직일 수 있는 정보와 씬 운영자가 필요한 연결을 같은 구조에 담습니다.</p>
        </div>
        <div class="category-grid">
          ${data.categories.map((category) => renderCategoryCard(category, data.entries)).join("\n")}
        </div>
      </section>
      <section class="submission">
        <span class="tag">Submit</span>
        <h2>홍보·구인·양도·팀 소개를 보내주세요</h2>
        <p>제목, 날짜, 장소, 가격, 원본 링크, 이미지/영상 링크, 연락처를 보내면 검수 후 카테고리에 맞춰 정리합니다.</p>
        <div class="entry-links">
          <a href="mailto:${escapeHtml(data.contact.email)}?subject=%5Bbachata.co.kr%5D%20%EC%BB%A4%EB%AE%A4%EB%8B%88%ED%8B%B0%20%EC%A0%9C%EB%B3%B4">메일로 제보</a>
          <a href="${escapeHtml(data.contact.instagram)}" target="_blank" rel="noreferrer">인스타그램 DM</a>
        </div>
      </section>
    </main>`;

  return layout({
    title: "바차타 커뮤니티 보드 | Bachata Korea",
    description: "한국 바차타 소셜, 워크숍, 양도, 중고, 구인구직, 장소, 팀 정보를 검수해 모으는 bachata.co.kr 커뮤니티 보드.",
    canonical: "https://bachata.co.kr/community/",
    jsonLd,
    body
  });
};

const renderCategoryPage = (data, category) => {
  const entries = data.entries.filter((entry) => entry.category === category.id);
  const intro = categoryIntro[category.id] || { eyebrow: "Community Board", note: category.description };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(slugPath(category.id)),
    "name": category.title,
    "description": category.description,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/community/" },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": entries.map((entry, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `${absoluteUrl(slugPath(category.id))}#${entry.id}`,
        "name": entry.title
      }))
    }
  };

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(intro.eyebrow)}</span>
          <h1>${escapeHtml(category.title)}</h1>
          <p>${escapeHtml(category.description)} ${escapeHtml(intro.note)}</p>
          <div class="quick-nav">
            <a href="/community/">전체 보드</a>
            ${data.categories.filter((item) => item.id !== category.id).map((item) => `<a href="${slugPath(item.id)}">${escapeHtml(item.label)}</a>`).join("")}
          </div>
        </div>
        <aside class="hero-note">
          <strong>${entries.length}개 항목</strong>
          <p>${escapeHtml(data.updatedAt)} 기준 초기 큐레이션입니다. 실제 운영 중에는 최신 제보와 검수된 공개 링크가 이 페이지에 누적됩니다.</p>
        </aside>
      </div>
    </section>
    <main>
      <div class="board-layout">
        <section class="entry-list">
          ${entries.map(renderEntry).join("\n")}
        </section>
        <aside class="side-note" aria-label="보드 운영 기준">
          <article>
            <span class="tag">Policy</span>
            <p>개인 정보, 무단 이미지, 출처 없는 홍보문은 싣지 않습니다. 일정·가격·장소·연락 방식이 확인된 항목부터 발행합니다.</p>
          </article>
          <article>
            <span class="tag">Submit</span>
            <p>업데이트가 필요하면 원본 링크와 수정 내용을 함께 보내주세요.</p>
            <div class="entry-links">
              <a href="mailto:${escapeHtml(data.contact.email)}?subject=%5Bbachata.co.kr%5D%20${encodeURIComponent(category.label)}%20%EC%A0%9C%EB%B3%B4">제보</a>
              <a href="${escapeHtml(data.contact.instagram)}" target="_blank" rel="noreferrer">DM</a>
            </div>
          </article>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${category.title} | 바차타 커뮤니티 보드`,
    description: category.description,
    canonical: absoluteUrl(slugPath(category.id)),
    jsonLd,
    body
  });
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  await writeFile(resolve(outDir, "index.html"), renderIndexPage(data), "utf8");
  for (const category of data.categories) {
    await writeFile(resolve(outDir, `${category.id}.html`), renderCategoryPage(data, category), "utf8");
  }

  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    categories: data.categories.map((category) => ({
      id: category.id,
      label: category.label,
      title: category.title,
      url: slugPath(category.id),
      entryCount: data.entries.filter((entry) => entry.category === category.id).length
    })),
    entries: data.entries.map((entry) => ({
      id: entry.id,
      category: entry.category,
      title: entry.title,
      url: `${slugPath(entry.category)}#${entry.id}`,
      status: entry.status,
      tags: entry.tags || []
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${data.categories.length + 1} community pages`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
