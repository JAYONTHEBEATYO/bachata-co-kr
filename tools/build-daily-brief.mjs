import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const signalsPath = resolve(root, "data/generated/scene-signals.json");
const latestPath = resolve(root, "data/generated/latest-brief.json");
const briefsDir = resolve(root, "briefs");
const sitemapPath = resolve(root, "sitemap.xml");

const topicNotes = {
  "bachata-influence": {
    dek: "Melvin & Gatica 계열의 흐름은 동작 수보다 감정선, 멈춤, 프레임의 질감을 보는 편이 좋습니다.",
    questions: [
      "한국 수업에서 Influence를 센슈얼과 어떻게 구분해 설명하는가?",
      "소셜에서 재현 가능한 요소와 공연형 요소는 어디서 갈리는가?"
    ]
  },
  "bachazouk": {
    dek: "Bachazouk는 단순한 유행어가 아니라 bachata와 Brazilian Zouk를 동시에 존중해야 하는 별도 문법으로 봅니다.",
    questions: [
      "헤드무브와 틸트 턴은 어떤 속도와 음악에서 안전한가?",
      "zouk 요소를 넣어도 bachata 음악성과 풋워크가 남아 있는가?"
    ]
  },
  "global-dancers": {
    dek: "글로벌 페어는 최신 영상만 보는 것보다 반복되는 입구, 출구, 시그니처를 누적해서 읽어야 합니다.",
    questions: [
      "Gero & Migle, Luis & Andrea, Andi & Silvia의 차이는 패턴보다 어떤 에너지에서 드러나는가?",
      "한국 소셜에서 따라 하기 좋은 요소와 무대에 남겨야 할 요소는 무엇인가?"
    ]
  },
  "korea-scene": {
    dek: "한국 씬은 인스타와 유튜브에 신호가 흩어져 있어 장소, 팀, 강사, 동호회를 함께 묶어 보는 편집이 필요합니다.",
    questions: [
      "그레이 & 로렌, 클루니, 보니따, 에버라틴 영상은 어떤 초보자 정보를 제공하는가?",
      "장소별 음악 비율, 촬영 분위기, 초보 환영도를 어떻게 기록할 것인가?"
    ]
  },
  "gear-market": {
    dek: "댄스화 콘텐츠는 브랜드 홍보문보다 회전감, 쿠션, 바닥 적응, 사이즈, 배송·반품 경험을 분리해야 검색 가치가 생깁니다.",
    questions: [
      "Fuego, Pana Mio, On1, Pulse는 어떤 바닥과 춤 스타일에 맞는가?",
      "한국 구매자에게 사이즈와 반품 리스크를 어떻게 알려줄 것인가?"
    ]
  }
};

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

