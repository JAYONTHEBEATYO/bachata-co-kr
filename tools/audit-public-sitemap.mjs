import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const blocked = [
  "test.bachata.co.kr",
  "https://bachata.co.kr/desk/",
  "https://bachata.co.kr/health/",
  "https://bachata.co.kr/intake/",
  "https://bachata.co.kr/radar/"
];

const required = [
  "https://bachata.co.kr/events/overseas.html",
  "https://bachata.co.kr/briefs/",
  "https://bachata.co.kr/programs/",
  "https://bachata.co.kr/styles/",
  "https://bachata.co.kr/profiles/",
  "https://bachata.co.kr/community/"
];

const main = async () => {
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  const findings = [];
  for (const item of blocked) {
    if (sitemap.includes(item)) findings.push({ type: "blocked-url", url: item });
  }
  for (const item of required) {
    if (!sitemap.includes(item)) findings.push({ type: "missing-url", url: item });
  }

  if (findings.length) {
    console.log(JSON.stringify({ ok: false, findings }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ok: true, checked: { blocked: blocked.length, required: required.length } }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
