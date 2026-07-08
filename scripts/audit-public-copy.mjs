import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const roots = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx", ".css"]);
const banned = [
  /\bRAG\b/i,
  /\bGraph API\b/i,
  /\boEmbed\b/i,
  /출처 상태/,
  /관찰값/,
  /복사하지 않고/,
  /queue/i,
  /crawl/i,
  /크롤링/
];

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    if (entry.isFile() && extensions.has(path.slice(path.lastIndexOf(".")))) files.push(path);
  }
  return files;
};

const findings = [];
for (const root of roots) {
  for (const file of await walk(root)) {
    const text = await readFile(file, "utf8");
    banned.forEach((pattern) => {
      if (pattern.test(text)) findings.push(`${file}: ${pattern}`);
    });
  }
}

if (findings.length) {
  console.error("Public copy audit failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Public copy audit passed.");