const renderCandidate = (candidate) => {
  const title = escapeHtml(candidate.title || "Untitled source");
  const sourceUrl = escapeHtml(candidate.sourceUrl || "#");
  const type = escapeHtml(candidate.type || "source");
  const score = Number.isFinite(candidate.score) ? candidate.score : 0;
  const embed = candidate.embedUrl
    ? `<div class="video-frame"><iframe loading="lazy" src="${escapeHtml(candidate.embedUrl)}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    : "";

  return `
              <article class="candidate">
                ${embed}
                <div class="candidate-body">
                  <span class="tag">${type} · score ${score}</span>
                  <h3>${title}</h3>
                  <a href="${sourceUrl}" target="_blank" rel="noreferrer">원본 확인</a>
                </div>
              </article>`;
};

const renderTopic = (topic) => {
  const note = topicNotes[topic.id] || {
    dek: "오늘 수집된 후보를 편집자가 확인해 기사, 인터뷰, 캘린더, 상품 노트 중 알맞은 형식으로 발행합니다.",
    questions: ["이 후보가 한국 바차타 독자에게 왜 필요한가?", "출처와 영상은 오래 유지될 가능성이 있는가?"]
  };

  const candidates = topic.candidates.slice(0, 3).map(renderCandidate).join("\n");
  const questions = note.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("");

  return `
          <section class="topic" id="${escapeHtml(topic.id)}">
            <div class="topic-head">
              <span class="eyebrow">${escapeHtml(topic.label)}</span>
              <h2>${escapeHtml(topic.label)} 오늘의 관찰</h2>
              <p>${escapeHtml(note.dek)}</p>
            </div>
            <div class="candidate-grid">
              ${candidates || "<p>오늘은 검증된 후보가 없습니다.</p>"}
            </div>
            <div class="questions">
              <strong>다음 취재 질문</strong>
              <ul>${questions}</ul>
            </div>
          </section>`;
};

const renderBriefHtml = (signals) => {
  const dateText = signals.generationDate;
  const title = `${formatDateKo(dateText)} 바차타 씬 브리프`;
  const sourceCount = signals.topics.reduce((sum, topic) => sum + topic.candidateCount, 0);
  const topicLinks = signals.topics.map((topic) => `<a href="#${escapeHtml(topic.id)}">${escapeHtml(topic.label)}</a>`).join("");
  const topics = signals.topics.map(renderTopic).join("\n");
  const generatedAt = new Date(signals.generatedAt).toISOString();
  const apiMode = [
    signals.mode.youtubeApi ? "YouTube API on" : "seed YouTube only",
    signals.mode.naverApi ? "Naver API on" : "Naver API off",
    signals.mode.instagramGraph ? "Instagram Graph on" : "Instagram Graph off"
  ].join(" · ");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(title)} | 바차타 코리아</title>
    <meta name="description" content="${escapeHtml(title)}. Bachata Influence, Bachazouk, 글로벌 댄서, 한국 소셜, 바차타 댄스화 후보를 영상과 출처 중심으로 정리한 일간 브리프.">
    <meta name="robots" content="index,follow,max-video-preview:-1,max-snippet:-1,max-image-preview:large">
    <link rel="canonical" href="https://bachata.co.kr/briefs/${dateText}.html">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css">
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b0a08;
        --panel: #17130f;
        --ink: #fff7e8;
        --muted: rgba(255, 247, 232, 0.68);
        --line: rgba(255, 247, 232, 0.14);
        --gold: #e2ad58;
        --teal: #1d7972;
        font-family: "SUIT Variable", SUIT, Pretendard, "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(11, 10, 8, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; }
      .brand span { color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 22px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(64px, 11vw, 128px) max(18px, calc((100vw - 1180px) / 2)) 54px; background: #f3ede3; color: #17120b; }
      .eyebrow, .tag { color: #9d2447; font-size: 12px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; }
      .hero h1, h2, h3 { font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; letter-spacing: 0; }
      .hero h1 { max-width: 920px; margin: 12px 0 18px; font-size: clamp(48px, 9vw, 104px); line-height: 0.95; word-break: keep-all; overflow-wrap: anywhere; }
      .hero p { max-width: 760px; color: rgba(23, 18, 11, 0.72); font-size: clamp(17px, 2vw, 21px); line-height: 1.72; }
      .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
      .meta span, .topic-nav a { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border: 1px solid rgba(23, 18, 11, 0.14); border-radius: 999px; font-size: 13px; font-weight: 900; }
      main { padding: 54px max(18px, calc((100vw - 1180px) / 2)) 90px; }
      .topic-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
      .topic { padding: clamp(28px, 5vw, 52px) 0; border-top: 1px solid var(--line); }
      .topic-head { display: grid; grid-template-columns: minmax(0, 0.75fr) minmax(0, 1fr); gap: 24px; align-items: end; margin-bottom: 20px; }
      .topic-head h2 { margin: 8px 0 0; font-size: clamp(32px, 5vw, 60px); line-height: 1.02; }
      .topic-head p { margin: 0; color: var(--muted); line-height: 1.75; }
      .candidate-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .candidate { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--panel); }
      .video-frame { position: relative; aspect-ratio: 16 / 9; background: #030303; }
      .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .candidate-body { padding: 18px; }
      .candidate h3 { margin: 10px 0 14px; font-size: 21px; line-height: 1.18; }
      .candidate a { color: var(--gold); font-size: 13px; font-weight: 900; }
      .questions { margin-top: 14px; padding: 18px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 247, 232, 0.05); }
      .questions strong { color: var(--gold); }
      .questions ul { display: grid; gap: 8px; margin: 12px 0 0; padding-left: 18px; color: var(--muted); line-height: 1.65; }
      .footer { padding: 34px max(18px, calc((100vw - 1180px) / 2)); border-top: 1px solid var(--line); color: var(--muted); }
      @media (max-width: 820px) {
        .nav-links { display: none; }
        .topic-head, .candidate-grid { grid-template-columns: 1fr; }
        .hero h1 { font-size: clamp(44px, 14vw, 64px); }
      }
    </style>
    <script type="application/ld+json">
      ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `https://bachata.co.kr/briefs/${dateText}.html`,
        "headline": title,
        "datePublished": `${dateText}T00:00:00+09:00`,
        "dateModified": generatedAt,
        "inLanguage": "ko-KR",
        "isPartOf": { "@id": "https://bachata.co.kr/#website" },
        "about": signals.topics.map((topic) => topic.label),
        "mainEntityOfPage": `https://bachata.co.kr/briefs/${dateText}.html`
      }, null, 6)}
    </script>
  </head>
  <body>
    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="브리프 이동">
        <a href="/">홈</a>
        <a href="/#trend-desk">트렌드</a>
        <a href="/#publishing-os">발행 시스템</a>
        <a href="/briefs/">브리프 목록</a>
      </nav>
    </header>
    <section class="hero">
      <span class="eyebrow">Daily Scene Brief</span>
      <h1>${escapeHtml(title)}</h1>
      <p>오늘의 바차타 후보 ${sourceCount}개를 영상과 출처 중심으로 정리했습니다. 이 페이지는 자동 생성되지만, 원문을 복제하지 않고 어떤 방향으로 기사화할지 편집 질문을 남기는 방식으로 운영합니다.</p>
      <div class="meta">
        <span>${escapeHtml(apiMode)}</span>
        <span>generated ${escapeHtml(generatedAt)}</span>
        <span>${sourceCount} candidates</span>
      </div>
    </section>
    <main>
      <div class="topic-nav">${topicLinks}</div>
      ${topics}
    </main>
    <footer class="footer">
      <p>Source map: <a href="/data/sources.json">data/sources.json</a> · Generated data: <a href="/data/generated/scene-signals.json">scene-signals.json</a></p>
    </footer>
  </body>
