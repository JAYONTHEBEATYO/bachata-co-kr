import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const roots = [
  "index.html",
  "articles",
  "briefs",
  "community",
  "desk",
  "events",
  "gear",
  "health",
  "intake",
  "korea-scene",
  "profiles",
  "programs",
  "radar",
  "styles",
  "submit"
];

const blocked = [
  /Graph API/i,
  /oEmbed/i,
  /credential-needed/i,
  /watchlist/i,
  /candidate/i,
  /\bsignal\b/i,
  /\bradar\b/i,
  /\bintake\b/i,
  /editorial desk/i,
  /\bqueue\b/i,
  /data\//i,
  /\.json/i,
  /검수/,
  /신호/,
  /후보/,
  /워치/,
  /큐/,
  /레이더/,
  /허브/,
  /콘텐츠화/,
  /우선 묶/
];

const walk = async (relativePath, out = []) => {
  const absolutePath = resolve(root, relativePath);
  try {
    const info = await stat(absolutePath);
    if (info.isDirectory()) {
      const entries = await readdir(absolutePath);
      for (const entry of entries) {
        await walk(`${relativePath}/${entry}`, out);
      }
    } else if (relativePath.endsWith(".html")) {
      out.push(relativePath);
    }
  } catch {
    // Optional generated folders may not exist yet.
  }
  return out;
};

const visibleText = (html = "") => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, " ")
  .trim();

const main = async () => {
  const files = [...new Set((await Promise.all(roots.map((item) => walk(item)))).flat())];
  const findings = [];

  for (const file of files) {
    const text = visibleText(await readFile(resolve(root, file), "utf8"));
    for (const pattern of blocked) {
      const index = text.search(pattern);
      if (index >= 0) {
        findings.push({
          file,
          pattern: String(pattern),
          excerpt: text.slice(Math.max(0, index - 80), index + 160)
        });
        break;
      }
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
