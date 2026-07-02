export const PUBLIC_NAV = [
  { href: "/briefs/", label: "최신소식" },
  { href: "/programs/", label: "초보자 가이드" },
  { href: "/styles/", label: "세부장르 살펴보기" },
  { href: "/profiles/", label: "댄서 소개" },
  { href: "/korea-scene/", label: "국내 소식" },
  { href: "/events/", label: "페스티벌 정보" },
  { href: "/events/overseas.html", label: "해외 페스티벌 정보" }
];

export const COMMUNITY_NAV = [
  { href: "/community/free.html", label: "자유게시판" },
  { href: "/community/transfer.html", label: "양도양수" },
  { href: "/community/anonymous.html", label: "익명게시판" },
  { href: "/community/jobs.html", label: "구인구직" },
  { href: "/community/promo.html", label: "홍보/제휴" }
];

export const INTERNAL_PREFIXES = [
  "/desk/",
  "/health/",
  "/intake/",
  "/radar/"
];

export const routeFromRelativePath = (relativePath) => {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized === "index.html") return "/";
  return `/${normalized.replace(/index\.html$/, "").replace(/\\/g, "/")}`;
};

const activeFor = (href, activePath) => {
  if (href === "/") return activePath === "/";
  if (href.endsWith(".html")) return activePath === href;
  return activePath.startsWith(href);
};

export const isInternalPath = (path = "") => INTERNAL_PREFIXES.some((prefix) => path.startsWith(prefix));

export const renderSiteHeader = ({ activePath = "/" } = {}) => {
  const navLinks = PUBLIC_NAV.map((item) => {
    const current = activeFor(item.href, activePath) ? ' aria-current="page"' : "";
    return `<a href="${item.href}"${current}>${item.label}</a>`;
  }).join("");

  const communityCurrent = activePath.startsWith("/community/") ? ' aria-current="page"' : "";
  const communityLinks = COMMUNITY_NAV.map((item) => `<a href="${item.href}">${item.label}</a>`).join("");

  return `    <header class="bk-site-header">
      <a class="bk-brand" href="/"><strong>바차타 코리아</strong><span>Bachata Korea Magazine</span></a>
      <nav class="bk-nav" aria-label="주요 메뉴">
        ${navLinks}
        <details>
          <summary${communityCurrent}>커뮤니티</summary>
          <div class="bk-menu">${communityLinks}</div>
        </details>
      </nav>
    </header>`;
};

const assetBlock = `    <link rel="stylesheet" href="/assets/site.css">
    <script defer src="/assets/site.js"></script>`;

export const ensureSiteAssets = (html) => {
  if (html.includes("/assets/site.css")) return html;
  return html.replace(/<\/head>/i, `${assetBlock}\n  </head>`);
};

export const ensureBodyClass = (html) => {
  if (/<body\b[^>]*class="/i.test(html)) {
    return html.replace(/<body\b([^>]*class=")([^"]*)"/i, (match, start, classes) => {
      if (classes.split(/\s+/).includes("site-shell")) return match;
      return `<body${start}${classes} site-shell"`;
    });
  }
  return html.replace(/<body\b([^>]*)>/i, "<body$1 class=\"site-shell\">");
};

export const ensureRobots = (html, value) => {
  if (!value) return html;
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
    return html.replace(/<meta\s+name=["']robots["'][^>]*>/i, `<meta name="robots" content="${value}">`);
  }
  return html.replace(/<\/head>/i, `    <meta name="robots" content="${value}">\n  </head>`);
};

export const replaceHeader = (html, activePath) => {
  const header = renderSiteHeader({ activePath });
  const withoutHeaders = html
    .replace(/\s*<header\s+class="bk-site-header">[\s\S]*?<\/header>\s*/g, "\n")
    .replace(/\s*<header\s+class="site-header"[\s\S]*?<\/header>\s*/g, "\n")
    .replace(/\s*<header\s+class="nav"[\s\S]*?<\/header>\s*/g, "\n");

  return withoutHeaders.replace(/<body\b[^>]*>/i, (match) => `${match}\n${header}`);
};

export const normalizePublicText = (html) => {
  const replacements = [
    [/브리핑/g, "최신소식"],
    [/브리프/g, "최신소식"],
    [/오늘 업데이트/g, "최신소식"],
    [/오늘 브리핑/g, "최신소식"],
    [/리포트/g, "최신소식"],
    [/입문/g, "초보자 가이드"],
    [/스타일별 가이드/g, "세부장르 가이드"],
    [/스타일/g, "세부장르"],
    [/댄서·팀/g, "댄서 소개"],
    [/댄서와 팀/g, "댄서 소개"],
    [/국내<\/a>/g, "국내 소식</a>"],
    [/행사<\/a>/g, "페스티벌 정보</a>"],
    [/Article Library/g, "기사 라이브러리"],
    [/Published/g, "관련 콘텐츠"],
    [/Content Graph/g, "함께 읽기"],
    [/Submission Types/g, "제보 유형"],
    [/Message Builder/g, "제보 작성"],
    [/Next Stories/g, "다음 글"],
    [/Source Rules/g, "확인 기준"],
    [/News Desk/g, "최신소식"],
    [/출처 상태[\s\S]{0,160}?표시합니다\./g, ""],
    [/출처 상태/g, "확인 기준"],
    [/소셜 레이더/g, "소셜 소식"],
    [/행사 레이더/g, "행사 소식"],
    [/레이더/g, "소식"],
    [/Graph API/g, "공식 연동"],
    [/oEmbed/g, "공개 링크"],
    [/\bRAG\b/g, "자료 아카이브"],
    [/\bqueue\b/gi, "목록"],
    [/\bintake\b/gi, "제보"],
    [/\bradar\b/gi, "소식"],
    [/editorial desk/gi, "편집 노트"],
    [/초보자 가이드자/g, "초보자"],
    [/세부장르을/g, "세부장르를"],
    [/세부장르과/g, "세부장르와"],
    [/댄서 소개은/g, "댄서 소개는"],
    [/댄서 소개을/g, "댄서와 팀을"],
    [/바차타씬/g, "바차타 현장"],
    [/소셜 씬/g, "소셜 현장"],
    [/한국 씬/g, "한국 바차타 현장"]
  ];

  return replacements.reduce((text, [from, to]) => text.replace(from, to), html);
};

export const enhanceHtml = (html, { activePath = "/", noindex = false } = {}) => {
  let output = normalizePublicText(html);
  output = replaceHeader(output, activePath);
  output = ensureBodyClass(output);
  output = ensureSiteAssets(output);
  if (noindex) output = ensureRobots(output, "noindex,nofollow");
  return output;
};
