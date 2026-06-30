import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "health");
const outputPath = resolve(root, "data/generated/source-health.json");

const dataFiles = [
  "data/sources.json",
  "data/social-radar.json",
  "data/social-intake.json",
  "data/korea-scene.json",
  "data/editorial-desk.json",
  "data/programs.json",
  "data/style-guides.json",
  "data/profiles.json",
  "data/articles.json",
  "data/board.json",
  "data/events.json",
  "data/gear.json",
  "data/submissions.json"
];

const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const getYoutubeId = (url = "") => {
  const patterns = [
    /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{6,})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return "";
};

const add = (items, item) => {
  if (!item.url && !item.videoId) return;
  const key = `${item.type}:${item.url || item.videoId}`;
  const existing = items.get(key);
  if (existing) {
    existing.sources.push(...item.sources);
    return;
  }
  items.set(key, item);
};

const collectFromValue = (items, value, sourceFile, trail = []) => {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) {
      const videoId = getYoutubeId(value);
      if (videoId) {
        add(items, {
          type: "youtube",
          videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          label: value,
          sources: [{ file: sourceFile, path: trail.join(".") }]
        });
      } else {
        add(items, {
          type: "external",
          url: value,
          label: value,
          sources: [{ file: sourceFile, path: trail.join(".") }]
        });
      }
      return;
    }
    if (value.startsWith("/") && !value.startsWith("//")) {
      add(items, {
        type: "internal",
        url: value,
        label: value,
        sources: [{ file: sourceFile, path: trail.join(".") }]
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFromValue(items, item, sourceFile, [...trail, String(index)]));
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const key of ["heroVideo", "video"]) {
    if (value[key]?.id) {
      add(items, {
        type: "youtube",
        videoId: value[key].id,
        url: `https://www.youtube.com/watch?v=${value[key].id}`,
        label: value[key].title || value.title || value[key].id,
        sources: [{ file: sourceFile, path: [...trail, key, "id"].join(".") }]
      });
    }
  }

  if (value.videoId && typeof value.videoId === "string") {
    add(items, {
      type: "youtube",
      videoId: value.videoId,
      url: `https://www.youtube.com/watch?v=${value.videoId}`,
      label: value.title || value.videoId,
      sources: [{ file: sourceFile, path: [...trail, "videoId"].join(".") }]
    });
  }

  for (const [key, child] of Object.entries(value)) {
    collectFromValue(items, child, sourceFile, [...trail, key]);
  }
};

const localFileForPath = (url) => {
  const parsed = new URL(url, "https://bachata.co.kr");
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  if (!extname(pathname)) pathname += "/index.html";
  return resolve(root, ...pathname.split("/").filter(Boolean));
};

const validateInternal = async (item) => {
  try {
    await access(localFileForPath(item.url));
    return { ...item, status: "ok", httpStatus: 200, note: "local file exists" };
  } catch {
    return { ...item, status: "broken", httpStatus: 404, note: "local file missing" };
  }
};

const validateYoutube = async (item) => {
  const oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(item.url)}`;
  try {
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      return { ...item, status: "broken", httpStatus: response.status, note: "YouTube oEmbed rejected this video" };
    }
    const data = await response.json();
    return { ...item, status: "ok", httpStatus: response.status, title: data.title || item.label, note: "YouTube oEmbed ok" };
  } catch (error) {
    return { ...item, status: "warn", httpStatus: null, note: `YouTube check timed out or failed: ${error.message}` };
  }
};

const validateExternal = async (item) => {
  const host = new URL(item.url).hostname;
  if (host.includes("instagram.com")) {
    return { ...item, status: "watch", httpStatus: null, note: "Instagram public pages can be access-limited; verify through Graph API or manual review" };
  }

  try {
    let response = await fetch(item.url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
    if ([403, 405].includes(response.status)) {
      response = await fetch(item.url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000) });
    }
    const status = response.status >= 200 && response.status < 400
      ? "ok"
      : response.status === 401 || response.status === 403
        ? "watch"
        : "broken";
    return { ...item, status, httpStatus: response.status, note: status === "ok" ? "external URL reachable" : "external URL needs manual review" };
  } catch (error) {
    return { ...item, status: "warn", httpStatus: null, note: `external check timed out or failed: ${error.message}` };
  }
};

const validateItem = async (item) => {
  if (item.type === "internal") return validateInternal(item);
  if (item.type === "youtube") return validateYoutube(item);
  return validateExternal(item);
};

const statusRank = { broken: 0, warn: 1, watch: 2, ok: 3 };

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
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .summary-grid, .result-grid { display: grid; gap: 14px; }
      .summary-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .summary-card, .result-card, .policy-card { padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .summary-card strong { display: block; margin-top: 8px; font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; font-size: clamp(28px, 5vw, 48px); line-height: 1; }
      .section { margin-top: clamp(42px, 7vw, 76px); }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .result-card p, .policy-card p { color: var(--muted); line-height: 1.72; }
      .result-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .result-card { display: grid; gap: 12px; align-content: start; }
      .result-card h3 { margin: 4px 0; font-size: 24px; line-height: 1.12; overflow-wrap: anywhere; }
      .meta-row, .link-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .meta-row span, .link-row a { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.76); font-size: 12px; font-weight: 900; }
      .status-ok { color: var(--green) !important; }
      .status-watch { color: var(--gold) !important; }
      .status-warn, .status-broken { color: #ff8aa3 !important; }
      .policy-card { background: var(--paper); color: var(--paper-ink); }
      .policy-card p { color: rgba(26, 21, 16, 0.72); }
      @media (max-width: 1020px) {
        .hero-grid, .section-head { grid-template-columns: 1fr; }
        .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      @media (max-width: 760px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .summary-grid, .result-grid { grid-template-columns: 1fr; }
      }
    </style>`;

