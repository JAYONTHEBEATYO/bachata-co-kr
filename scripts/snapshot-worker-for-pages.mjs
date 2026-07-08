import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceOrigin = (process.env.SNAPSHOT_SOURCE || "https://bachata-co-kr.bachata-korea.workers.dev").replace(/\/$/, "");
const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "https://bachata.co.kr").replace(/\/$/, "");
const root = process.cwd();

const fetchText = async (pathname) => {
  const response = await fetch(`${sourceOrigin}${pathname}`);
  if (!response.ok) throw new Error(`${response.status} ${pathname}`);
  return response.text();
};

const writeRoute = async (pathname, body) => {
  const target =
    pathname === "/"
      ? path.join(root, "index.html")
      : path.join(root, pathname.replace(/^\//, ""), "index.html");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body, "utf8");
  return path.relative(root, target);
};

const sitemap = await fetchText("/sitemap.xml");
const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => match[1])
  .map((url) => new URL(url).pathname)
  .filter((pathname, index, arr) => arr.indexOf(pathname) === index);

const htmlPaths = ["/", ...sitemapPaths.filter((pathname) => pathname !== "/")];
const written = [];

for (const pathname of htmlPaths) {
  const html = await fetchText(pathname);
  written.push(await writeRoute(pathname, html));
}

await writeFile(path.join(root, "sitemap.xml"), sitemap.replaceAll(sourceOrigin, siteOrigin), "utf8");
await writeFile(path.join(root, "robots.txt"), await fetchText("/robots.txt"), "utf8");
await writeFile(path.join(root, "llms.txt"), await fetchText("/llms.txt"), "utf8");
await writeFile(path.join(root, "CNAME"), "bachata.co.kr\n", "utf8");
await writeFile(path.join(root, ".nojekyll"), "\n", "utf8");

const nextSource = path.join(root, ".open-next", "assets", "_next");
const nextTarget = path.join(root, "_next");
await rm(nextTarget, { recursive: true, force: true });
await cp(nextSource, nextTarget, { recursive: true });

console.log(JSON.stringify({ sourceOrigin, siteOrigin, htmlPages: written.length, written }, null, 2));
