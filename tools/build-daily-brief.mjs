import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const signalsPath = resolve(root, "data/generated/scene-signals.json");
const latestPath = resolve(root, "data/generated/latest-brief.json");
const sitemapPath = resolve(root, "sitemap.xml");
const briefsDir = resolve(root, "briefs");

const indexPaths = {
  articles: resolve(root, "data/generated/article-index.json"),
  board: resolve(root, "data/generated/board-index.json"),
  styles: resolve(root, "data/generated/style-index.json"),
  programs: resolve(root, "data/generated/program-index.json"),
  profiles: resolve(root, "data/generated/profile-index.json"),
  events: resolve(root, "data/generated/event-index.json"),
  gear: resolve(root, "data/generated/gear-index.json"),
  koreaScene: resolve(root, "data/generated/korea-scene-index.json")
};

const TOPIC_COPY = {
  "bachata-influence": {
    label: "Bachata Influence",
    headline: "테크닉보다 먼저 봐야 할 흐름",
    dek: "Melvin & Gatica 계열의 영상은 웨이브나 트릭보다 프레임, 전환, 감정선의 밀도를 어떻게 조절하는지 볼 때 더 잘 읽힙니다.",
    questions: [
      "국내 수업에서는 Influence를 센슈얼과 어떻게 구분해 설명하면 좋을까?",
      "소셜에서 바로 쓸 수 있는 요소와 공연용으로 남겨둘 요소는 어디서 갈릴까?"
    ]
  },
  bachazouk: {
    label: "Bachazouk",
    headline: "바차타와 주크가 만나는 지점",
    dek: "Bachazouk는 유행어처럼 소비하기보다, 바차타의 리듬 위에 Brazilian Zouk의 흐름과 상체 회전을 어디까지 가져올지 구분해서 보는 편이 안전합니다.",
    questions: [
      "헤드무브와 상체 회전은 어떤 속도와 음악에서 안전하게 쓸 수 있을까?",
      "주크의 감각을 넣어도 바차타 음악성과 파트너워크가 살아 있는가?"
    ]
  },
  "global-dancers": {
    label: "글로벌 댄서",
    headline: "요즘 많이 회자되는 이름들",
    dek: "Gero & Migle, Luis & Andrea, Andi & Silvia 같은 글로벌 댄서는 단순히 최신 영상을 보는 것보다 반복되는 입구, 출구, 시그니처 움직임을 따라 읽는 편이 좋습니다.",
    questions: [
      "국내 소셜에서 따라 하기 좋은 요소와 무대용 요소는 무엇이 다를까?",
      "커플별 에너지는 패턴보다 어떤 연결 방식에서 먼저 드러날까?"
    ]
  },
  "korea-scene": {
    label: "국내 소식",
    headline: "서울과 전국의 실제 현장",
    dek: "국내 바차타 정보는 영상, 인스타그램, 행사 공지가 흩어져 있습니다. 장소, 팀, 강사, 동호회 정보를 한 화면에서 읽을 수 있게 묶는 것이 핵심입니다.",
    questions: [
      "처음 가는 사람에게 필요한 정보는 실력보다 장소, 시간, 분위기, 신청 방식일 수 있습니다.",
      "국내 영상은 누가 잘 추는지보다 어떤 현장을 보여주는지 먼저 봐야 합니다."
    ]
  },
  "gear-market": {
    label: "댄스화·마켓",
    headline: "회전감과 바닥 궁합",
    dek: "댄스화 콘텐츠는 브랜드 홍보보다 회전감, 쿠션, 바닥 적응, 사이즈와 반품 리스크를 나눠야 검색 가치가 생깁니다.",
    questions: [
      "Fuego, Pana Mio, On1, Pulse는 어떤 바닥과 춤 스타일에 맞을까?",
      "국내 구매자는 사이즈와 배송·반품 리스크를 어떻게 줄일 수 있을까?"
    ]
  },
  "social-radar": {
    label: "소셜 소식",
    headline: "행사와 계정의 움직임",
    dek: "인스타그램과 공개 링크는 본문을 복사하지 않고 계정, 해시태그, 행사 페이지, 관련 영상의 신호를 함께 보는 방식으로 정리합니다.",
    questions: [
      "오늘 확인한 흐름은 행사, 팀 소개, 댄서 프로필, 상품 비교 중 어디에 가까운가?",
      "공식 링크와 영상이 함께 있어 기사로 정리할 만큼 확인됐는가?"
    ]
  },
  "editorial-desk": {
    label: "기획 노트",
    headline: "글로 키울 만한 주제",
    dek: "기획 노트는 센슈얼·도미니칸 같은 코어 콘텐츠와 국내 현장, 행사, 상품처럼 바로 검색되는 주제를 골라 다음 기사로 확장합니다.",
    questions: [
      "오늘은 깊게 읽을 주제와 짧게 업데이트할 주제를 구분했는가?",
      "영상, 이미지 링크, 원문 출처가 모두 있어 공개 글로 확장할 수 있는가?"
    ]
  }
};