const renderResultCard = (item) => {
  const visibleTitle = item.title || item.label || item.url || item.videoId;
  const sourceSummary = item.sources.slice(0, 3).map((source) => `${source.file}${source.path ? `:${source.path}` : ""}`).join(", ");
  const metaItems = [
    item.httpStatus ? `<span>HTTP ${escapeHtml(item.httpStatus)}</span>` : "",
    item.videoId ? `<span>YouTube ${escapeHtml(item.videoId)}</span>` : "",
    `<span>${item.sources.length} references</span>`
  ].filter(Boolean).join("");
  const sourceLink = item.url ? `<div class="link-row"><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">source</a></div>` : "";
  return `<article class="result-card">
          <span class="tag status-${escapeHtml(item.status)}">${escapeHtml(item.status)} · ${escapeHtml(item.type)}</span>
          <h3>${escapeHtml(visibleTitle)}</h3>
          <p>${escapeHtml(item.note || "")}</p>
          <div class="meta-row">${metaItems}</div>
          <p>${escapeHtml(sourceSummary)}</p>
          ${sourceLink}
        </article>`;
};

const renderPage = (report) => {
  const groups = ["broken", "warn", "watch", "ok"].map((status) => ({
    status,
    items: report.results.filter((item) => item.status === status)
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": "https://bachata.co.kr/health/",
    "name": "Bachata Korea Source Health",
    "description": "Daily internal link, external source, and YouTube embed validation report.",
    "dateModified": report.generatedAt,
    "isPartOf": { "@id": "https://bachata.co.kr/#website" }
  };

  return `<!doctype html>
<html lang="ko">
  <head>
${head({
  title: "소스 헬스 | Bachata Korea",
  description: "bachata.co.kr의 내부 링크, 외부 출처, YouTube 임베드 유효성을 매일 점검하는 공개 운영 리포트.",
  canonical: "https://bachata.co.kr/health/"
})}
${styles}
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="소스 헬스 이동">
        <a href="/">홈</a>
        <a href="/health/">소스 헬스</a>
        <a href="/desk/">편집실</a>
        <a href="/briefs/">브리프</a>
        <a href="/submit/">제보</a>
      </nav>
    </header>
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Source Health</span>
          <h1>링크와 영상이 살아있는지 매일 확인합니다</h1>
          <p>내부 페이지, YouTube 임베드, 외부 출처를 점검해 자동 발행 큐의 품질을 관리합니다. Instagram처럼 접근 정책이 흔들리는 출처는 broken으로 단정하지 않고 watch 상태로 분리합니다.</p>
        </div>
        <aside class="policy-card">
          <span class="tag">Generated</span>
          <h2>${escapeHtml(report.generationDate)}</h2>
          <p>${escapeHtml(report.generatedAt)} 기준 검사입니다. 이 리포트는 사이트 운영 품질을 보여주기 위한 공개 점검표이며, 발행 차단용 하드 게이트는 아닙니다.</p>
        </aside>
      </div>
    </section>
    <main>
      <section class="summary-grid" aria-label="소스 헬스 요약">
        ${Object.entries(report.summary).map(([key, value]) => `<article class="summary-card"><span class="tag">${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}
      </section>
      ${groups.map((group) => `<section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">${escapeHtml(group.status)}</span>
            <h2>${escapeHtml(group.status)} sources</h2>
          </div>
          <p>${group.items.length ? `${group.items.length}개 항목입니다.` : "현재 해당 상태의 항목은 없습니다."}</p>
        </div>
        <div class="result-grid">
          ${group.items.slice(0, 24).map(renderResultCard).join("") || "<p>없음</p>"}
        </div>
      </section>`).join("")}
    </main>
  </body>
</html>
`;
};

const main = async () => {
  const items = new Map();
  for (const file of dataFiles) {
    const data = await readJson(file);
    collectFromValue(items, data, file);
  }

  const checked = [];
  for (const item of items.values()) {
    checked.push(await validateItem(item));
  }
  checked.sort((a, b) => (statusRank[a.status] - statusRank[b.status]) || a.type.localeCompare(b.type) || String(a.url).localeCompare(String(b.url)));

  const summary = {
    total: checked.length,
    ok: checked.filter((item) => item.status === "ok").length,
    watch: checked.filter((item) => item.status === "watch").length,
    warn: checked.filter((item) => item.status === "warn").length,
    broken: checked.filter((item) => item.status === "broken").length
  };

  const report = {
    generatedAt: new Date().toISOString(),
    generationDate: new Date().toISOString().slice(0, 10),
    summary,
    results: checked
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(resolve(outDir, "index.html"), renderPage(report), "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${resolve(outDir, "index.html")}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
