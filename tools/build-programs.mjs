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
  return `https://www.youtube.com/embed/${encodeURIComponent(video.id)}${start}`;
};

const videoWatchUrl = (video = {}) => {
  const start = video.start ? `&t=${encodeURIComponent(video.start)}s` : "";
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}${start}`;
};

const parseStartSeconds = (value) => {
  if (!value) return undefined;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Number(text);
  const match = text.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (!match) return undefined;
  const seconds = (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
  return seconds || undefined;
};

const videoFromUrl = (url, title) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      return id ? { id, start: parseStartSeconds(parsed.searchParams.get("t")), title } : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? { id, start: parseStartSeconds(parsed.searchParams.get("t")), title } : null;
    }
  } catch {
    return null;
  }
  return null;
};

const moduleVideo = (module) => {
  if (module.video?.id) return module.video;
  if (/^video$/i.test(module.type || "")) return videoFromUrl(module.url, module.title);
  return null;
};

const renderVideo = (video, className = "video-frame") => {
  if (!video?.id) return "";
  return `<div class="${className}">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || "Bachata program video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>`;
};

const youtubeThumb = (videoId) => videoId
  ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
  : "";

const renderVideoLoader = (video) => {
  if (!video?.id) return "";
  const title = escapeHtml(video.title || "Bachata program video");
  return `<div class="video-loader" data-embed="${escapeHtml(videoEmbedUrl(video))}" data-title="${title}">
            <button type="button" data-video-button aria-label="${title} 영상 열기">
              <img loading="lazy" src="${escapeHtml(youtubeThumb(video.id))}" alt="">
              <span>Play</span>
            </button>
            <a class="youtube-link" href="${escapeHtml(videoWatchUrl(video))}" target="_blank" rel="noreferrer">YouTube</a>
          </div>`;
};

