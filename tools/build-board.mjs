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
  "editorial-series": "연재 준비",
  collecting: "정보 보강 중",
  "submission-ready": "제보 접수 중",
  "research-queue": "취재 대기"
};

const categoryIntro = {
  free: {
    eyebrow: "자유게시판",
    note: "가볍게 쓴 후기라도 날짜, 장소, 음악 분위기가 있으면 다음 사람에게 꽤 좋은 길잡이가 됩니다."
  },
  transfer: {
    eyebrow: "양도양수",
    note: "가격, 일정, 양도 가능 여부가 분명한 글만 공개합니다. 거래는 당사자 책임으로 진행됩니다."
  },
  anonymous: {
    eyebrow: "익명게시판",
    note: "개인정보를 걷어내고 질문의 핵심만 남깁니다. 초보자가 말하기 어려운 질문일수록 더 또렷하게 다룹니다."
  },
  jobs: {
    eyebrow: "구인구직",
    note: "역할, 보수, 일정, 지원 방법이 분명한 글만 다룹니다. 좋은 현장은 조건이 먼저 선명해야 합니다."
  },
  promo: {
    eyebrow: "홍보/제휴",
    note: "홍보 문구를 그대로 붙이지 않고, 독자가 바로 확인해야 할 일정과 링크 중심으로 다시 정리합니다."
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

const videoEmbedUrl = (videoId) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
const videoWatchUrl = (videoId) => `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
const youtubeThumb = (videoId) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;

const renderLinks = (links = []) => links.map((link) => {
  const external = /^https?:\/\//.test(link.url);
  return `<a href="${escapeHtml(link.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
}).join("");