const readJson = async (path, fallback = null) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const compact = (value = "", max = 120) => {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const cleanOutput = (value = "") => String(value).replace(/[ \t]+$/gm, "");

const formatDateKo = (dateText = "") => {
  const [year, month, day] = dateText.split("-");
  if (!year || !month || !day) return dateText;
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
};

const topicCopy = (topic) => TOPIC_COPY[topic.id] || {
  label: topic.label || "바차타 소식",
  headline: "오늘 확인한 바차타 신호",
  dek: "공개 영상과 링크를 기준으로 오늘 읽을 만한 바차타 흐름을 정리합니다.",
  questions: [
    "이 소식은 초보자에게 바로 도움이 되는가?",
    "원문 링크와 영상으로 독자가 직접 확인할 수 있는가?"
  ]
};

const publicTypeLabel = (candidate = {}) => {
  const type = String(candidate.type || "").toLowerCase();
  if (candidate.publishFormat) return candidate.publishFormat;
  if (type.includes("youtube")) return "영상";
  if (type.includes("instagram")) return "인스타그램";
  if (type.includes("naver")) return "검색 결과";
  if (type.includes("editorial")) return "기획 노트";
  return "공개 링크";
};

const noveltyLabel = (candidate = {}) => {
  if (candidate.novelty === "new") return "새로 확인";
  if (candidate.novelty === "returning") return "재등장";
  if (candidate.novelty === "recurring" && candidate.seenCount) return `${candidate.seenCount}회 관찰`;
  return "";
};

const evidenceLabel = (candidate = {}) => {
  if (candidate.evidenceLevel === "strong") return "근거 충분";
  if (candidate.evidenceLevel === "medium") return "공개 링크";
  return "";
};

const validEmbed = (url = "") => /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}/.test(url);

