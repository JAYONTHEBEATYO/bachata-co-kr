import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const buildRoot = join(root, ".next", "server", "app");
const banned = [
  { pattern: />\s*(?:Hot|New|Top|Rising)\s*</g, reason: "영문 정렬 탭이 남아 있음" },
  { pattern: /원문은 복사하지 않고|공개 링크와 관찰값|출처 상태|정상 링크/g, reason: "내부 편집 문구가 노출됨" },
  { pattern: /Graph API|\boEmbed\b|\bRAG\b|\bqueue\b/gi, reason: "내부 기술 용어가 노출됨" },
  { pattern: /\uFFFD/g, reason: "문자 인코딩이 깨짐" },
  { pattern: /\?{4,}/g, reason: "물음표로 깨진 문장이 남아 있음" }
];

if (!existsSync(buildRoot)) {
  console.error("빌드 결과가 없습니다. npm run build를 먼저 실행하세요.");
  process.exit(1);
}

const htmlFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    if (stat.isFile() && name.endsWith(".html")) htmlFiles.push(full);
  }
}
walk(buildRoot);

const findings = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const rule of banned) {
    rule.pattern.lastIndex = 0;
    const match = rule.pattern.exec(html);
    if (!match) continue;
    findings.push(`${relative(root, file)}: ${rule.reason} (${match[0]})`);
  }
}

if (findings.length) {
  console.error("빌드 HTML 감사에 실패했습니다.");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`빌드 HTML 감사를 통과했습니다. (${htmlFiles.length}개 파일)`);
