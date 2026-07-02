import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enhanceHtml, isInternalPath, routeFromRelativePath } from "./lib/site-shell.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const htmlRoots = [
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

const walkHtml = async (relativePath, output = []) => {
  const absolutePath = resolve(root, relativePath);
  try {
    const info = await stat(absolutePath);
    if (info.isDirectory()) {
      for (const entry of await readdir(absolutePath)) {
        await walkHtml(`${relativePath}/${entry}`, output);
      }
    } else if (relativePath.endsWith(".html")) {
      output.push(relativePath);
    }
  } catch {
    // Optional output directory.
  }
  return output;
};

const applyToHtml = async (relativePath) => {
  const absolutePath = resolve(root, relativePath);
  const html = await readFile(absolutePath, "utf8");
  const activePath = routeFromRelativePath(relativePath);
  const next = enhanceHtml(html, {
    activePath,
    noindex: isInternalPath(activePath)
  });
  if (next !== html) await writeFile(absolutePath, next, "utf8");
  return next !== html;
};

const cleanSitemap = async () => {
  const sitemapPath = resolve(root, "sitemap.xml");
  let sitemap = await readFile(sitemapPath, "utf8");
  const before = sitemap;
  sitemap = sitemap
    .replace(/  <url>\s*<loc>https?:\/\/test\.bachata\.co\.kr\/<\/loc>[\s\S]*?<\/url>\s*/g, "")
    .replace(/  <url>\s*<loc>https:\/\/bachata\.co\.kr\/(?:desk|health|intake|radar)\/<\/loc>[\s\S]*?<\/url>\s*/g, "");
  if (sitemap !== before) await writeFile(sitemapPath, sitemap, "utf8");
  return sitemap !== before;
};

const main = async () => {
  const files = [...new Set((await Promise.all(htmlRoots.map((item) => walkHtml(item)))).flat())];
  let changed = 0;
  for (const file of files) {
    if (await applyToHtml(file)) changed += 1;
  }
  const sitemapChanged = await cleanSitemap();
  console.log(JSON.stringify({
    ok: true,
    scannedFiles: files.length,
    changedFiles: changed,
    sitemapChanged
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