const renderCandidateCard = (candidate = {}) => {
  const labels = [publicTypeLabel(candidate), noveltyLabel(candidate), evidenceLabel(candidate)].filter(Boolean);
  const embed = validEmbed(candidate.embedUrl)
    ? `<div class="video-frame"><iframe loading="lazy" src="${escapeHtml(candidate.embedUrl)}" title="${escapeHtml(candidate.title || "Bachata video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    : "";
  const href = candidate.sourceUrl || candidate.relatedUrl || candidate.targetUrl || "/briefs/";
  return `<article class="article-card candidate">
        ${embed}
        <div class="candidate-body">
          <span class="tag">${escapeHtml(labels.join(" · ") || "공개 링크")}</span>
          <h3>${escapeHtml(compact(candidate.title || "확인할 바차타 소식", 92))}</h3>
          <p>${escapeHtml(candidate.targetUrl ? `이어 읽기: ${candidate.targetUrl}` : "영상과 공개 링크를 기준으로 확인한 소식입니다.")}</p>
          <div class="link-row"><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">원문 확인</a></div>
        </div>
      </article>`;
};

const renderTopicSection = (topic = {}) => {
  const copy = topicCopy(topic);
  const candidates = (topic.candidates || []).slice(0, 3);
  return `<section class="section topic" id="${escapeHtml(topic.id)}">
      <div class="section-head">
        <div>
          <span class="eyebrow">${escapeHtml(copy.label)}</span>
          <h2>${escapeHtml(copy.headline)}</h2>
        </div>
        <p>${escapeHtml(copy.dek)}</p>
      </div>
      <div class="article-list">
        ${candidates.length ? candidates.map(renderCandidateCard).join("\n        ") : "<p>오늘은 공개 링크가 충분하지 않아 보류했습니다.</p>"}
      </div>
      <div class="side-box">
        <span>이어 볼 질문</span>
        <ul class="mini-list">${copy.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
      </div>
    </section>`;
};

const buildLatestBriefModel = (signals) => {
  const dateText = signals.generationDate;
  const topics = signals.topics || [];
  const candidateCount = topics.reduce((sum, topic) => sum + (topic.candidateCount || topic.candidates?.length || 0), 0);
  const sections = topics.slice(0, 6).map((topic) => {
    const copy = topicCopy(topic);
    return {
      id: topic.id,
      title: copy.label,
      headline: copy.headline,
      summary: copy.dek,
      candidates: (topic.candidates || []).slice(0, 3).map((candidate) => ({
        title: candidate.title,
        url: candidate.sourceUrl || candidate.relatedUrl || candidate.targetUrl || null,
        videoId: candidate.videoId || candidate.id || null,
        publishFormat: publicTypeLabel(candidate),
        evidenceLevel: candidate.evidenceLevel || "public-link"
      }))
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    generationDate: dateText,
    url: `/briefs/${dateText}.html`,
    headline: `${formatDateKo(dateText)} 바차타 최신소식`,
    dek: "새로 올라온 영상, 행사, 커뮤니티 이야기를 오늘 읽기 좋은 흐름으로 골랐습니다.",
    topicCount: topics.length,
    candidateCount,
    sections,
    evidenceLinks: topics
      .flatMap((topic) => topic.candidates || [])
      .filter((candidate) => candidate.sourceUrl)
      .slice(0, 14)
      .map((candidate) => ({
        title: candidate.title,
        url: candidate.sourceUrl,
        type: candidate.type || "public-source"
      })),
    targetPages: [
      { label: "최신소식", url: `/briefs/${dateText}.html` },
      { label: "세부장르 살펴보기", url: "/styles/" },
      { label: "국내 소식", url: "/korea-scene/" },
      { label: "페스티벌 정보", url: "/events/" },
      { label: "해외 페스티벌 정보", url: "/events/overseas.html" }
    ]
  };
};

const renderBriefHtml = (signals, latestModel) => {
  const dateText = signals.generationDate;
  const topicLinks = (signals.topics || [])
    .map((topic) => {
      const copy = topicCopy(topic);
      return `<a href="#${escapeHtml(topic.id)}">${escapeHtml(copy.label)}</a>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(latestModel.headline)} | 바차타 코리아</title>
    <meta name="description" content="${escapeHtml(latestModel.dek)}">
    <meta name="robots" content="index,follow,max-video-preview:-1,max-snippet:-1,max-image-preview:large">
    <link rel="canonical" href="https://bachata.co.kr/briefs/${dateText}.html">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/complete/WantedSansVariable.css">
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `https://bachata.co.kr/briefs/${dateText}.html`,
      headline: latestModel.headline,
      description: latestModel.dek,
      datePublished: `${dateText}T00:00:00+09:00`,
      dateModified: latestModel.generatedAt,
      inLanguage: "ko-KR",
      isPartOf: { "@id": "https://bachata.co.kr/#website" },
      about: latestModel.sections.map((section) => section.title),
      mainEntityOfPage: `https://bachata.co.kr/briefs/${dateText}.html`
    })}</script>
  </head>
  <body>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">오늘의 바차타</span>
            <h1>${escapeHtml(latestModel.headline)}</h1>
          </div>
          <p>${escapeHtml(latestModel.dek)}</p>
        </div>
        <div class="quick-nav">${topicLinks}</div>
      </section>
      ${(signals.topics || []).map(renderTopicSection).join("\n")}
    </main>
  </body>
