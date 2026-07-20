import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx"]);
const banned = [
  { pattern: /원문은 복사하지 않고|공개 링크와 관찰값/, reason: "편집 과정이 독자용 문장에 노출됨" },
  { pattern: /출처 상태|정상 링크|깨진 링크는 공개 전에/, reason: "운영용 출처 상태가 독자용 문장에 노출됨" },
  { pattern: /콘텐츠화하기 좋은|우선 묶습니다|한국어권 초보자/, reason: "부자연스러운 AI 문장이 남아 있음" },
  { pattern: /Graph API|\boEmbed\b|\bRAG\b|\bqueue\b/i, reason: "내부 기술 용어가 독자용 문장에 노출됨" },
  { pattern: /\uFFFD/, reason: "문자 인코딩이 깨짐" },
  { pattern: /\?{4,}/, reason: "물음표로 깨진 문장이 남아 있음" }
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    if (entry.isFile() && extensions.has(extname(path))) files.push(path);
  }
  return files;
}

const findings = [];
for (const sourceRoot of sourceRoots) {
  for (const file of await walk(join(root, sourceRoot))) {
    const source = await readFile(file, "utf8");
    for (const rule of banned) {
      if (!rule.pattern.test(source)) continue;
      findings.push(`${relative(root, file)}: ${rule.reason}`);
    }
  }
}

if (findings.length) {
  console.error("공개 문구 감사에 실패했습니다.");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("공개 문구 감사를 통과했습니다.");