const renderLinks = (links = []) => links.map((link) => {
  const external = /^https?:\/\//.test(link.url);
  return `<a href="${escapeHtml(link.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
}).join("");

const renderParagraphs = (paragraphs = [], fallback = "") => {
  const body = paragraphs.length ? paragraphs : [fallback].filter(Boolean);
  return body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
};

const modulePracticePrompt = (program, module) => {
  const type = String(module.type || "").toLowerCase();
  if (type === "video") {
    return `영상을 본 뒤에는 바로 다음 동작으로 넘어가지 말고, 같은 구간을 한 번 더 돌려보며 ${program.style}에서 가장 중요한 박자와 거리감을 확인해보세요. 눈으로 이해한 동작을 몸으로 옮길 때는 속도를 절반으로 줄이고, 한 곡 전체가 아니라 30초 정도의 짧은 구간만 반복하는 편이 좋습니다.`;
  }
  if (type === "article" || type === "source") {
    return `글을 읽은 뒤에는 마음에 남는 문장 하나를 실제 영상과 다시 연결해보세요. 개념을 많이 아는 것보다 지금 내 춤에서 바로 고칠 수 있는 기준 하나를 가져가는 편이 오래 남습니다. 이 모듈은 정보를 모으는 단계가 아니라, 다음 소셜이나 연습에서 무엇을 덜어낼지 정하는 단계로 읽으면 좋습니다.`;
  }
  if (type === "style") {
    return `세부장르 가이드는 정답표처럼 외우기보다 비교표처럼 읽는 편이 좋습니다. 같은 음악을 모던, 센슈얼, 도미니칸, Bachazouk가 어떻게 다르게 해석하는지 보면서 내 몸에 맞는 속도와 범위를 찾으세요. 처음에는 멋진 동작보다 안전하게 반복할 수 있는 작은 감각 하나를 남기는 것이 충분합니다.`;
  }
  if (type === "profile") {
    return `프로필을 읽을 때는 이름을 저장하는 데서 끝내지 말고, 그 댄서나 팀이 어떤 음악을 자주 쓰고 어떤 방식으로 파트너와 연결하는지 같이 보세요. 인물 정보는 영상으로 다시 확인될 때 가장 쓸모가 커집니다. 좋아 보이는 장면 하나를 고른 뒤, 그 장면이 소셜에서도 가능한 크기인지까지 생각해보면 더 정확하게 배울 수 있습니다.`;
  }
  return `이 모듈은 읽고 끝내기보다 실제 행동으로 이어질 때 의미가 생깁니다. 일정, 장소, 커뮤니티 글, 영상 링크를 확인한 뒤 지금 나에게 필요한 다음 한 가지를 정해보세요. 수업을 찾아볼지, 소셜을 한 번 방문할지, 관련 영상을 더 볼지 결정하면 흩어진 정보가 하나의 동선으로 바뀝니다.`;
};

const moduleActionLabel = (module) => moduleVideo(module) ? "YouTube에서 크게 보기" : "관련 페이지 보기";

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
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .hero .video-frame { border-color: rgba(26, 21, 16, 0.18); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22); }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
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
      .module-card { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 20px; align-items: start; }
      .module-number { display: inline-grid; place-items: center; width: 52px; height: 52px; border: 1px solid rgba(226, 173, 88, 0.42); border-radius: 50%; color: var(--gold); font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; font-weight: 900; }
      .module-card h2 { margin: 6px 0 10px; font-size: clamp(26px, 4vw, 38px); line-height: 1.06; }
      .module-copy { display: grid; gap: 12px; margin-top: 16px; }
      .module-copy p { margin: 0; font-size: 16px; line-height: 1.84; }
      .module-video { margin-top: 18px; }
      .module-video .video-frame { border-color: rgba(255, 247, 232, 0.2); }
      .module-card a { display: inline-flex; margin-top: 12px; color: var(--gold); font-weight: 900; }
      .watch-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .watch-card { overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-strong); }
      .watch-card-body { padding: 18px; }
      .watch-card h3 { margin: 8px 0 10px; font-size: 24px; line-height: 1.08; }
      .watch-card p { margin: 0; color: var(--muted); line-height: 1.65; }
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
        .program-grid, .module-card, .watch-grid { grid-template-columns: 1fr; }
        .program-card, .module-card, .side-card { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="프로그램 이동">
        <a href="/">홈</a>
        <a href="/programs/">초보자 가이드</a>
        <a href="/styles/">세부장르</a>
        <a href="/articles/">기사</a>
        <a href="/korea-scene/">국내 소식</a>
        <a href="/briefs/">최신소식</a>
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
        iframe.title = loader.dataset.title || "Bachata program video";
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
            ${renderVideoLoader(program.heroVideo)}
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
          <span class="eyebrow">영상 루틴</span>
          <h1>바차타, 영상 하나로 끝내지 않기</h1>
          <p>${escapeHtml(data.dek)}</p>
          <div class="quick-nav">
            ${data.programs.map((program) => `<a href="${pagePath(program)}">${escapeHtml(program.title)}</a>`).join("")}
          </div>
        </div>
        <aside class="method-card">
          <span class="tag">보는 순서</span>
          <ul>${data.method.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </aside>
      </div>
    </section>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">학습 경로</span>
            <h2>짧게 보고, 길게 읽고, 바로 연습합니다</h2>
          </div>
          <p>각 프로그램은 영상, 칼럼 본문, 관련 가이드, 프로필을 한 흐름으로 묶었습니다. 영상만 던져두지 않고 왜 봐야 하는지, 무엇을 조심해야 하는지, 다음에는 어디로 넘어가야 하는지까지 읽히게 구성합니다.</p>
        </div>
        <div class="program-grid">
          ${data.programs.map(renderProgramCard).join("\n")}
        </div>
      </section>
      <section class="section paper-cta">
        <span class="tag">연결해서 보기</span>
        <h2>기본기는 오래 보고, 소식은 빠르게 따라갑니다</h2>
        <p>센슈얼 16개 펀더멘털, 도미니칸 리듬, Bachazouk 안전 기준처럼 오래 남는 가이드는 천천히 읽을 수 있게 두고, 국내 소셜과 행사 소식은 최신소식과 커뮤니티에서 이어집니다.</p>
        <div class="link-row">
          <a href="/korea-scene/">국내 소식</a>
          <a href="/briefs/">최신소식</a>
          <a href="/events/">행사 일정</a>
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
  const videos = [program.heroVideo, ...(program.watchlist || []).map((item) => ({
    id: item.videoId,
    start: item.start,
    title: item.title
  }))].filter((video) => video?.id);
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
    "video": videos.map((video) => ({
      "@type": "VideoObject",
      "name": video.title,
      "embedUrl": videoEmbedUrl(video),
      "url": videoWatchUrl(video)
    }))
  };

  const otherPrograms = data.programs
    .filter((item) => item.id !== program.id)
    .slice(0, 4)
    .map((item) => `<a href="${pagePath(item)}">${escapeHtml(item.title)}</a>`)
    .join("");

  const modules = program.modules.map((module, index) => {
    const video = moduleVideo(module);
    const external = /^https?:\/\//.test(module.url);
    return `<article class="module-card${video ? " module-card-video" : ""}">
            <span class="module-number">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <span class="tag">${escapeHtml(module.type)}</span>
              <h2>${escapeHtml(module.title)}</h2>
              <p>${escapeHtml(module.description)}</p>
              <div class="module-copy">
                ${renderParagraphs(module.body, module.description)}
                <p>${escapeHtml(modulePracticePrompt(program, module))}</p>
              </div>${video ? `\n              <div class="module-video">${renderVideo(video)}</div>` : ""}
              <a href="${escapeHtml(module.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${moduleActionLabel(module)}</a>
            </div>
          </article>`;
  }).join("\n");

  const watchlist = program.watchlist?.length ? `<section class="side-card">
            <span class="tag">추천 영상</span>
            <h2>함께 볼 영상</h2>
            <p>본문에서 다룬 감각을 다른 영상으로 한 번 더 확인합니다. 보조 영상은 썸네일을 누를 때만 불러와 페이지를 가볍게 유지합니다.</p>
            <div class="watch-grid">
              ${program.watchlist.map((item) => `<article class="watch-card">
                ${renderVideoLoader({ id: item.videoId, start: item.start, title: item.title })}
                <div class="watch-card-body">
                  <span class="tag">${escapeHtml(item.label)}</span>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.note)}</p>
                </div>
              </article>`).join("\n              ")}
            </div>
          </section>` : "";

  const sources = program.sourceLinks?.length ? `<section class="side-card">
            <span class="tag">참고 링크</span>
            <h2>출처</h2>
            <div class="link-row">${renderLinks(program.sourceLinks)}</div>
          </section>` : "";

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(program.eyebrow)}</span>
          <h1>${escapeHtml(program.title)}</h1>
          <p>${escapeHtml(program.dek)}</p>
          <div class="quick-nav">
            <a href="/programs/">전체 가이드</a>
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
          ${watchlist}
        </article>
        <aside class="side-stack" aria-label="프로그램 정보">
          <section class="side-card">
            <span class="tag">가이드 정보</span>
            <h2>${escapeHtml(program.style)}</h2>
            <div class="meta-row">
              <span>${escapeHtml(program.level)}</span>
              <span>${escapeHtml(program.duration)}</span>
            </div>
            <p>이 가이드는 영상, 기사, 세부장르 해설, 관련 소식을 한 흐름으로 묶은 학습 루틴입니다.</p>
          </section>
          <section class="side-card">
            <span class="tag">Keywords</span>
            <h2>관련 검색어</h2>
            <div class="tag-row">${program.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
          </section>
          <section class="side-card">
            <span class="tag">관련 글</span>
            <h2>같이 보기</h2>
            <div class="link-row">${renderLinks(program.related)}</div>
          </section>
          ${sources}
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