</html>
`;
};

const renderBriefIndex = async (signals, latestModel) => {
  let files = [];
  try {
    files = (await readdir(briefsDir)).filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name)).sort().reverse();
  } catch {
    files = [];
  }

  const latest = `${signals.generationDate}.html`;
  if (!files.includes(latest)) files.unshift(latest);

  const sectionCards = latestModel.sections.slice(0, 6).map((section) => `<article class="article-card">
        <span class="tag">${escapeHtml(section.title)}</span>
        <h3>${escapeHtml(section.headline)}</h3>
        <p>${escapeHtml(section.summary)}</p>
        <div class="link-row"><a href="${escapeHtml(latestModel.url)}#${escapeHtml(section.id)}">오늘 흐름 보기</a></div>
      </article>`).join("\n      ");

  const archiveCards = files.slice(0, 12).map((file) => {
    const dateText = file.replace(".html", "");
    return `<article class="article-card">
        <span class="tag">${escapeHtml(formatDateKo(dateText))}</span>
        <h3>${escapeHtml(`${formatDateKo(dateText)} 바차타 최신소식`)}</h3>
        <p>영상, 행사, 국내외 바차타 흐름을 공개 링크 중심으로 정리한 데일리 피드입니다.</p>
        <div class="link-row"><a href="/briefs/${escapeHtml(file)}">읽기</a></div>
      </article>`;
  }).join("\n      ");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>바차타 최신소식 | 바차타 코리아</title>
    <meta name="description" content="국내외 바차타 영상, 행사, 댄서, 커뮤니티 흐름을 매거진 피드로 정리하는 바차타 코리아 최신소식.">
    <link rel="canonical" href="https://bachata.co.kr/briefs/">
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/complete/WantedSansVariable.css">
  </head>
  <body>
    <main>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">최신소식</span>
            <h1>오늘 바차타씬에서 볼 만한 흐름</h1>
          </div>
          <p>${escapeHtml(latestModel.dek)}</p>
        </div>
        <div class="link-row"><a href="${escapeHtml(latestModel.url)}">오늘 피드 읽기</a><a href="/articles/">기사 라이브러리</a></div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">오늘의 토픽</span>
            <h2>훑어보고 바로 들어가기</h2>
          </div>
          <p>각 카드는 영상과 공개 링크를 바탕으로 오늘 이어 읽을 만한 주제를 묶습니다.</p>
        </div>
        <div class="article-list">${sectionCards}</div>
      </section>
      <section class="section">
        <div class="section-head">
          <div>
            <span class="eyebrow">아카이브</span>
            <h2>지난 최신소식</h2>
          </div>
          <p>날짜만 남기지 않고, 매일의 흐름이 다음 기사와 가이드로 이어지도록 보관합니다.</p>
        </div>
        <div class="article-list">${archiveCards}</div>
      </section>
    </main>
  </body>
</html>
`;
};

const addUrl = (items, url, lastmod, changefreq = "weekly", priority = "0.7") => {
  if (!url || url.includes("/desk/") || url.includes("/health/") || url.includes("/intake/") || url.includes("/radar/") || url.includes("test.bachata")) return;
  items.push({ url, lastmod, changefreq, priority });
};

