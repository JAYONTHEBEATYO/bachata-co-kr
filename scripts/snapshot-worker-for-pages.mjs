import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceOrigin = (process.env.SNAPSHOT_SOURCE || "https://bachata-co-kr.bachata-korea.workers.dev").replace(/\/$/, "");
const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "https://bachata.co.kr").replace(/\/$/, "");
const root = process.cwd();
const snapshotVersion = Date.now().toString();

const fetchText = async (pathname) => {
  const url = new URL(pathname, sourceOrigin);
  url.searchParams.set("_snapshot", snapshotVersion);
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${pathname}`);
  return response.text();
};

const latestSitemap = async () => {
  const localBody = path.join(root, ".next", "server", "app", "sitemap.xml.body");
  try {
    return await readFile(localBody, "utf8");
  } catch {
    return fetchText("/sitemap.xml");
  }
};

const writeRoute = async (pathname, body) => {
  const target =
    pathname === "/"
      ? path.join(root, "index.html")
      : path.join(root, pathname.replace(/^\//, ""), "index.html");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body, "utf8");
  if (pathname !== "/") {
    const route = pathname.replace(/^\/|\/$/g, "");
    const htmlAlias = path.join(root, `${route}.html`);
    try {
      await access(htmlAlias);
      await writeFile(htmlAlias, body, "utf8");
    } catch {
      // Only replace aliases that already exist in the repo.
    }
  }
  return path.relative(root, target);
};

const localHtmlFor = async (pathname) => {
  if (pathname === "/") return null;
  const route = pathname.replace(/^\/|\/$/g, "");
  if (!route) return null;
  const candidate = path.join(root, ".next", "server", "app", `${route}.html`);
  try {
    await access(candidate);
    return readFile(candidate, "utf8");
  } catch {
    return null;
  }
};

const sitemap = await latestSitemap();
const sitemapPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => match[1])
  .map((url) => new URL(url).pathname)
  .filter((pathname, index, arr) => arr.indexOf(pathname) === index);

const htmlPaths = ["/", ...sitemapPaths.filter((pathname) => pathname !== "/")];
const written = [];

for (const pathname of htmlPaths) {
  const html = await localHtmlFor(pathname) || await fetchText(pathname);
  written.push(await writeRoute(pathname, html));
}

await writeFile(path.join(root, "sitemap.xml"), sitemap.replaceAll(sourceOrigin, siteOrigin), "utf8");
await writeFile(path.join(root, "robots.txt"), await fetchText("/robots.txt"), "utf8");
await writeFile(path.join(root, "llms.txt"), await fetchText("/llms.txt"), "utf8");
await writeFile(path.join(root, "CNAME"), "bachata.co.kr\n", "utf8");
await writeFile(path.join(root, ".nojekyll"), "\n", "utf8");

const nextTarget = path.join(root, "_next");
await rm(nextTarget, { recursive: true, force: true });
if (/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::|$)/.test(sourceOrigin)) {
  const nextStaticSource = path.join(root, ".next", "static");
  const nextStaticTarget = path.join(nextTarget, "static");
  await mkdir(nextStaticTarget, { recursive: true });
  await cp(nextStaticSource, nextStaticTarget, { recursive: true });
} else {
  const openNextSource = path.join(root, ".open-next", "assets", "_next");
  await cp(openNextSource, nextTarget, { recursive: true });
}

console.log(JSON.stringify({ sourceOrigin, siteOrigin, htmlPages: written.length, written }, null, 2));