</html>
`;
};

const renderBriefIndex = async (signals) => {
  let files = [];
  try {
    files = (await readdir(briefsDir)).filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name)).sort().reverse();
  } catch {
    files = [];
  }

  const latest = `${signals.generationDate}.html`;
  if (!files.includes(latest)) files.unshift(latest);

  const items = files.map((file) => {
    const dateText = file.replace(".html", "");
    return `<li><a href="/briefs/${file}">${formatDateKo(dateText)} 바차타 씬 브리프</a></li>`;
  }).join("\n");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>바차타 씬 브리프 | 바차타 코리아</title>
    <meta name="description" content="Bachata Influence, Bachazouk, 글로벌 댄서, 한국 소셜, 댄스화 신호를 모아 정리하는 바차타 코리아 일간 브리프 목록.">
    <link rel="canonical" href="https://bachata.co.kr/briefs/">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css">
    <style>
      body { margin: 0; background: #0b0a08; color: #fff7e8; font-family: "SUIT Variable", SUIT, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(880px, calc(100% - 36px)); margin: 0 auto; padding: 72px 0; }
      a { color: inherit; text-decoration: none; }
      .back { color: #e2ad58; font-weight: 800; }
      h1 { margin: 24px 0; font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; font-size: clamp(42px, 8vw, 78px); line-height: 0.98; letter-spacing: 0; }
      p { color: rgba(255, 247, 232, 0.68); line-height: 1.7; }
      ul { display: grid; gap: 12px; padding: 0; list-style: none; margin-top: 28px; }
      li a { display: block; padding: 18px; border: 1px solid rgba(255, 247, 232, 0.14); border-radius: 8px; background: rgba(255, 247, 232, 0.06); font-weight: 850; }
    </style>
  </head>
  <body>
    <main>
      <a class="back" href="/">← 바차타 코리아 홈</a>
      <h1>바차타 씬 브리프</h1>
      <p>자동 수집 후보를 편집 질문과 함께 정리하는 일간 브리프입니다. API 키가 연결될수록 YouTube, Naver, Instagram Graph 신호가 더 풍부해집니다.</p>
      <ul>${items}</ul>
    </main>
  </body>
</html>
`;
};

const updateSitemap = async (dateText) => {
  let briefFiles = [];
  try {
    briefFiles = (await readdir(briefsDir)).filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name)).sort().reverse();
  } catch {
    briefFiles = [];
  }
  if (!briefFiles.includes(`${dateText}.html`)) briefFiles.unshift(`${dateText}.html`);

  const briefUrls = briefFiles.map((file) => {
    const day = file.replace(".html", "");
    return `  <url>
    <loc>https://bachata.co.kr/briefs/${file}</loc>
    <lastmod>${day}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bachata.co.kr/</loc>
    <lastmod>${dateText}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bachata.co.kr/briefs/</loc>
    <lastmod>${dateText}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
${briefUrls}
  <url>
    <loc>http://test.bachata.co.kr/</loc>
    <lastmod>2026-06-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
`;

  await writeFile(sitemapPath, sitemap, "utf8");
};

const main = async () => {
  const signals = await readJson(signalsPath);
  const dateText = signals.generationDate;
  const briefPath = resolve(briefsDir, `${dateText}.html`);

  await mkdir(briefsDir, { recursive: true });
  await writeFile(briefPath, renderBriefHtml(signals), "utf8");
  await writeFile(resolve(briefsDir, "index.html"), await renderBriefIndex(signals), "utf8");
  await writeFile(latestPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    generationDate: dateText,
    url: `/briefs/${dateText}.html`,
    topicCount: signals.topics.length,
    candidateCount: signals.topics.reduce((sum, topic) => sum + topic.candidateCount, 0)
  }, null, 2)}\n`, "utf8");
  await updateSitemap(dateText);

  console.log(`Wrote ${briefPath}`);
  console.log(`Wrote ${resolve(briefsDir, "index.html")}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