const updateSitemap = async (dateText) => {
  const urls = [];
  addUrl(urls, "/", dateText, "weekly", "1.0");
  addUrl(urls, "/briefs/", dateText, "daily", "0.86");

  let briefFiles = [];
  try {
    briefFiles = (await readdir(briefsDir)).filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name)).sort().reverse();
  } catch {
    briefFiles = [];
  }
  for (const file of briefFiles) addUrl(urls, `/briefs/${file}`, file.replace(".html", ""), "monthly", "0.74");

  const [articles, board, styles, programs, profiles, events, gear, koreaScene] = await Promise.all([
    readJson(indexPaths.articles, {}),
    readJson(indexPaths.board, {}),
    readJson(indexPaths.styles, {}),
    readJson(indexPaths.programs, {}),
    readJson(indexPaths.profiles, {}),
    readJson(indexPaths.events, {}),
    readJson(indexPaths.gear, {}),
    readJson(indexPaths.koreaScene, {})
  ]);

  addUrl(urls, "/articles/", dateText, "weekly", "0.84");
  for (const item of articles.articles || []) addUrl(urls, item.url, item.updatedAt || dateText, "monthly", "0.74");

  addUrl(urls, "/styles/", styles.updatedAt || dateText, "weekly", "0.86");
  for (const item of styles.guides || []) addUrl(urls, item.url, styles.updatedAt || dateText, "monthly", "0.78");

  addUrl(urls, "/programs/", programs.updatedAt || dateText, "weekly", "0.88");
  for (const item of programs.programs || []) addUrl(urls, item.url, programs.updatedAt || dateText, "monthly", "0.8");

  addUrl(urls, "/profiles/", profiles.updatedAt || dateText, "weekly", "0.82");
  for (const item of profiles.profiles || []) addUrl(urls, item.url, profiles.updatedAt || dateText, "monthly", "0.7");

  addUrl(urls, "/events/", events.updatedAt || dateText, "daily", "0.86");
  addUrl(urls, events.overseasUrl, events.updatedAt || dateText, "weekly", "0.82");
  for (const item of events.events || []) addUrl(urls, item.url, events.updatedAt || dateText, "weekly", "0.74");

  addUrl(urls, "/community/", board.updatedAt || dateText, "weekly", "0.82");
  for (const item of board.categories || []) addUrl(urls, item.url, board.updatedAt || dateText, "weekly", "0.72");

  addUrl(urls, "/gear/", gear.updatedAt || dateText, "weekly", "0.78");
  for (const item of gear.products || []) addUrl(urls, item.url, gear.updatedAt || dateText, "monthly", "0.68");

  addUrl(urls, "/korea-scene/", koreaScene.updatedAt || dateText, "daily", "0.9");
  addUrl(urls, "/submit/", dateText, "weekly", "0.72");

  const unique = new Map();
  for (const item of urls) unique.set(item.url, item);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...unique.values()].map((item) => `  <url>
    <loc>https://bachata.co.kr${item.url}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
  await writeFile(sitemapPath, sitemap, "utf8");
};

const main = async () => {
  const signals = await readJson(signalsPath);
  if (!signals?.generationDate) throw new Error("scene-signals.json is missing generationDate");

  const latestModel = buildLatestBriefModel(signals);
  const briefPath = resolve(briefsDir, `${signals.generationDate}.html`);

  await mkdir(briefsDir, { recursive: true });
  await writeFile(briefPath, cleanOutput(renderBriefHtml(signals, latestModel)), "utf8");
  await writeFile(resolve(briefsDir, "index.html"), cleanOutput(await renderBriefIndex(signals, latestModel)), "utf8");
  await writeFile(latestPath, `${JSON.stringify(latestModel, null, 2)}\n`, "utf8");
  await updateSitemap(signals.generationDate);

  console.log(`Wrote ${briefPath}`);
  console.log(`Wrote ${resolve(briefsDir, "index.html")}`);
  console.log(`Wrote ${latestPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
