import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/profiles.json");
const outDir = resolve(root, "profiles");
const indexPath = resolve(root, "data/generated/profile-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const profilePath = (profile) => `/profiles/${profile.id}.html`;
const profileUrl = (profile) => `https://bachata.co.kr${profilePath(profile)}`;

const videoEmbedUrl = (video = {}) => {
  const start = video.start ? `?start=${encodeURIComponent(video.start)}` : "";
  return `https://www.youtube-nocookie.com/embed/${escapeHtml(video.id)}${start}`;
};

const videoWatchUrl = (video = {}) => {
  const start = video.start ? `&t=${encodeURIComponent(video.start)}s` : "";
  return `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}${start}`;
};

const renderVideo = (video) => {
  if (!video?.id) return `<div class="no-video"><span class="tag">Video Needed</span><p>검증 가능한 공개 영상 링크를 확인하면 이 자리에 임베드합니다.</p></div>`;
  return `<div class="video-frame">
            <iframe loading="lazy" src="${videoEmbedUrl(video)}" title="${escapeHtml(video.title || "Bachata profile video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
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
        --bg: #0c0b09;
        --ink: #fff7e8;
        --muted: rgba(255, 247, 232, 0.68);
        --line: rgba(255, 247, 232, 0.14);
        --panel: rgba(255, 247, 232, 0.06);
        --panel-strong: #17130f;
        --paper: #f3ede3;
        --paper-ink: #18130d;
        --gold: #e2ad58;
        --wine: #a72c4d;
        --green: #58a999;
        font-family: "Pretendard Variable", Pretendard, "Wanted Sans Variable", "Wanted Sans", "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(12, 11, 9, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 20px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(64px, 10vw, 126px) max(18px, calc((100vw - 1180px) / 2)) 46px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.78fr) minmax(320px, 0.46fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 900px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 98px); line-height: 0.95; overflow-wrap: anywhere; }
      .hero p { max-width: 760px; color: rgba(24, 19, 13, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .video-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #050505; }
      .hero .video-frame { border-color: rgba(24, 19, 13, 0.16); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22); }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .quick-nav, .link-row, .tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 26px; }
      .quick-nav a, .link-row a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .summary p, .profile-card p, .note-card p, .side-box p { color: var(--muted); line-height: 1.72; }
      .category-strip { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
      .category-strip a { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); font-size: 13px; font-weight: 900; }
      .profile-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .profile-card { display: grid; min-height: 330px; align-content: space-between; gap: 18px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .profile-card h2 { margin: 10px 0 8px; font-size: 30px; line-height: 1.04; }
      .profile-layout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 22px; align-items: start; }
      .main-stack, .side-stack { display: grid; gap: 16px; }
      .summary, .note-card, .side-box, .no-video { padding: clamp(20px, 4vw, 30px); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .summary { background: rgba(226, 173, 88, 0.08); }
      .note-card h2, .side-box h2 { margin: 8px 0 12px; font-size: clamp(28px, 4vw, 42px); line-height: 1.06; }
      .note-card ul { display: grid; gap: 8px; margin: 16px 0 0; padding-left: 20px; color: rgba(255, 247, 232, 0.76); line-height: 1.65; }
      .side-stack { position: sticky; top: 96px; }
      .tag-row span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.72); font-size: 12px; font-weight: 900; }
      .status { color: var(--green); font-size: 12px; font-weight: 950; letter-spacing: 0.1em; text-transform: uppercase; }
      @media (max-width: 980px) {
        .hero-grid, .section-head, .profile-layout { grid-template-columns: 1fr; }
        .profile-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .side-stack { position: static; }
      }
      @media (max-width: 700px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .profile-grid { grid-template-columns: 1fr; }
        .summary, .note-card, .side-box { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="프로필 허브 이동">
        <a href="/">홈</a>
        <a href="/profiles/">인물·팀</a>
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
    "@id": "https://bachata.co.kr/profiles/",
    "name": "바차타 인물·팀·장소 프로필 허브",
    "description": "글로벌 바차타 댄서, Bachata Influence 계열, 한국 바차타 팀과 장소를 영상과 출처 중심으로 정리하는 프로필 허브.",
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "hasPart": data.profiles.map((profile) => ({ "@id": profileUrl(profile), "name": profile.title }))
  };

  const cards = data.profiles.map((profile) => {
    const category = data.categories.find((item) => item.id === profile.category);
    return `<article class="profile-card" id="${escapeHtml(profile.category)}-${escapeHtml(profile.id)}">
          <div>
            <span class="tag">${escapeHtml(category?.label || profile.category)}</span>
            <h2>${escapeHtml(profile.title)}</h2>
            <p>${escapeHtml(profile.subtitle)}</p>
          </div>
          <div>
            <span class="status">${escapeHtml(profile.status)}</span>
            <div class="tag-row" style="margin-top:12px">${profile.tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <div class="link-row" style="margin-top:14px"><a href="${profilePath(profile)}">프로필 보기</a></div>
          </div>
        </article>`;
  }).join("\n");

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">People & Scene Profiles</span>
          <h1>바차타 인물·팀·장소를 영상으로 쌓는 허브</h1>
          <p>Melvin & Gatica, Emilien & Tehina, Gero & Migle, Luis & Andrea, Andi & Silvia부터 Gray & Loren, Cluny & Journey, 보니따, 에버라틴, 라틴씨엘로까지. 공개 영상과 출처 링크를 기준으로 프로필을 누적합니다.</p>
          <div class="quick-nav">
            ${data.categories.map((category) => `<a href="#${escapeHtml(category.id)}">${escapeHtml(category.title)}</a>`).join("")}
          </div>
        </div>
        ${renderVideo(data.profiles[0].heroVideo)}
      </div>
    </section>
    <main>
      <section>
        <div class="section-head">
          <div>
            <span class="eyebrow">Directory</span>
            <h2>편집 대기열에서 프로필로 승격한 항목</h2>
          </div>
          <p>복제한 홍보문이 아니라, 영상·공식 링크·인스타 신호를 보존하고 한국 독자가 볼 포인트를 붙이는 방식입니다.</p>
        </div>
        <div class="category-strip">
          ${data.categories.map((category) => `<a id="${escapeHtml(category.id)}" href="#${escapeHtml(category.id)}-${escapeHtml(data.profiles.find((profile) => profile.category === category.id)?.id || "")}">${escapeHtml(category.title)}</a>`).join("")}
        </div>
        <div class="profile-grid">
          ${cards}
        </div>
      </section>
    </main>`;

  return layout({
    title: "바차타 인물·팀·장소 프로필 허브 | Bachata Korea",
    description: "글로벌 바차타 댄서, Bachata Influence 계열, 한국 바차타 팀과 장소를 영상과 출처 중심으로 정리하는 프로필 허브.",
    canonical: "https://bachata.co.kr/profiles/",
    jsonLd,
    body
  });
};

const renderProfile = (data, profile) => {
  const category = data.categories.find((item) => item.id === profile.category);
  const siblings = data.profiles
    .filter((item) => item.category === profile.category && item.id !== profile.id)
    .slice(0, 5)
    .map((item) => `<a href="${profilePath(item)}">${escapeHtml(item.title)}</a>`)
    .join("");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": profile.category === "venues" ? "Place" : "ProfilePage",
    "@id": profileUrl(profile),
    "name": profile.title,
    "description": profile.subtitle,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/profiles/" },
    "mainEntityOfPage": profileUrl(profile),
    ...(profile.heroVideo?.id ? {
      "video": {
        "@type": "VideoObject",
        "name": profile.heroVideo.title,
        "embedUrl": videoEmbedUrl(profile.heroVideo),
        "url": videoWatchUrl(profile.heroVideo)
      }
    } : {})
  };

  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${escapeHtml(category?.title || profile.category)}</span>
          <h1>${escapeHtml(profile.title)}</h1>
          <p>${escapeHtml(profile.subtitle)}</p>
          <div class="quick-nav">
            <a href="/profiles/">전체 프로필</a>
            <a href="/profiles/#${escapeHtml(profile.category)}">${escapeHtml(category?.label || profile.category)}</a>
            ${profile.related?.slice(0, 2).map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join("") || ""}
          </div>
        </div>
        ${renderVideo(profile.heroVideo)}
      </div>
    </section>
    <main>
      <div class="profile-layout">
        <article class="main-stack">
          <section class="summary">
            ${profile.summary.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n            ")}
          </section>
          <section class="note-card">
            <span class="tag">Editorial Angles</span>
            <h2>이 프로필에서 볼 포인트</h2>
            <ul>${profile.angles.map((angle) => `<li>${escapeHtml(angle)}</li>`).join("")}</ul>
          </section>
          <section class="note-card">
            <span class="tag">Video Note</span>
            <h2>영상 임베드 기준</h2>
            <p>공개 YouTube 링크를 oEmbed 기준으로 확인한 뒤 임베드합니다. 인스타그램 사진과 캡션은 무단 복제하지 않고 원본 링크만 보존합니다.</p>
          </section>
        </article>
        <aside class="side-stack" aria-label="프로필 출처와 관련 링크">
          <section class="side-box">
            <span class="tag">Profile</span>
            <h2>${escapeHtml(profile.location)}</h2>
            <span class="status">${escapeHtml(profile.status)}</span>
            <div class="tag-row" style="margin-top:14px">${profile.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          </section>
          <section class="side-box">
            <span class="tag">Sources</span>
            <h2>출처</h2>
            <div class="link-row">${renderLinks(profile.sourceLinks)}</div>
          </section>
          <section class="side-box">
            <span class="tag">Related</span>
            <h2>이어 보기</h2>
            <div class="link-row">${renderLinks(profile.related)}${siblings}</div>
          </section>
        </aside>
      </div>
    </main>`;

  return layout({
    title: `${profile.title} | 바차타 프로필 허브`,
    description: `${profile.title}: ${profile.subtitle}`,
    canonical: profileUrl(profile),
    jsonLd,
    body
  });
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });

  await writeFile(resolve(outDir, "index.html"), renderIndex(data), "utf8");
  for (const profile of data.profiles) {
    await writeFile(resolve(outDir, `${profile.id}.html`), renderProfile(data, profile), "utf8");
  }

  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    categories: data.categories,
    profiles: data.profiles.map((profile) => ({
      id: profile.id,
      category: profile.category,
      title: profile.title,
      url: profilePath(profile),
      status: profile.status,
      heroVideo: profile.heroVideo?.id || null,
      tags: profile.tags
    }))
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${data.profiles.length + 1} profile pages`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
