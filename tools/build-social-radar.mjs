import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/social-radar.json");
const outDir = resolve(root, "radar");
const indexPath = resolve(root, "data/generated/social-radar-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const renderLinks = (links = []) => links.map((link) => {
  const external = /^https?:\/\//.test(link.url);
  return `<a href="${escapeHtml(link.url)}"${external ? " target=\"_blank\" rel=\"noreferrer\"" : ""}>${escapeHtml(link.label)}</a>`;
}).join("");

const renderAccount = (account) => `<article class="account-card">
              <div>
                <span class="tag">${escapeHtml(account.role)}</span>
                <h3>${escapeHtml(account.name)}</h3>
                <p class="handle">@${escapeHtml(account.handle)}</p>
                <p>${escapeHtml(account.beat)}</p>
              </div>
              <div class="link-row">
                <a href="${escapeHtml(account.url)}" target="_blank" rel="noreferrer">Instagram</a>
                <a href="${escapeHtml(account.relatedUrl)}">관련 페이지</a>
              </div>
            </article>`;

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
        --green: #57a891;
        font-family: "SUIT Variable", SUIT, Pretendard, "Noto Sans KR", system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body { margin: 0; background: var(--bg); color: var(--ink); }
      a { color: inherit; text-decoration: none; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(11, 10, 8, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 20px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(60px, 9vw, 118px) max(18px, calc((100vw - 1180px) / 2)) 50px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(320px, 0.38fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      h1, h2, h3 { font-family: Paperlogy, "SUIT Variable", SUIT, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 940px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 96px); line-height: 0.95; overflow-wrap: anywhere; }
      .hero p { max-width: 790px; color: rgba(26, 21, 16, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .quick-nav, .link-row, .tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 26px; }
      .quick-nav a, .link-row a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; font-weight: 900; }
      .ops-card { padding: 22px; border: 1px solid rgba(26, 21, 16, 0.14); border-radius: 8px; background: rgba(26, 21, 16, 0.05); }
      .ops-card dl { display: grid; gap: 13px; margin: 14px 0 0; }
      .ops-card dt { color: var(--wine); font-size: 12px; font-weight: 950; text-transform: uppercase; }
      .ops-card dd { margin: 3px 0 0; color: rgba(26, 21, 16, 0.72); line-height: 1.58; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section { margin-top: clamp(42px, 7vw, 76px); }
      .section:first-child { margin-top: 0; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .watchlist-card p, .account-card p, .policy-card p, .hashtag-card span { color: var(--muted); line-height: 1.72; }
      .watchlist-stack { display: grid; gap: 18px; }
      .watchlist-card { padding: clamp(20px, 4vw, 30px); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .watchlist-card h2 { margin: 8px 0 10px; font-size: clamp(30px, 5vw, 54px); line-height: 1.04; }
      .watchlist-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 18px; }
      .watchlist-meta span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.76); font-size: 12px; font-weight: 900; }
      .account-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .account-card { display: grid; align-content: space-between; gap: 18px; min-height: 260px; padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-strong); }
      .account-card h3 { margin: 8px 0 0; font-size: 28px; line-height: 1.04; }
      .handle { margin: 8px 0 10px; color: var(--gold) !important; font-weight: 900; }
      .policy-grid, .hashtag-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .policy-card, .hashtag-card { padding: 20px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .policy-card h3, .hashtag-card h3 { margin: 8px 0 10px; font-size: 24px; line-height: 1.08; }
      .policy-card strong { color: var(--green); }
      .hashtag-card span { display: block; font-size: 14px; }
      .paper-cta { padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: var(--paper); color: var(--paper-ink); }
      .paper-cta h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .paper-cta p { max-width: 780px; color: rgba(26, 21, 16, 0.72); line-height: 1.72; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head, .policy-grid, .hashtag-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 760px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .account-grid { grid-template-columns: 1fr; }
        .watchlist-card, .policy-card, .hashtag-card { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="소셜 레이더 이동">
        <a href="/">홈</a>
        <a href="/radar/">소셜 레이더</a>
        <a href="/events/">행사</a>
        <a href="/profiles/">인물·팀</a>
        <a href="/briefs/">브리프</a>
      </nav>
    </header>`;

const renderIndex = (data) => {
  const accounts = data.watchlists.flatMap((watchlist) => watchlist.accounts.map((account) => ({
    ...account,
    watchlistId: watchlist.id,
    watchlistLabel: watchlist.label,
    priority: watchlist.priority
  })));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://bachata.co.kr/radar/",
    "name": data.title,
    "description": data.dek,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "about": data.watchlists.map((watchlist) => watchlist.label),
    "hasPart": data.watchlists.map((watchlist) => ({
      "@type": "ItemList",
      "name": watchlist.label,
      "numberOfItems": watchlist.accounts.length
    }))
  };

  return `<!doctype html>
<html lang="ko">
  <head>
${head({
  title: `${data.title} | Bachata Korea`,
  description: data.dek,
  canonical: "https://bachata.co.kr/radar/"
})}
${styles}
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd, null, 6)}
    </script>
  </head>
  <body>
${nav}
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Social Radar</span>
          <h1>인스타에서 먼저 뜨는 바차타 소식을 놓치지 않기</h1>
          <p>${escapeHtml(data.dek)}</p>
          <div class="quick-nav">
            ${data.watchlists.map((watchlist) => `<a href="#${escapeHtml(watchlist.id)}">${escapeHtml(watchlist.label)}</a>`).join("")}
          </div>
        </div>
        <aside class="ops-card">
          <span class="tag">Automation Stack</span>
          <dl>
            ${Object.values(data.automation).map((item) => `<div><dt>${escapeHtml(item.label)} · ${escapeHtml(item.status)}</dt><dd>${escapeHtml(item.note)}</dd></div>`).join("")}
          </dl>
        </aside>
      </div>
    </section>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Watchlists</span>
            <h2>매일 확인할 인스타·공식 소스</h2>
          </div>
          <p>계정 자체를 기사로 복제하지 않고, 어떤 신호를 볼 것인지와 사이트의 어느 콘텐츠로 연결할지를 정합니다. 이 데이터가 일간 브리프의 Social Radar 후보가 됩니다.</p>
        </div>
        <div class="watchlist-stack">
          ${data.watchlists.map((watchlist) => `<section class="watchlist-card" id="${escapeHtml(watchlist.id)}">
            <span class="tag">${escapeHtml(watchlist.label)}</span>
            <h2>${escapeHtml(watchlist.label)}</h2>
            <p>${escapeHtml(watchlist.why)}</p>
            <div class="watchlist-meta">
              <span>priority ${escapeHtml(watchlist.priority)}</span>
              <span>${watchlist.accounts.length} accounts</span>
            </div>
            <div class="account-grid">
              ${watchlist.accounts.map(renderAccount).join("\n")}
            </div>
            <div class="link-row" style="margin-top:18px">${renderLinks(watchlist.sourceLinks)}</div>
          </section>`).join("\n")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Hashtags</span>
            <h2>매일 확인하는 태그</h2>
          </div>
          <p>Meta 공식 제한을 고려해 30개 이하로 작게 유지합니다. 핵심 태그는 매일, 보조 태그는 주간으로 확인하도록 설계했습니다.</p>
        </div>
        <div class="hashtag-grid">
          ${data.hashtags.map((item) => `<article class="hashtag-card">
            <span class="tag">${escapeHtml(item.cadence)}</span>
            <h3>#${escapeHtml(item.tag)}</h3>
            <span>${escapeHtml(item.intent)}</span>
          </article>`).join("\n")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Policy</span>
            <h2>복제하지 않는 운영 원칙</h2>
          </div>
          <p>자동화는 수집과 후보 정렬까지만 담당합니다. 발행문은 출처를 보고 한국 독자에게 맞는 문장으로 다시 편집합니다.</p>
        </div>
        <div class="policy-grid">
          ${data.principles.map((item, index) => `<article class="policy-card">
            <span class="tag">Rule ${index + 1}</span>
            <h3>${index === 0 ? "복제 금지" : index === 1 ? "API 분리" : index === 2 ? "교차 확인" : "검수 발행"}</h3>
            <p>${escapeHtml(item)}</p>
          </article>`).join("\n")}
        </div>
      </section>
      <section class="section paper-cta">
        <span class="tag">Generated Index</span>
        <h2>${accounts.length}개 계정과 ${data.hashtags.length}개 태그를 추적합니다</h2>
        <p>이 페이지의 소스는 <a href="/data/social-radar.json">data/social-radar.json</a>이고, 자동 브리프는 매일 이 데이터에서 Social Radar 후보를 만들어 냅니다.</p>
        <div class="link-row">
          <a href="/briefs/">오늘 브리프</a>
          <a href="/events/">행사 레이더</a>
          <a href="/profiles/">인물·팀 허브</a>
        </div>
      </section>
    </main>
  </body>
</html>
`;
};

const main = async () => {
  const data = await readJson(dataPath);
  const accounts = data.watchlists.flatMap((watchlist) => watchlist.accounts.map((account) => ({
    ...account,
    watchlistId: watchlist.id,
    watchlistLabel: watchlist.label,
    priority: watchlist.priority
  })));

  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(resolve(outDir, "index.html"), renderIndex(data), "utf8");
  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    title: data.title,
    url: "/radar/",
    accountCount: accounts.length,
    hashtagCount: data.hashtags.length,
    watchlists: data.watchlists.map((watchlist) => ({
      id: watchlist.id,
      label: watchlist.label,
      priority: watchlist.priority,
      accounts: watchlist.accounts.map((account) => ({
        name: account.name,
        handle: account.handle,
        url: account.url,
        role: account.role,
        relatedUrl: account.relatedUrl
      }))
    })),
    hashtags: data.hashtags
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${resolve(outDir, "index.html")}`);
  console.log(`Wrote ${indexPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
