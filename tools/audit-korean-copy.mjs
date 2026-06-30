import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const scanDirs = [
  ".",
  "data",
  "tools",
  "articles",
  "styles",
  "profiles",
  "programs",
  "community",
  "events",
  "radar",
  "intake",
  "korea-scene",
  "gear",
  "briefs"
];

const allowedFiles = new Set([
  "AGENTS.md",
  "README.md",
  "tools/audit-korean-copy.mjs",
  "tools/verify-build.mjs",
  "tools/collect-scene-signals.mjs",
  "data/generated/source-health.json",
  "data/generated/signal-history.json",
  "data/generated/scene-signals.json"
]);

const checkedExt = new Set([".html", ".json", ".mjs", ".md"]);

const patterns = [
  { re: /우선 묶|콘텐츠화|검색 신호|소셜 레이더|행사 레이더|월별 레이더/, message: "old awkward crawler/editorial phrase" },
  { re: /Graph API|\boEmbed\b|Automation Files|Social Radar|Signal Queue|Priority Queue/, message: "implementation detail exposed in public copy" },
  { re: /검색엔진이 좋아하는|검색 의도|플랫폼으로 성장|깊은 한국어 콘텐츠/, message: "self-referential SEO copy" },
  { re: /영상 임베드 기준|이 프로필에서 볼 포인트|Editorial Angles|Video Note|Posting Check/, message: "template label should be reader-facing Korean" },
  { re: /Bachata Korea Watchlist|Editorial Deck|Editorial Loop|Editorial Method|Editorial Status|Editorial Rules|Editorial Check|Watch Sources|[>"]Watchlist[<"]|Style Library|Program Library|Learning Paths/, message: "English editorial label should be localized for readers" },
  { re: /Korea Scene|Social News|Scene Calendar|Submit Desk|Community Desk|Board Channels|Community Board|Gear hub|Gear Guide|Market Desk|Daily Bachata Report|Korea Directory|Safe Transfer|Dance Jobs/, message: "generic English UI label should be localized" },
  { re: /한국씬|브리프|한국 바차타씬|한국 바차타 씬/, message: "public Korean copy should use domestic reader-facing labels" },
  { re: /한국 검색 맥락를|소식로|일정와|소식가|브리핑와/, message: "Korean particle or spacing error" },
  { re: /core evergreen|Korea \/ Hongdae signal/, message: "internal status leaked to public copy" },
  { re: /콘텐츠의 해상도|번역되는 네트워크|홍보 허브/, message: "AI-like or awkward metaphor" }
];

const walk = async (relativeDir) => {
  const absoluteDir = resolve(root, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const absolutePath = resolve(absoluteDir, entry.name);
    const relativePath = absolutePath.replace(`${root}\\`, "").replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (relativeDir === "." && !scanDirs.includes(entry.name)) continue;
      files.push(...await walk(relativePath));
    } else if (checkedExt.has(extname(entry.name))) {
      files.push(relativePath);
    }
  }
  return files;
};

const unique = (items) => [...new Set(items)];

const main = async () => {
  const files = unique((await Promise.all(scanDirs.map(async (dir) => {
    try {
      return await walk(dir);
    } catch {
      return [];
    }
  }))).flat())
    .filter((file) => !allowedFiles.has(file))
    .filter((file) => !file.startsWith("data/generated/"));

  const findings = [];
  for (const file of files) {
    const text = await readFile(resolve(root, file), "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of patterns) {
        if (pattern.re.test(line)) {
          findings.push({
            file,
            line: index + 1,
            message: pattern.message,
            text: line.trim().slice(0, 220)
          });
        }
      }
    });
  }

  if (findings.length) {
    console.error(JSON.stringify({ ok: false, findings }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ok: true, scannedFiles: files.length }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
