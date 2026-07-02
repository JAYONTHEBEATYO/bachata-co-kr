import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COMMUNITY_NAV, PUBLIC_NAV } from "./lib/site-shell.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const publicRoots = [
  "index.html",
  "articles",
  "briefs",
  "community",
  "events",
  "gear",
  "korea-scene",
  "profiles",
  "programs",
  "styles",
  "submit"
];

const walkHtml = async (relativePath, out = []) => {
  const absolutePath = resolve(root, relativePath);
  try {
    const info = await stat(absolutePath);
    if (info.isDirectory()) {
      for (const entry of await readdir(absolutePath)) {
        await walkHtml(`${relativePath}/${entry}`, out);
      }
    } else if (relativePath.endsWith(".html")) {
      out.push(relativePath);
    }
  } catch {
    // Optional generated folder.
  }
  return out;
};

const navLabels = [...PUBLIC_NAV.map((item) => item.label), "커뮤니티", ...COMMUNITY_NAV.map((item) => item.label)];

const main = async () => {
  const files = [...new Set((await Promise.all(publicRoots.map((item) => walkHtml(item)))).flat())];
  const findings = [];

  for (const file of files) {
    const html = await readFile(resolve(root, file), "utf8");
    if (!html.includes("/assets/site.css")) findings.push({ file, message: "missing shared stylesheet" });
    if (!html.includes("class=\"site-shell\"")) findings.push({ file, message: "missing site-shell body class" });
    if (!html.includes("class=\"bk-site-header\"")) findings.push({ file, message: "missing shared header" });
    for (const label of navLabels) {
      if (!html.includes(label)) findings.push({ file, message: `missing nav label: ${label}` });
    }
  }

  if (findings.length) {
    console.log(JSON.stringify({ ok: false, findings }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ok: true, scannedFiles: files.length }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
