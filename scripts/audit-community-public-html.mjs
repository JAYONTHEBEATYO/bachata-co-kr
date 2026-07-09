import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", ".next", ".open-next", ".wrangler", "node_modules"]);

const bannedPatterns = [
  {
    pattern: /와 바차타 개꿀이야/g,
    reason: "글쓰기 기본 예시 제목이 공개 HTML에 남아 있습니다."
  },
  {
    pattern: /오늘의 미션|흩어진 바차타 영상/g,
    reason: "초기 목업용 미션 카피가 공개 HTML에 남아 있습니다."
  },
  {
    pattern: /(?:1,280|920|760|640|530|680)\s*명/g,
    reason: "목업 회원 수가 공개 HTML에 남아 있습니다."
  },
  {
    pattern: /댓글\s+(?:[1-9]\d*)/g,
    reason: "정적 seed의 가짜 댓글 수가 공개 HTML에 남아 있을 수 있습니다."
  },
  {
    pattern: />\s*(?:Hot|New|Top|Rising)\s*</g,
    reason: "영문 정렬 탭이 공개 HTML에 남아 있습니다."
  },
  {
    pattern: /Graph API|oEmbed|RAG|queue|출처 상태|깨진 링크/g,
    reason: "내부 운영/수집 용어가 공개 HTML에 노출되었습니다."
  },
  {
    pattern: /\uFFFD/g,
    reason: "깨진 문자 replacement character가 공개 HTML에 있습니다."
  }
];

const htmlFiles = [];

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
      continue;
    }
    if (name.endsWith(".html")) htmlFiles.push(full);
  }
};

walk(root);

const findings = [];

for (const file of htmlFiles) {
  const text = readFileSync(file, "utf8");
  for (const rule of bannedPatterns) {
    rule.pattern.lastIndex = 0;
    const matches = [...text.matchAll(rule.pattern)];
    if (!matches.length) continue;
    findings.push({
      file: relative(root, file),
      reason: rule.reason,
      sample: matches.slice(0, 3).map((match) => match[0]).join(", ")
    });
  }
}

if (findings.length) {
  console.error("Public community HTML audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.reason} (${finding.sample})`);
  }
  process.exit(1);
}

console.log(`Public community HTML audit passed (${htmlFiles.length} HTML files checked).`);
