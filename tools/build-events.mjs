import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/events.json");
const outDir = resolve(root, "events");
const indexPath = resolve(root, "data/generated/event-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const pagePath = (event) => `/events/${event.id}.html`;
const pageUrl = (event) => `https://bachata.co.kr${pagePath(event)}`;
const monthLabel = (month) => {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
};

const statusLabels = {
  confirmed: "확정 소스",
  watch: "관찰 중",
  archive: "최근 아카이브"
};

const statusDescriptions = {
  confirmed: "공식 행사/티켓/디렉터리 링크가 확인된 일정입니다.",
  watch: "인스타그램과 검색 신호가 강하지만 세부 조건을 더 확인해야 합니다.",
  archive: "지난 워크숍·소셜 영상 기록입니다. 예매 정보가 아니라 씬 흐름을 읽는 자료입니다."
};

const videoEmbedUrl = (video = {}) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`;
const videoWatchUrl = (video = {}) => `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;

const renderVideo = (video, className = "video-frame") => {
  if (!video?.id) return "";
  return `<div class="${className}">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || "Bachata event video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
};

const renderLinks = (links = []) => links.map((link) => {
  const external = /^https?:\/\//.test(link.url);
  return `<a href="${escapeHtml(link.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
}).join("");

const groupByMonth = (events) => events.reduce((groups, event) => {
  if (!groups.has(event.month)) groups.set(event.month, []);
  groups.get(event.month).push(event);
  return groups;
}, new Map());

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
        --panel-strong: #17130f;
        --paper: #f4efe6;
        --paper-ink: #1a1510;
        --gold: #e2ad58;
        --wine: #a82e4b;
        --green: #4ea68e;
        font-family: "Pretendard Variable", Pretendard, "Wanted Sans Variable", "Wanted Sans", "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(13, 12, 9, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 20px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(60px, 9vw, 118px) max(18px, calc((100vw - 1180px) / 2)) 50px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.78fr) minmax(320px, 0.42fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 920px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 96px); line-height: 0.95; overflow-wrap: anywhere; }
      .hero p { max-width: 790px; color: rgba(26, 21, 16, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .quick-nav, .link-row, .tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 26px; }
      .quick-nav a, .link-row a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
      .method-card { padding: 22px; border: 1px solid rgba(26, 21, 16, 0.14); border-radius: 8px; background: rgba(26, 21, 16, 0.05); }
      .method-card ul { display: grid; gap: 8px; margin: 12px 0 0; padding-left: 18px; color: rgba(26, 21, 16, 0.72); line-height: 1.65; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section { margin-top: clamp(42px, 7vw, 76px); }
      .section:first-child { margin-top: 0; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .event-card p, .summary p, .side-box p, .note p { color: var(--muted); line-height: 1.72; }
      .month-stack { display: grid; gap: 28px; }
      .month-band { display: grid; gap: 14px; }
      .month-band h2 { margin: 0; padding-top: 20px; border-top: 1px solid var(--line); font-size: clamp(32px, 5vw, 58px); line-height: 1.02; }
      .event-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .event-card { display: grid; grid-template-columns: minmax(0, 1fr); align-content: space-between; gap: 16px; min-height: 410px; padding: clamp(20px, 4vw, 28px); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .event-card h3 { margin: 8px 0 10px; font-size: clamp(28px, 4vw, 42px); line-height: 1.04; }
      .meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
      .meta-row span, .tag-row span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.76); font-size: 12px; font-weight: 900; }
      .status-confirmed { color: var(--green); }
      .status-watch { color: var(--gold); }
      .status-archive { color: #d98686; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .event-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 22px; align-items: start; }
      .main-stack, .side-stack { display: grid; gap: 16px; }
      .summary, .note, .side-box { padding: clamp(20px, 4vw, 30px); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .summary { background: rgba(226, 173, 88, 0.08); }
      .note h2, .side-box h2 { margin: 8px 0 12px; font-size: 28px; line-height: 1.08; }
      .note ul, .side-box ul { display: grid; gap: 8px; margin: 14px 0 0; padding-left: 20px; color: rgba(255, 247, 232, 0.76); line-height: 1.65; }
      .side-stack { position: sticky; top: 96px; }
      .paper-cta { padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: var(--paper); color: var(--paper-ink); }
      .paper-cta h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .paper-cta p { max-width: 760px; color: rgba(26, 21, 16, 0.72); line-height: 1.72; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head, .event-layout { grid-template-columns: 1fr; }
        .event-grid { grid-template-columns: 1fr; }
        .side-stack { position: static; }
      }
      @media (max-width: 700px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .event-card, .summary, .note, .side-box { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="행사 레이더 이동">
        <a href="/">홈</a>
        <a href="/events/">행사</a>
        <a href="/styles/">스타일</a>
        <a href="/profiles/">인물·팀</a>
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

const renderEventCard = (event) => {
  const statusClass = `status-${event.status}`;
  return `<article class="event-card">
          <div>
            <span class="tag ${statusClass}">${escapeHtml(statusLabels[event.status] || event.status)}</span>
            <h3>${escapeHtml(event.title)}</h3>
            <div class="meta-row">
              <span>${escapeHtml(event.dateLabel)}</span>
              <span>${escapeHtml(event.city)}</span>
              <span>${escapeHtml(event.category)}</span>
            </div>
            <p>${escapeHtml(event.summary)}</p>
          </div>
          <div>
            <div class="tag-row">${event.tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <div class="link-row" style="margin-top:14px">
              <a href="${pagePath(event)}">레이더 노트</a>
              ${event.sourceLinks[0] ? `<a href="${escapeHtml(event.sourceLinks[0].url)}" target="_blank" rel="noreferrer">원본 확인</a>` : ""}
            </div>
          </div>
        </article>`;
};

const renderIndex = (data) => {
  const grouped = groupByMonth(data.radar);
  const months = [...grouped.keys()].sort();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/events/",
    "name": data.title,
    "description": data.dek,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "hasPart": data.radar.map((event) => ({ "@id": pageUrl(event), "name": event.title }))
  };

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Event Radar</span>
          <h1>월별 내한·페스티벌 레이더</h1>
          <p>${escapeHtml(data.dek)}</p>
          <div class="quick-nav">
            ${months.map((month) => `<a href="#month-${escapeHtml(month)}">${escapeHtml(monthLabel(month))}</a>`).join("")}
          </div>
        </div>
        <aside class="method-card">
          <span class="tag">Editorial Method</span>
          <ul>${data.method.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </aside>
      </div>
    </section>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Korea Bachata Calendar</span>
            <h2>확정 일정과 최근 영상 신호</h2>
          </div>
          <p>행사 페이지, 인스타 공지, 유튜브 기록을 한 화면에서 보고 개별 레이더 노트로 들어갑니다. 날짜가 다른 소스는 그대로 표시하고 재확인 포인트를 남깁니다.</p>
        </div>
        <div class="month-stack">
          ${months.map((month) => `<section class="month-band" id="month-${escapeHtml(month)}">
            <h2>${escapeHtml(monthLabel(month))}</h2>
            <div class="event-grid">${grouped.get(month).map(renderEventCard).join("")}</div>
          </section>`).join("\n")}
        </div>
      </section>
      <section class="section paper-cta">
        <span class="tag">Watch Sources</span>
        <h2>매일 브리프와 연결되는 행사 소스</h2>
        <p>이 페이지는 고정 캘린더가 아니라 편집 레이더입니다. 새 행사 신호가 생기면 data/events.json에 추가하고, 공식 링크와 영상 검증을 거쳐 발행합니다.</p>
        <div class="link-row">${renderLinks(data.watchSources)}</div>
      </section>
    </main>`;

  return layout({
    title: `${data.title} | Bachata Korea`,
    description: data.dek,
    canonical: "https://bachata.co.kr/events/",
    jsonLd,
    body
  });
};

const renderEvent = (event, data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": pageUrl(event),
    "name": event.title,
    "description": event.summary,
    "startDate": event.startDate,
    "endDate": event.endDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "inLanguage": "ko-KR",
    "location": {
      "@type": "Place",
      "name": event.venue,
      "address": event.city
    },
    "isPartOf": { "@id": "https://bachata.co.kr/events/" },
    "mainEntityOfPage": pageUrl(event),
    "sameAs": event.sourceLinks.filter((link) => /^https?:\/\//.test(link.url)).map((link) => link.url),
    "video": event.video?.id ? {
      "@type": "VideoObject",
      "name": event.video.title,
      "embedUrl": videoEmbedUrl(event.video),
      "url": videoWatchUrl(event.video)
    } : undefined
  };

  const otherEvents = data.radar.filter((item) => item.id !== event.id);
  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(statusLabels[event.status] || event.status)}</span>
          <h1>${escapeHtml(event.title)}</h1>
          <p>${escapeHtml(event.summary)}</p>
          <div class="quick-nav">
            <a href="/events/">행사 레이더</a>
            ${otherEvents.slice(0, 3).map((item) => `<a href="${pagePath(item)}">${escapeHtml(item.title)}</a>`).join("")}
          </div>
        </div>
        ${renderVideo(event.video)}
      </div>
    </section>
    <main>
      <div class="event-layout">
        <div class="main-stack">
          <section class="summary">
            <span class="tag">Why It Matters</span>
            <p>${escapeHtml(event.whyItMatters)}</p>
          </section>
          <section class="note">
            <span class="tag">Booking Check</span>
            <h2>예매 전 확인할 점</h2>
            <p>${escapeHtml(event.checkBeforeBooking)}</p>
          </section>
          <section class="note">
            <span class="tag">Editorial Status</span>
            <h2>${escapeHtml(statusLabels[event.status] || event.status)}</h2>
            <p>${escapeHtml(statusDescriptions[event.status] || "")}</p>
          </section>
        </div>
        <aside class="side-stack">
          <section class="side-box">
            <span class="tag">Event Info</span>
            <h2>일정 요약</h2>
            <ul>
              <li>${escapeHtml(event.dateLabel)}</li>
              <li>${escapeHtml(event.city)} · ${escapeHtml(event.venue)}</li>
              <li>${escapeHtml(event.category)}</li>
            </ul>
          </section>
          <section class="side-box">
            <span class="tag">Sources</span>
            <h2>원본 링크</h2>
            <div class="link-row">${renderLinks(event.sourceLinks)}</div>
          </section>
          <section class="side-box">
            <span class="tag">Tags</span>
            <h2>검색 키워드</h2>
            <div class="tag-row">${event.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          </section>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${event.title} | 바차타 행사 레이더`,
    description: event.summary,
    canonical: pageUrl(event),
    jsonLd,
    body
  });
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  await writeFile(resolve(outDir, "index.html"), renderIndex(data), "utf8");
  await Promise.all(data.radar.map((event) => writeFile(resolve(outDir, `${event.id}.html`), renderEvent(event, data), "utf8")));

  const index = {
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    title: data.title,
    url: "/events/",
    events: data.radar.map((event) => ({
      id: event.id,
      title: event.title,
      month: event.month,
      url: pagePath(event),
      startDate: event.startDate,
      endDate: event.endDate,
      city: event.city,
      status: event.status,
      videoId: event.video?.id || null,
      sourceUrls: event.sourceLinks.map((link) => link.url),
      tags: event.tags
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
