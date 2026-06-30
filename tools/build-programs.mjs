import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/programs.json");
const outDir = resolve(root, "programs");
const indexPath = resolve(root, "data/generated/program-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const pagePath = (program) => `/programs/${program.id}.html`;
const pageUrl = (program) => `https://bachata.co.kr${pagePath(program)}`;

const videoEmbedUrl = (video = {}) => {
  const start = video.start ? `?start=${encodeURIComponent(video.start)}` : "";
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}${start}`;
};

const videoWatchUrl = (video = {}) => {
  const start = video.start ? `&t=${encodeURIComponent(video.start)}s` : "";
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}${start}`;
};

const renderVideo = (video, className = "video-frame") => {
  if (!video?.id) return "";
  return `<div class="${className}">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || "Bachata program video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css">`;

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
        font-family: "SUIT Variable", SUIT, Pretendard, "Noto Sans KR", system-ui, sans-serif;
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
      h1, h2, h3 { font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 940px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 96px); line-height: 0.95; overflow-wrap: anywhere; }
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
      .section-head p, .program-card p, .module-card p, .method-card li, .side-card p { color: var(--muted); line-height: 1.72; }
      .program-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .program-card { display: grid; align-content: space-between; gap: 18px; min-height: 420px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .program-card h2 { margin: 10px 0 0; font-size: clamp(28px, 4vw, 42px); line-height: 1.04; }
      .meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
      .meta-row span, .tag-row span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.76); font-size: 12px; font-weight: 900; }
      .method-card { padding: 22px; border: 1px solid rgba(26, 21, 16, 0.14); border-radius: 8px; background: rgba(26, 21, 16, 0.05); }
      .method-card ul { display: grid; gap: 8px; margin: 12px 0 0; padding-left: 18px; }
      .method-card li { color: rgba(26, 21, 16, 0.72); }
      .program-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 22px; align-items: start; }
      .module-stack, .side-stack { display: grid; gap: 14px; }
      .module-card, .side-card { padding: clamp(20px, 4vw, 28px); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .module-card { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 18px; align-items: start; }
      .module-number { display: inline-grid; place-items: center; width: 52px; height: 52px; border: 1px solid rgba(226, 173, 88, 0.42); border-radius: 50%; color: var(--gold); font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; font-weight: 900; }
      .module-card h2 { margin: 6px 0 10px; font-size: clamp(26px, 4vw, 38px); line-height: 1.06; }
      .module-card a { display: inline-flex; margin-top: 12px; color: var(--gold); font-weight: 900; }
      .side-stack { position: sticky; top: 96px; }
      .side-card h2 { margin: 8px 0 12px; font-size: 28px; line-height: 1.08; }
      .paper-cta { padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: var(--paper); color: var(--paper-ink); }
      .paper-cta h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .paper-cta p { max-width: 780px; color: rgba(26, 21, 16, 0.72); line-height: 1.72; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head, .program-layout { grid-template-columns: 1fr; }
        .program-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .side-stack { position: static; }
      }
      @media (max-width: 760px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .program-grid, .module-card { grid-template-columns: 1fr; }
        .program-card, .module-card, .side-card { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="프로그램 이동">
        <a href="/">홈</a>
        <a href="/programs/">프로그램</a>
        <a href="/styles/">스타일</a>
        <a href="/articles/">기사</a>
        <a href="/radar/">소셜 레이더</a>
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

const renderProgramCard = (program) => `<article class="program-card">
          <div>
            <span class="tag">${escapeHtml(program.eyebrow)}</span>
            <h2>${escapeHtml(program.title)}</h2>
            <p>${escapeHtml(program.dek)}</p>
            <div class="meta-row">
              <span>${escapeHtml(program.level)}</span>
              <span>${escapeHtml(program.duration)}</span>
              <span>${escapeHtml(program.style)}</span>
            </div>
          </div>
          <div>
            ${renderVideo(program.heroVideo)}
            <div class="link-row" style="margin-top:14px"><a href="${pagePath(program)}">프로그램 보기</a></div>
          </div>
        </article>`;

const renderIndex = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/programs/",
    "name": data.title,
    "description": data.dek,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "hasPart": data.programs.map((program) => ({ "@id": pageUrl(program), "name": program.title }))
  };

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Program Library</span>
          <h1>영상으로 시작하는 바차타 학습 경로</h1>
          <p>${escapeHtml(data.dek)}</p>
          <div class="quick-nav">
            ${data.programs.map((program) => `<a href="${pagePath(program)}">${escapeHtml(program.title)}</a>`).join("")}
          </div>
        </div>
        <aside class="method-card">
          <span class="tag">Method</span>
          <ul>${data.method.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </aside>
      </div>
    </section>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Learning Paths</span>
            <h2>VOD처럼 고른 뒤, 웹진처럼 깊게 읽습니다</h2>
          </div>
          <p>구독형 강의 플랫폼은 아니지만 첫 화면은 영상 중심으로, 다음 단계는 기사·허브·프로필·레이더로 이어지게 구성했습니다.</p>
        </div>
        <div class="program-grid">
          ${data.programs.map(renderProgramCard).join("\n")}
        </div>
      </section>
      <section class="section paper-cta">
        <span class="tag">Editorial Loop</span>
        <h2>코어 콘텐츠와 매일 갱신되는 소식을 분리합니다</h2>
        <p>센슈얼 16 펀더멘털, 도미니칸 리듬, Bachazouk 안전 기준은 오래 가는 프로그램으로 두고, 내한·소셜·상품·팀 소식은 레이더와 브리프에서 매일 갱신합니다.</p>
        <div class="link-row">
          <a href="/radar/">소셜 레이더</a>
          <a href="/briefs/">오늘 브리프</a>
          <a href="/events/">행사 레이더</a>
        </div>
      </section>
    </main>`;

  return layout({
    title: `${data.title} | Bachata Korea`,
    description: data.dek,
    canonical: "https://bachata.co.kr/programs/",
    jsonLd,
    body
  });
};

const renderProgram = (program, data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": pageUrl(program),
    "name": program.title,
    "description": program.dek,
    "inLanguage": "ko-KR",
    "courseMode": "online",
    "educationalLevel": program.level,
    "keywords": program.keywords.join(", "),
    "isPartOf": { "@id": "https://bachata.co.kr/programs/" },
    "mainEntityOfPage": pageUrl(program),
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "courseWorkload": program.duration
    },
    "video": {
      "@type": "VideoObject",
      "name": program.heroVideo.title,
      "embedUrl": videoEmbedUrl(program.heroVideo),
      "url": videoWatchUrl(program.heroVideo)
    }
  };

  const otherPrograms = data.programs
    .filter((item) => item.id !== program.id)
    .slice(0, 4)
    .map((item) => `<a href="${pagePath(item)}">${escapeHtml(item.title)}</a>`)
    .join("");

  const modules = program.modules.map((module, index) => `<article class="module-card">
            <span class="module-number">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <span class="tag">${escapeHtml(module.type)}</span>
              <h2>${escapeHtml(module.title)}</h2>
              <p>${escapeHtml(module.description)}</p>
              <a href="${escapeHtml(module.url)}"${/^https?:\/\//.test(module.url) ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>모듈 열기</a>
            </div>
          </article>`).join("\n");

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(program.eyebrow)}</span>
          <h1>${escapeHtml(program.title)}</h1>
          <p>${escapeHtml(program.dek)}</p>
          <div class="quick-nav">
            <a href="/programs/">전체 프로그램</a>
            ${otherPrograms}
          </div>
        </div>
        ${renderVideo(program.heroVideo)}
      </div>
    </section>
    <main>
      <div class="program-layout">
        <article class="module-stack">
          ${modules}
        </article>
        <aside class="side-stack" aria-label="프로그램 정보">
          <section class="side-card">
            <span class="tag">Program Info</span>
            <h2>${escapeHtml(program.style)}</h2>
            <div class="meta-row">
              <span>${escapeHtml(program.level)}</span>
              <span>${escapeHtml(program.duration)}</span>
            </div>
            <p>이 프로그램은 영상, 기사, 스타일 허브, 레이더를 한 경로로 묶은 편집형 학습 루틴입니다.</p>
          </section>
          <section class="side-card">
            <span class="tag">Keywords</span>
            <h2>검색 키워드</h2>
            <div class="tag-row">${program.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
          </section>
          <section class="side-card">
            <span class="tag">Related</span>
            <h2>이어 보기</h2>
            <div class="link-row">${renderLinks(program.related)}</div>
          </section>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${program.title} | 바차타 프로그램`,
    description: program.dek,
    canonical: pageUrl(program),
    jsonLd,
    body
  });
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  await writeFile(resolve(outDir, "index.html"), renderIndex(data), "utf8");
  for (const program of data.programs) {
    await writeFile(resolve(outDir, `${program.id}.html`), renderProgram(program, data), "utf8");
  }

  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    title: data.title,
    url: "/programs/",
    programs: data.programs.map((program) => ({
      id: program.id,
      title: program.title,
      url: pagePath(program),
      level: program.level,
      duration: program.duration,
      style: program.style,
      videoId: program.heroVideo?.id || null,
      keywords: program.keywords
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${data.programs.length + 1} program pages`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
