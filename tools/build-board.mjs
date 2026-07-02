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

const cleanOutput = (value = "") => String(value).replace(/[ \t]+$/gm, "");
const slugPath = (categoryId) => categoryId === "index" ? "/community/" : `/community/${categoryId}.html`;
const absoluteUrl = (path) => `https://bachata.co.kr${path}`;

const statusLabels = {
  "editorial-series": "연재 준비",
  collecting: "정보 보강 중",
  "submission-ready": "제보 접수 중",
  "research-queue": "취재 대기"
};

const categoryNotes = {
  free: "소셜 후기, 연습 메모, 음악 추천처럼 가볍게 나눌 수 있는 이야기를 모읍니다.",
  transfer: "티켓, 패스, 댄스화, 의상 양도는 가격과 상태가 분명한 정보만 공개합니다.",
  anonymous: "개인정보를 덜어내고 질문의 핵심만 남겨 초보자가 편하게 읽을 수 있게 정리합니다.",
  jobs: "역할, 보수, 일정, 지원 방법이 분명한 글만 모아 현장의 일거리를 빠르게 확인하게 합니다.",
  promo: "홍보 문구를 그대로 붙이지 않고, 일정·장소·공식 링크 중심으로 다시 정리합니다."
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

const head = ({ title, description, canonical, jsonLd }) => `  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-video-preview:-1,max-snippet:-1,max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/complete/WantedSansVariable.css">
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>`;

const page = ({ title, description, canonical, jsonLd, body }) => cleanOutput(`<!doctype html>
<html lang="ko">
${head({ title, description, canonical, jsonLd })}
  <body>
${body}
  </body>
</html>
`);

const renderQuickNav = (categories, activeId = "") => `<div class="quick-nav community-tabs">
        <a href="/community/"${activeId ? "" : " aria-current=\"page\""}>전체</a>
        ${categories.map((category) => `<a href="${slugPath(category.id)}"${category.id === activeId ? " aria-current=\"page\"" : ""}>${escapeHtml(category.label)}</a>`).join("")}
      </div>`;

const renderSourceLinks = (links = []) => {
  if (!links.length) return "";
  return links.map((link) => {
    const external = /^https?:\/\//.test(link.url) || link.url.startsWith("mailto:");
    return `<a href="${escapeHtml(link.url)}"${external && !link.url.startsWith("mailto:") ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
  }).join("");
};

const renderMiniList = (items = []) => {
  if (!items.length) return "";
  return `<ul class="mini-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
};

const renderVideo = (entry) => {
  const source = (entry.sourceLinks || []).find((link) => extractYouTubeId(link.url));
  const id = source ? extractYouTubeId(source.url) : "";
  if (!id) return "";
  const title = `${entry.title} 참고 영상`;
  return `<div class="video-loader thread-video" data-embed="${escapeHtml(videoEmbedUrl(id))}" data-title="${escapeHtml(title)}">
          <button type="button" data-video-button aria-label="${escapeHtml(title)} 열기">
            <img loading="lazy" src="${escapeHtml(youtubeThumb(id))}" alt="">
            <span>영상</span>
          </button>
          <a class="youtube-link" href="${escapeHtml(videoWatchUrl(id))}" target="_blank" rel="noreferrer">YouTube</a>
        </div>`;
};

const entryUrl = (entry) => `${slugPath(entry.category)}#${entry.id}`;
const categoryById = (categories, id) => categories.find((category) => category.id === id);

const renderThreadCard = (entry, category, options = {}) => {
  const status = statusLabels[entry.status] || entry.status || "확인 중";
  const tags = (entry.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const links = renderSourceLinks(entry.sourceLinks);
  const video = renderVideo(entry);
  const titleTag = options.compact ? "h3" : "h2";
  const href = options.linkTitle === false ? "" : ` href="${escapeHtml(entryUrl(entry))}"`;

  return `<article class="thread-card${video ? " has-video" : ""}" id="${escapeHtml(entry.id)}">
        <div class="thread-score">
          <strong>${escapeHtml(category?.label || "커뮤니티")}</strong>
          <span>${escapeHtml(status)}</span>
        </div>
        <div class="thread-main">
          <div class="thread-meta">
            <span>${escapeHtml(entry.location)}</span>
            <span>${escapeHtml(entry.dateLabel)}</span>
            <span>${escapeHtml(entry.callToAction)}</span>
          </div>
          <${titleTag}>${href ? `<a${href}>${escapeHtml(entry.title)}</a>` : escapeHtml(entry.title)}</${titleTag}>
          <p>${escapeHtml(entry.summary)}</p>
          <div class="thread-tags">${tags}</div>
          <div class="thread-actions">
            ${links}
            ${href ? `<a href="${escapeHtml(entryUrl(entry))}">자세히 보기</a>` : ""}
          </div>
        </div>
        <aside class="thread-side">
          ${video || ""}
          <div class="thread-check"><strong>등록 전 확인할 것</strong>${renderMiniList(entry.requirements || [])}</div>
        </aside>
      </article>`;
};

const renderCategoryCard = (category, entries) => {
  const count = entries.filter((entry) => entry.category === category.id).length;
  return `<a class="forum-card" href="${slugPath(category.id)}">
        <span>${escapeHtml(category.label)}</span>
        <strong>${escapeHtml(category.title)}</strong>
        <p>${escapeHtml(category.description)}</p>
        <em>${count}개 항목</em>
      </a>`;
};

const renderSidebar = (data, activeId = "") => `<aside class="forum-sidebar">
      <article>
        <span class="eyebrow">운영 기준</span>
        <p>개인정보, 무단 이미지, 출처 없는 홍보문은 공개하지 않습니다. 날짜, 장소, 가격, 공식 링크처럼 독자가 바로 확인할 정보만 남깁니다.</p>
      </article>
      <article>
        <span class="eyebrow">제보하기</span>
        <p>행사, 양도, 구인, 팀 홍보는 원문 링크와 확인 가능한 정보를 함께 보내주세요.</p>
        <div class="thread-actions">
          <a href="/submit/">제보 센터</a>
          <a href="mailto:${escapeHtml(data.contact.email)}?subject=%5Bbachata.co.kr%5D%20%EC%BB%A4%EB%AE%A4%EB%8B%88%ED%8B%B0%20%EC%A0%9C%EB%B3%B4">메일</a>
          <a href="${escapeHtml(data.contact.instagram)}" target="_blank" rel="noreferrer">DM</a>
        </div>
      </article>
      <article>
        <span class="eyebrow">게시판</span>
        <nav class="forum-side-nav">
          <a href="/community/"${activeId ? "" : " aria-current=\"page\""}>전체 피드</a>
          ${data.categories.map((category) => `<a href="${slugPath(category.id)}"${category.id === activeId ? " aria-current=\"page\"" : ""}>${escapeHtml(category.label)}</a>`).join("")}
        </nav>
      </article>
    </aside>`;

const renderIndexPage = (data) => {
  const entries = data.entries || [];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/community/",
    name: "바차타 코리아 커뮤니티",
    description: "한국 바차타 소셜, 워크숍, 양도, 구인구직, 홍보 제보를 공개 링크 기준으로 정리하는 커뮤니티 피드.",
    inLanguage: "ko-KR",
    isPartOf: { "@id": "https://bachata.co.kr/#website" }
  };

  const body = `    <main class="community-main">
      <section class="community-hero">
        <div>
          <span class="eyebrow">커뮤니티</span>
          <h1>한국 바차타 커뮤니티 피드</h1>
          <p>소셜 후기, 워크숍 일정, 티켓 양도, 구인구직, 팀 홍보를 한 화면에서 훑어보는 피드입니다. 지금은 로그인 게시판보다 확인된 제보를 읽기 쉬운 글로 정리하는 데 집중합니다.</p>
          ${renderQuickNav(data.categories)}
        </div>
        <aside class="community-submit-card">
          <strong>제보는 확인해서 올립니다</strong>
          <p>원문을 그대로 붙이지 않고, 날짜·장소·가격·공식 링크처럼 독자가 바로 확인할 정보만 남깁니다.</p>
          <a href="/submit/">소식 제보</a>
        </aside>
      </section>
      <section class="community-layout">
        <div class="community-content">
          <div class="forum-grid">
            ${data.categories.map((category) => renderCategoryCard(category, entries)).join("\n            ")}
          </div>
          <div class="section-head compact">
            <div>
              <span class="eyebrow">전체 피드</span>
              <h2>지금 올라온 항목</h2>
            </div>
            <p>Reddit의 스레드처럼 빠르게 훑고, Quora처럼 필요한 맥락을 바로 볼 수 있게 제목·요약·확인 링크를 한 줄 흐름으로 정리합니다.</p>
          </div>
          <section class="thread-feed">
            ${entries.map((entry) => renderThreadCard(entry, categoryById(data.categories, entry.category), { compact: true })).join("\n            ")}
          </section>
        </div>
        ${renderSidebar(data)}
      </section>
    </main>`;

  return page({
    title: "바차타 커뮤니티 | 소셜·워크숍·양도·구인 제보",
    description: "한국 바차타 소셜 후기, 워크숍 일정, 양도양수, 익명 질문, 구인구직, 홍보 제보를 공개 링크 기준으로 정리합니다.",
    canonical: "https://bachata.co.kr/community/",
    jsonLd,
    body
  });
};

const renderCategoryPage = (data, category) => {
  const entries = (data.entries || []).filter((entry) => entry.category === category.id);
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

  const body = `    <main class="community-main">
      <section class="community-hero">
        <div>
          <span class="eyebrow">${escapeHtml(category.label)}</span>
          <h1>${escapeHtml(category.title)}</h1>
          <p>${escapeHtml(category.description)} ${escapeHtml(categoryNotes[category.id] || "")}</p>
          ${renderQuickNav(data.categories, category.id)}
        </div>
        <aside class="community-submit-card">
          <strong>${entries.length}개 항목</strong>
          <p>${escapeHtml(data.updatedAt)} 기준으로 정리한 목록입니다. 제보가 들어오면 원문 링크와 확인 포인트를 붙여 갱신합니다.</p>
          <div class="thread-check"><strong>제보할 때 필요한 정보</strong>${renderMiniList(category.submissionFields || [])}</div>
          <a href="mailto:${escapeHtml(data.contact.email)}?subject=%5Bbachata.co.kr%5D%20${encodeURIComponent(category.label)}%20%EC%A0%9C%EB%B3%B4">이 게시판에 제보</a>
        </aside>
      </section>
      <section class="community-layout">
        <div class="community-content">
          <section class="thread-feed">
            ${entries.map((entry) => renderThreadCard(entry, category, { linkTitle: false })).join("\n            ")}
          </section>
        </div>
        ${renderSidebar(data, category.id)}
      </section>
    </main>`;

  return page({
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
      url: entryUrl(entry),
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