const renderMiniList = (items = []) => {
  if (!items.length) return "";
  return `<ul class="mini-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
};

const renderVideoFromLinks = (entry) => {
  const source = (entry.sourceLinks || []).find((link) => extractYouTubeId(link.url));
  const id = source ? extractYouTubeId(source.url) : "";
  if (!id) return "";
  const title = `${entry.title} 참고 영상`;
  return `<div class="video-loader" data-embed="${escapeHtml(videoEmbedUrl(id))}" data-title="${escapeHtml(title)}">
            <button type="button" data-video-button aria-label="${escapeHtml(title)} 열기">
              <img loading="lazy" src="${escapeHtml(youtubeThumb(id))}" alt="">
              <span>Play</span>
            </button>
            <a class="youtube-link" href="${escapeHtml(videoWatchUrl(id))}" target="_blank" rel="noreferrer">YouTube</a>
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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/complete/WantedSansVariable.css">`;

const styles = `    <style>
      :root {
        color-scheme: light;
        --ink: #191512;
        --paper: #f4efe6;
        --paper-soft: #fffaf0;
        --cream: #fff7e8;
        --muted: rgba(25, 21, 18, 0.66);
        --line: rgba(25, 21, 18, 0.13);
        --gold: #d89f46;
        --wine: #9d2447;
        --green: #1b6f61;
        font-family: "Pretendard Variable", Pretendard, "Wanted Sans Variable", "Wanted Sans", "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid rgba(255, 247, 232, 0.14); background: rgba(13, 12, 11, 0.92); color: var(--cream); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0; text-transform: uppercase; }
      .nav-links { display: flex; align-items: center; gap: 20px; color: rgba(255, 247, 232, 0.72); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(70px, 10vw, 132px) max(18px, calc((100vw - 1180px) / 2)) clamp(34px, 6vw, 70px); background: #11100e; color: var(--cream); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.86fr) minmax(280px, 0.36fr); gap: clamp(24px, 5vw, 64px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0; text-transform: uppercase; }
      .hero .eyebrow, .hero .tag { color: var(--gold); }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 960px; margin: 16px 0 18px; font-size: clamp(48px, 8vw, 104px); line-height: 0.94; overflow-wrap: anywhere; }
      .hero p { max-width: 800px; margin: 0; color: rgba(255, 247, 232, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .hero-note { padding: 22px; border: 1px solid rgba(255, 247, 232, 0.16); border-radius: 8px; background: rgba(255, 247, 232, 0.06); }
      .hero-note strong { display: block; margin-bottom: 10px; color: var(--gold); font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; font-size: 24px; }
      .quick-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
      .quick-nav a, .button { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 13px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
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
      .mini-list { display: grid; gap: 7px; margin: 12px 0 0; padding-left: 18px; color: var(--muted); font-size: 14px; line-height: 1.5; }
      .mini-list li::marker { color: var(--gold); }
      .video-loader { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #070707; }
      .video-loader button { all: unset; position: absolute; inset: 0; display: block; cursor: pointer; }
      .video-loader img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.9) contrast(1.08); transform: scale(1.02); transition: transform 180ms ease; }
      .video-loader button::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7, 7, 7, 0.08), rgba(7, 7, 7, 0.58)); }
      .video-loader span { position: absolute; left: 14px; bottom: 12px; z-index: 1; display: inline-flex; align-items: center; min-height: 32px; padding: 0 11px; border-radius: 999px; background: rgba(13, 12, 11, 0.76); color: var(--cream); font-size: 12px; font-weight: 950; letter-spacing: 0; text-transform: uppercase; }
      .video-loader button:hover img, .video-loader button:focus-visible img { transform: scale(1.055); }
      .video-loader button:focus-visible { outline: 2px solid var(--gold); outline-offset: -4px; }
      .video-loader iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .youtube-link { position: absolute; right: 12px; bottom: 12px; z-index: 2; display: inline-flex; align-items: center; min-height: 32px; padding: 0 10px; border: 1px solid rgba(255, 247, 232, 0.32); border-radius: 999px; background: rgba(13, 12, 11, 0.68); color: var(--cream); font-size: 12px; font-weight: 900; }
      .video-loader[data-loaded="true"] .youtube-link { display: none; }
      .entry-side { display: grid; gap: 12px; align-content: start; }
      .entry-side > article { padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 250, 240, 0.74); }
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
        <a href="/briefs/">최신소식</a>
        <a href="/styles/">세부장르</a>
        <a href="/profiles/">댄서 소개</a>
        <a href="/community/">커뮤니티</a>
        <a href="/submit/">제보</a>
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
        iframe.title = loader.dataset.title || "Bachata community video";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        loader.dataset.loaded = "true";
        loader.textContent = "";
        loader.appendChild(iframe);
      });
    </script>`;

const renderCategoryCard = (category, entries) => {
  const categoryEntries = entries.filter((entry) => entry.category === category.id);
  return `<article class="category-card">
          <div>
            <span class="tag">${escapeHtml(categoryIntro[category.id]?.eyebrow || "커뮤니티")}</span>
            <h3>${escapeHtml(category.label)}</h3>
            <p>${escapeHtml(category.description)}</p>
            ${renderMiniList(category.submissionFields || [])}
          </div>
          <div>
            <span class="count">${categoryEntries.length}개 항목</span>
            <div class="entry-links"><a href="${slugPath(category.id)}">자세히 보기</a></div>
          </div>
        </article>`;
};

const renderEntry = (entry) => {
  const tags = (entry.tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  const links = renderLinks(entry.sourceLinks);
  const video = renderVideoFromLinks(entry);
  const requirements = entry.requirements?.length
    ? `<article><span class="tag">등록 전 확인할 것</span>${renderMiniList(entry.requirements)}</article>`
    : "";
  const status = statusLabels[entry.status] || entry.status;
  const sideBlocks = [video, requirements].filter(Boolean).join("\n              ");
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
              ${sideBlocks || `<article><span class="tag">확인 기준</span><p>일정, 가격, 장소, 공식 링크가 확인되면 개별 기사와 공지로 확장합니다.</p></article>`}
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
${videoLoaderScript}
  </body>
</html>
`;

const renderIndexPage = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/community/",
    name: "바차타 코리아 커뮤니티",
    description: "한국 바차타 소셜, 워크숍, 양도양수, 구인구직, 홍보 제보를 공개 링크 기준으로 정리합니다.",
    inLanguage: "ko-KR",
    isPartOf: { "@id": "https://bachata.co.kr/#website" },
    hasPart: data.categories.map((category) => ({
      "@type": "CollectionPage",
      "@id": absoluteUrl(slugPath(category.id)),
      name: category.title
    }))
  };

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">커뮤니티 제보</span>
          <h1>한국 바차타 소식과 제보</h1>
          <p>소셜 후기, 워크숍 일정, 티켓 양도, 댄스화 중고, 강사·DJ 구인, 장소·팀 홍보를 제보와 공개 링크를 바탕으로 정리합니다. 확인된 항목은 기사와 일정으로 이어집니다.</p>
          <div class="quick-nav">
            ${data.categories.map((category) => `<a href="${slugPath(category.id)}">${escapeHtml(category.label)}</a>`).join("")}
          </div>
        </div>
        <aside class="hero-note">
          <strong>제보는 정리해서 공개합니다</strong>
          <p>원문을 그대로 붙이지 않습니다. 날짜, 장소, 가격, 공식 링크처럼 독자가 바로 확인해야 할 정보만 남깁니다.</p>
        </aside>
      </div>
    </section>
    <main>
      <section>
        <div class="section-head">
          <div>
            <span class="eyebrow">카테고리</span>
            <h2>커뮤니티 메뉴</h2>
          </div>
          <p>지금은 로그인 게시판보다 매거진형 제보 큐레이션을 우선합니다. 받은 내용은 확인 후 읽기 쉬운 공지나 기사로 다듬습니다.</p>
        </div>
        <div class="category-grid">
          ${data.categories.map((category) => renderCategoryCard(category, data.entries)).join("\n")}
        </div>
      </section>
      <section class="submission">
        <span class="tag">제보하기</span>
        <h2>홍보·구인·양도·팀 소개를 보내주세요</h2>
        <p>제목, 날짜, 장소, 가격, 공식 링크, 이미지나 영상 링크, 연락처를 함께 보내면 더 빨리 정리할 수 있습니다.</p>
        <div class="entry-links">
          <a href="/submit/">제보 센터</a>
          <a href="mailto:${escapeHtml(data.contact.email)}?subject=%5Bbachata.co.kr%5D%20%EC%BB%A4%EB%AE%A4%EB%8B%88%ED%8B%B0%20%EC%A0%9C%EB%B3%B4">메일로 제보</a>
          <a href="${escapeHtml(data.contact.instagram)}" target="_blank" rel="noreferrer">인스타그램 DM</a>
        </div>
      </section>
    </main>`;

  return layout({
    title: "바차타 커뮤니티 | 소셜·워크숍·양도·구인 제보",
    description: "한국 바차타 소셜, 워크숍, 티켓 양도, 댄스화 중고, 구인구직, 장소와 팀 홍보를 제보와 공개 링크 기준으로 정리합니다.",
    canonical: "https://bachata.co.kr/community/",
    jsonLd,
    body
  });
};

const renderCategoryPage = (data, category) => {
  const entries = data.entries.filter((entry) => entry.category === category.id);
  const intro = categoryIntro[category.id] || { eyebrow: "커뮤니티", note: category.description };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(slugPath(category.id)),
    name: category.title,
    description: category.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": "https://bachata.co.kr/community/" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${absoluteUrl(slugPath(category.id))}#${entry.id}`,
        name: entry.title
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
            <a href="/community/">전체 커뮤니티</a>
            ${data.categories.filter((item) => item.id !== category.id).map((item) => `<a href="${slugPath(item.id)}">${escapeHtml(item.label)}</a>`).join("")}
          </div>
        </div>
        <aside class="hero-note">
          <strong>${entries.length}개 항목</strong>
          <p>${escapeHtml(data.updatedAt)} 기준으로 정리한 목록입니다. 제보가 들어오면 공식 링크와 확인 포인트를 더해 갱신합니다.</p>
        </aside>
      </div>
    </section>
    <main>
      <div class="board-layout">
        <section class="entry-list">
          ${entries.map(renderEntry).join("\n")}
        </section>
        <aside class="side-note" aria-label="커뮤니티 운영 기준">
          <article>
            <span class="tag">운영 기준</span>
            <p>개인정보, 무단 이미지, 출처 없는 홍보문은 올리지 않습니다. 일정, 가격, 장소, 연락 방법처럼 확인 가능한 정보부터 공개합니다.</p>
          </article>
          <article>
            <span class="tag">제보하기</span>
            <p>수정이 필요한 내용은 원문 링크와 수정 내용을 함께 보내주세요.</p>
            <div class="entry-links">
              <a href="mailto:${escapeHtml(data.contact.email)}?subject=%5Bbachata.co.kr%5D%20${encodeURIComponent(category.label)}%20%EC%A0%9C%EB%B3%B4">제보</a>
              <a href="/submit/">제보 센터</a>
              <a href="${escapeHtml(data.contact.instagram)}" target="_blank" rel="noreferrer">DM</a>
            </div>
          </article>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${category.title} | 바차타 커뮤니티`,
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
      entryCount: data.entries.filter((entry) => entry.category === category.id).length,
      submitLabel: category.submitLabel,
      submissionFields: category.submissionFields || []
    })),
    entries: data.entries.map((entry) => ({
      id: entry.id,
      category: entry.category,
      title: entry.title,
      url: `${slugPath(entry.category)}#${entry.id}`,
      status: entry.status,
      tags: entry.tags || [],
      requirements: entry.requirements || [],
      hasVideo: (entry.sourceLinks || []).some((link) => extractYouTubeId(link.url))
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${data.categories.length + 1} community pages`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
