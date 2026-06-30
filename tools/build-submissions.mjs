import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "data/submissions.json");
const outDir = resolve(root, "submit");
const indexPath = resolve(root, "data/generated/submission-index.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

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
      button, input, textarea, select { font: inherit; }
      .nav { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 0 max(18px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid var(--line); background: rgba(11, 10, 8, 0.92); backdrop-filter: blur(18px); }
      .brand strong { display: block; font-size: 20px; line-height: 1; }
      .brand span { display: block; margin-top: 5px; color: var(--gold); font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .nav-links { display: flex; gap: 20px; color: var(--muted); font-size: 14px; font-weight: 850; }
      .hero { padding: clamp(60px, 9vw, 118px) max(18px, calc((100vw - 1180px) / 2)) 50px; background: var(--paper); color: var(--paper-ink); }
      .hero-grid { display: grid; grid-template-columns: minmax(0, 0.76fr) minmax(300px, 0.42fr); gap: clamp(22px, 5vw, 56px); align-items: end; }
      .eyebrow, .tag { color: var(--wine); font-size: 12px; font-weight: 950; letter-spacing: 0.13em; text-transform: uppercase; }
      h1, h2, h3 { font-family: "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", system-ui, sans-serif; letter-spacing: 0; word-break: keep-all; }
      h1 { max-width: 940px; margin: 14px 0 18px; font-size: clamp(46px, 8vw, 96px); line-height: 0.95; overflow-wrap: anywhere; }
      .hero p { max-width: 790px; color: rgba(26, 21, 16, 0.72); font-size: clamp(17px, 2vw, 22px); line-height: 1.72; }
      .quick-nav, .link-row, .template-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-nav { margin-top: 26px; }
      .quick-nav a, .link-row a, .template-tabs button, .action-button { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 13px; border: 1px solid currentColor; border-radius: 999px; background: transparent; color: inherit; font-size: 13px; font-weight: 900; cursor: pointer; }
      .template-tabs button[aria-pressed="true"], .action-button.primary { background: var(--gold); border-color: var(--gold); color: #17120f; }
      .hero-card { padding: 22px; border: 1px solid rgba(26, 21, 16, 0.14); border-radius: 8px; background: rgba(26, 21, 16, 0.05); }
      .hero-card dl { display: grid; gap: 13px; margin: 14px 0 0; }
      .hero-card dt { color: var(--wine); font-size: 12px; font-weight: 950; text-transform: uppercase; }
      .hero-card dd { margin: 3px 0 0; color: rgba(26, 21, 16, 0.72); line-height: 1.58; }
      main { width: min(1180px, calc(100% - 36px)); margin: 0 auto; padding: clamp(42px, 7vw, 76px) 0 90px; }
      .section { margin-top: clamp(42px, 7vw, 76px); }
      .section:first-child { margin-top: 0; }
      .section-head { display: grid; grid-template-columns: minmax(0, 0.72fr) minmax(280px, 0.36fr); gap: 24px; align-items: end; margin-bottom: 22px; }
      .section-head h2 { margin: 10px 0 0; font-size: clamp(34px, 5vw, 64px); line-height: 1.02; }
      .section-head p, .template-card p, .rule-card li, .preview-card p, .field-list li { color: var(--muted); line-height: 1.72; }
      .template-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .template-card { display: grid; align-content: space-between; gap: 18px; min-height: 340px; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .template-card h3 { margin: 8px 0 10px; font-size: 28px; line-height: 1.08; }
      .meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .meta-row span { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: rgba(255, 247, 232, 0.76); font-size: 12px; font-weight: 900; }
      .tool-layout { display: grid; grid-template-columns: minmax(0, 0.82fr) minmax(320px, 0.44fr); gap: 18px; align-items: start; }
      .form-card, .preview-card, .rule-card { padding: clamp(20px, 4vw, 30px); border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
      .form-grid { display: grid; gap: 12px; margin-top: 18px; }
      label { display: grid; gap: 7px; color: rgba(255, 247, 232, 0.78); font-size: 13px; font-weight: 900; }
      input, textarea, select { width: 100%; border: 1px solid var(--line); border-radius: 8px; background: rgba(255, 247, 232, 0.08); color: var(--ink); padding: 12px 13px; outline: none; }
      textarea { min-height: 140px; resize: vertical; line-height: 1.6; }
      input:focus, textarea:focus, select:focus { border-color: rgba(226, 173, 88, 0.72); box-shadow: 0 0 0 3px rgba(226, 173, 88, 0.16); }
      .field-list, .rule-card ul { display: grid; gap: 8px; margin: 14px 0 0; padding-left: 18px; }
      .preview-card { position: sticky; top: 96px; }
      .preview-box { min-height: 260px; margin: 16px 0; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: #070604; color: rgba(255, 247, 232, 0.82); white-space: pre-wrap; line-height: 1.65; }
      .rule-grid { display: grid; grid-template-columns: minmax(0, 0.7fr) minmax(280px, 0.4fr); gap: 14px; }
      .paper-cta { padding: clamp(22px, 4vw, 34px); border-radius: 8px; background: var(--paper); color: var(--paper-ink); }
      .paper-cta h2 { margin: 8px 0 12px; font-size: clamp(30px, 5vw, 56px); line-height: 1.04; }
      .paper-cta p { max-width: 820px; color: rgba(26, 21, 16, 0.72); line-height: 1.72; }
      @media (max-width: 1020px) {
        .hero-grid, .section-head, .tool-layout, .rule-grid { grid-template-columns: 1fr; }
        .template-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .preview-card { position: static; }
      }
      @media (max-width: 760px) {
        .nav-links { display: none; }
        h1 { font-size: clamp(42px, 13vw, 66px); }
        .template-grid { grid-template-columns: 1fr; }
        .template-card, .form-card, .preview-card, .rule-card { padding: 20px; }
      }
    </style>`;

const nav = `    <header class="nav">
      <a class="brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea</span></a>
      <nav class="nav-links" aria-label="제보 센터 이동">
        <a href="/">홈</a>
        <a href="/submit/">제보</a>
        <a href="/community/">커뮤니티</a>
        <a href="/briefs/">브리프</a>
        <a href="/briefs/">브리프</a>
      </nav>
    </header>`;

const renderTemplateCard = (template) => `<article class="template-card" id="${escapeHtml(template.id)}">
          <div>
            <span class="tag">${escapeHtml(template.label)}</span>
            <h3>${escapeHtml(template.headline)}</h3>
            <p>${escapeHtml(template.description)}</p>
            <div class="meta-row">
              <span>${escapeHtml(template.priority)}</span>
              <span>${escapeHtml(template.targetBoard)}</span>
            </div>
          </div>
          <ul class="field-list">${template.fields.slice(0, 5).map((field) => `<li>${escapeHtml(field)}</li>`).join("")}</ul>
        </article>`;

const renderPage = (data) => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": "https://bachata.co.kr/submit/",
    "name": data.title,
    "description": data.dek,
    "inLanguage": "ko-KR",
    "isPartOf": { "@id": "https://bachata.co.kr/#website" },
    "about": data.templates.map((template) => template.label)
  };

  const dataScript = JSON.stringify(data.templates);
  const body = `    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">Submit Desk</span>
          <h1>바차타 소식, 양도, 구인, 팀 소개를 한 번에 보냅니다</h1>
          <p>${escapeHtml(data.dek)}</p>
          <div class="quick-nav">
            ${data.templates.map((template) => `<a href="#${escapeHtml(template.id)}">${escapeHtml(template.label)}</a>`).join("")}
          </div>
        </div>
        <aside class="hero-card">
          <span class="tag">Contact</span>
          <dl>
            <div><dt>Email</dt><dd>${escapeHtml(data.contact.email)}</dd></div>
            <div><dt>Instagram</dt><dd>${escapeHtml(data.contact.instagramHandle)}</dd></div>
            <div><dt>Review</dt><dd>출처, 날짜, 가격, 영상 유효성을 확인한 뒤 커뮤니티 보드와 편집 데스크에 반영합니다.</dd></div>
          </dl>
        </aside>
      </div>
    </section>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Submission Types</span>
            <h2>받는 제보 종류</h2>
          </div>
          <p>정적 사이트라 로그인 게시판은 아직 없지만, 운영자가 바로 확인할 수 있도록 카테고리별 필수 항목을 먼저 표준화했습니다.</p>
        </div>
        <div class="template-grid">
          ${data.templates.map(renderTemplateCard).join("\n")}
        </div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">Message Builder</span>
            <h2>보낼 문안 만들기</h2>
          </div>
          <p>카테고리를 고르고 내용을 채우면 운영자에게 보낼 메일 문안이 만들어집니다. 인스타 DM으로 보낼 때도 같은 내용을 복사해서 쓰면 됩니다.</p>
        </div>
        <div class="tool-layout">
          <section class="form-card" aria-label="제보 문안 작성">
            <div class="template-tabs" role="group" aria-label="제보 종류">
              ${data.templates.map((template, index) => `<button type="button" data-template="${escapeHtml(template.id)}" aria-pressed="${index === 0 ? "true" : "false"}">${escapeHtml(template.label)}</button>`).join("")}
            </div>
            <div class="form-grid">
              <label>제목
                <input id="submission-title" type="text" placeholder="예: 7월 강남 센슈얼 바차타 워크숍">
              </label>
              <label>원문 링크 또는 공식 계정
                <input id="submission-source" type="url" placeholder="https://www.instagram.com/...">
              </label>
              <label>연락처
                <input id="submission-contact" type="text" placeholder="Instagram ID 또는 이메일">
              </label>
              <label>본문
                <textarea id="submission-body" placeholder="날짜, 장소, 가격, 대상, 초보 가능 여부, 영상 URL, 추가 설명을 적어주세요."></textarea>
              </label>
            </div>
            <section class="rule-card" style="margin-top:16px">
              <span class="tag">Required fields</span>
              <ul id="field-list"></ul>
            </section>
          </section>
          <aside class="preview-card">
            <span class="tag">Preview</span>
            <h2>전송 문안</h2>
            <p id="template-description"></p>
            <div class="preview-box" id="submission-preview"></div>
            <div class="link-row">
              <a class="action-button primary" id="mailto-link" href="#">메일 앱 열기</a>
              <button class="action-button" type="button" id="copy-button">문안 복사</button>
              <a class="action-button" href="${escapeHtml(data.contact.instagram)}" target="_blank" rel="noreferrer">Instagram DM</a>
            </div>
          </aside>
        </div>
      </section>
      <section class="section">
        <div class="rule-grid">
          <article class="rule-card">
            <span class="tag">Review Rules</span>
            <h2>확인 기준</h2>
            <ul>${data.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
          </article>
          <article class="paper-cta">
            <span class="tag">Where It Goes</span>
            <h2>제보는 보드와 편집 데스크로 이동합니다</h2>
            <p>행사와 양도는 커뮤니티 보드에, 확인된 팀·장소·댄서 정보는 프로필과 기사로, 반복되는 주제는 편집 데스크의 준비 중인 글로 이어집니다.</p>
            <div class="link-row">
              <a href="/community/">커뮤니티 보드</a>
              <a href="/briefs/">일간 브리프</a>
              <a href="/briefs/">일간 브리프</a>
            </div>
          </article>
        </div>
      </section>
    </main>
    <script>
      const templates = ${dataScript};
      const contactEmail = ${JSON.stringify(data.contact.email)};
      let activeTemplate = templates[0];
      const titleInput = document.getElementById("submission-title");
      const sourceInput = document.getElementById("submission-source");
      const contactInput = document.getElementById("submission-contact");
      const bodyInput = document.getElementById("submission-body");
      const preview = document.getElementById("submission-preview");
      const fieldList = document.getElementById("field-list");
      const description = document.getElementById("template-description");
      const mailtoLink = document.getElementById("mailto-link");
      const copyButton = document.getElementById("copy-button");

      const buildMessage = () => {
        const fieldBlock = activeTemplate.fields.map((field) => \`- \${field}: \`).join("\\n");
        return \`[\${activeTemplate.label}] \${titleInput.value || activeTemplate.headline}

대상 보드: \${activeTemplate.targetBoard}
우선도: \${activeTemplate.priority}
원문 링크: \${sourceInput.value || "(공식 링크 필요)"}
연락처: \${contactInput.value || "(연락처 필요)"}

필수 항목
\${fieldBlock}

본문
\${bodyInput.value || "(날짜, 장소, 가격, 영상 URL, 초보 가능 여부 등을 적어주세요.)"}

출처 체크
\${activeTemplate.sourceChecklist.map((item) => \`- \${item}\`).join("\\n")}\`;
      };

      const sync = () => {
        const message = buildMessage();
        preview.textContent = message;
        fieldList.innerHTML = activeTemplate.fields.map((field) => \`<li>\${field}</li>\`).join("");
        description.textContent = activeTemplate.description;
        const subject = encodeURIComponent(activeTemplate.subject);
        const body = encodeURIComponent(message);
        mailtoLink.href = \`mailto:\${contactEmail}?subject=\${subject}&body=\${body}\`;
      };

      document.querySelectorAll("[data-template]").forEach((button) => {
        button.addEventListener("click", () => {
          activeTemplate = templates.find((template) => template.id === button.dataset.template) || templates[0];
          document.querySelectorAll("[data-template]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
          sync();
        });
      });

      [titleInput, sourceInput, contactInput, bodyInput].forEach((input) => input.addEventListener("input", sync));
      copyButton.addEventListener("click", async () => {
        await navigator.clipboard.writeText(buildMessage());
        copyButton.textContent = "복사됨";
        setTimeout(() => { copyButton.textContent = "문안 복사"; }, 1400);
      });
      sync();
    </script>`;

  return `<!doctype html>
<html lang="ko">
  <head>
${head({
  title: `${data.title} | Bachata Korea`,
  description: data.dek,
  canonical: "https://bachata.co.kr/submit/"
})}
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
};

const main = async () => {
  const data = await readJson(dataPath);
  await mkdir(outDir, { recursive: true });
  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(resolve(outDir, "index.html"), renderPage(data), "utf8");
  await writeFile(indexPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    updatedAt: data.updatedAt,
    title: data.title,
    url: "/submit/",
    contact: data.contact,
    templates: data.templates.map((template) => ({
      id: template.id,
      label: template.label,
      headline: template.headline,
      targetBoard: template.targetBoard,
      priority: template.priority,
      fieldCount: template.fields.length
    }))
  }, null, 2)}\n`, "utf8");
  console.log("Wrote submission center");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
