import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteUrl = "https://bachata.co.kr";

const activePages = new Set([
  "index.html",
  "videos/index.html",
  "events/index.html",
  "guide/index.html",
  "dancers/index.html",
  "write/index.html",
  "c/hot/index.html",
  "c/video/index.html",
  "c/events/index.html",
  "c/questions/index.html",
  "c/dancers/index.html",
  "c/guide/index.html",
  "t/1001/bachata-basic-first-watch/index.html",
  "t/1002/bachata-influence-melvin-gatica-points/index.html",
  "t/1003/korea-social-video-watch-points/index.html",
  "t/1004/sensual-vs-dominican-bachata/index.html",
  "t/1005/festival-calendar-july-2026/index.html",
  "t/1006/overseas-festival-before-booking/index.html",
  "t/1007/first-social-etiquette/index.html",
  "t/1008/korke-judith-16-fundamentals/index.html"
]);

const pageFilesForPathname = (pathname) => {
  const normalized = pathname.replace(/^\/|\/$/g, "");
  if (!normalized) return ["index.html"];
  return [`${normalized}/index.html`, `${normalized}.html`];
};

try {
  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
    for (const file of pageFilesForPathname(new URL(match[1]).pathname)) {
      activePages.add(file);
    }
  }
} catch {
  // The static snapshot writes sitemap.xml before this script. If it is absent,
  // keep the conservative hand-maintained list above.
}

const threadTargets = [
  [/sensual|korke|judith|fundamentals/i, "/t/1008/korke-judith-16-fundamentals/"],
  [/influence|melvin|gatica/i, "/t/1002/bachata-influence-melvin-gatica-points/"],
  [/dominican|rhythm|footwork|style/i, "/t/1004/sensual-vs-dominican-bachata/"],
  [/basic|starter|beginner|program/i, "/t/1001/bachata-basic-first-watch/"],
  [/social|scene|korea/i, "/t/1003/korea-social-video-watch-points/"],
  [/festival|event|cadiz|geneva|summer|seoul/i, "/events/"],
  [/profile|dancer|gray|loren|kike|judith|emilien|tehina|ataca|alemana|sara|melvin|gatica/i, "/dancers/"],
  [/community|board|free|anonymous|jobs|promo|transfer|market|venues/i, "/c/hot/"],
  [/brief|radar|health|desk|intake|submit/i, "/"],
  [/gear|shoes|fuego|on1|pana|pulse|bachazouk/i, "/guide/"]
];

const targetFor = (file) => {
  const normalized = file.replaceAll("\\", "/");
  for (const [pattern, target] of threadTargets) {
    if (pattern.test(normalized)) return target;
  }
  if (normalized.startsWith("profiles/")) return "/dancers/";
  if (normalized.startsWith("events/")) return "/events/";
  if (normalized.startsWith("styles/") || normalized.startsWith("programs/")) return "/guide/";
  if (normalized.startsWith("articles/")) return "/c/guide/";
  return "/";
};

const redirectHtml = (target) => `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <meta http-equiv="refresh" content="0; url=${target}">
  <link rel="canonical" href="${siteUrl}${target}">
  <title>바차타 코리아로 이동합니다</title>
  <script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>
  <main>
    <h1>바차타 코리아로 이동합니다</h1>
    <p>새 커뮤니티 화면에서 이어서 볼 수 있습니다.</p>
    <p><a href="${target}">바로 이동하기</a></p>
  </main>
</body>
</html>
`;

const files = execFileSync("git", ["ls-files", "*.html"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replaceAll("\\", "/"));

let count = 0;
for (const file of files) {
  if (activePages.has(file)) continue;
  const target = targetFor(file);
  const absolutePath = path.join(root, file);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, redirectHtml(target), "utf8");
  count += 1;
}

console.log(`Wrote ${count} legacy redirects.`);
