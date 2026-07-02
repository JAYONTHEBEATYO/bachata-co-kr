import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "data/generated/knowledge-index.json");

const sources = [
  { path: "data/articles.json", type: "article", collectionKey: "articles", urlPrefix: "/articles/", slugKey: "slug" },
  { path: "data/programs.json", type: "program", collectionKey: "programs", urlPrefix: "/programs/", slugKey: "id" },
  { path: "data/style-guides.json", type: "style-guide", collectionKey: "guides", urlPrefix: "/styles/", slugKey: "id" },
  { path: "data/profiles.json", type: "profile", collectionKey: "profiles", urlPrefix: "/profiles/", slugKey: "id" },
  { path: "data/events.json", type: "event", collectionKey: "radar", urlPrefix: "/events/", slugKey: "id" },
  { path: "data/korea-scene.json", type: "korea-scene", collectionKey: "lenses", urlPrefix: "/korea-scene/", slugKey: "id" },
  { path: "data/board.json", type: "community", collectionKey: "entries", urlPrefix: "/community/", slugKey: "id" },
  { path: "data/gear.json", type: "gear", collectionKey: "products", urlPrefix: "/gear/", slugKey: "id" },
  { path: "data/home-rail.json", type: "home", collectionKey: null, urlPrefix: "/", slugKey: "updatedAt" },
  { path: "data/editorial-desk.json", type: "editorial-plan", collectionKey: null, urlPrefix: "/desk/", slugKey: "updatedAt", visibility: "internal" },
  { path: "data/knowledge-notes.json", type: "knowledge-note", collectionKey: "notes", urlPrefix: "/docs/content-rag.html", slugKey: "id", visibility: "internal" },
  { path: "data/generated/style-reference-index.json", type: "style-reference", collectionKey: "references", urlPrefix: "/data/generated/style-reference-index.json#", slugKey: "id", copyOwner: "external-style-observation", evidenceLevel: "style-analysis", optional: true },
  { path: "data/generated/copy-style-audit.json", type: "copy-style-audit", collectionKey: "findings", urlPrefix: "/data/generated/copy-style-audit.json#", slugKey: "id", visibility: "internal", optional: true }
];

const readJson = async (relativePath) => JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
const optionalReadJson = async (relativePath) => {
  try {
    return await readJson(relativePath);
  } catch {
    return null;
  }
};

const normalize = (value = "") => String(value)
  .replace(/\s+/g, " ")
  .trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const unique = (items) => [...new Set(items.filter(Boolean))];

const extractStrings = (value, output = []) => {
  if (value == null) return output;
  if (typeof value === "string" || typeof value === "number") {
    const text = normalize(value);
    if (text) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractStrings(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      if (["url", "href", "sourceUrl", "embedUrl", "image", "thumbnail"].includes(key)) return;
      extractStrings(item, output);
    });
  }
  return output;
};

const extractUrls = (value, output = []) => {
  if (value == null) return output;
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractUrls(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => extractUrls(item, output));
  }
  return output;
};

const titleOf = (item, fallback) => item.title || item.name || item.label || item.heading || fallback;

const slugOf = (item, key, fallback) => normalize(item[key] || item.slug || item.id || fallback)
  .toLowerCase()
  .replace(/[^a-z0-9가-힣]+/g, "-")
  .replace(/^-+|-+$/g, "") || fallback;

const urlOf = (item, source, slug) => {
  if (item.url) return item.url;
  if (source.urlPrefix === "/") return "/";
  if (source.urlPrefix.includes("#")) return `${source.urlPrefix}${slug}`;
  if (source.urlPrefix.endsWith(".html")) return source.urlPrefix;
  return `${source.urlPrefix}${slug}.html`;
};

const keywordsOf = (item, source) => unique([
  source.type,
  ...(item.keywords || []),
  ...(item.tags || []),
  item.category,
  item.status,
  item.city,
  item.location
].map((value) => normalize(value)));

const chunkText = (text, size = 850, overlap = 120) => {
  const clean = normalize(text);
  if (!clean) return [];
  const chunks = [];
  let index = 0;
  while (index < clean.length) {
    const end = Math.min(clean.length, index + size);
    let sliceEnd = end;
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(" ", end);
      if (lastSpace > index + Math.floor(size * 0.55)) sliceEnd = lastSpace;
    }
    chunks.push(clean.slice(index, sliceEnd).trim());
    if (sliceEnd >= clean.length) break;
    index = Math.max(0, sliceEnd - overlap);
  }
  return chunks;
};

const buildDocument = (item, source, index, jsonPath) => {
  const slug = slugOf(item, source.slugKey, `${source.type}-${index + 1}`);
  const title = titleOf(item, `${source.type} ${index + 1}`);
  const strings = unique(extractStrings(item));
  const text = normalize(strings.join(" "));
  const keywords = keywordsOf(item, source);
  const urls = unique(extractUrls(item));

  return {
    id: `${source.type}:${slug}`,
    type: source.type,
    sourceType: source.type,
    sourcePath: source.path,
    jsonPath,
    visibility: source.visibility || "public",
    copyOwner: source.copyOwner || "site",
    evidenceLevel: item.evidenceLevel || source.evidenceLevel || "owned",
    title,
    slug,
    url: urlOf(item, source, slug),
    updatedAt: item.updatedAt || item.publishedAt || item.startDate || null,
    keywords,
    sourceUrls: urls,
    text
  };
};

const tokenize = (text) => unique(normalize(text)
  .toLowerCase()
  .split(/[^a-z0-9가-힣]+/u)
  .filter((token) => token.length >= 2));

const main = async () => {
  const documents = [];

  for (const source of sources) {
    const data = source.optional ? await optionalReadJson(source.path) : await readJson(source.path);
    if (!data) continue;
    const items = source.collectionKey ? (data[source.collectionKey] || []) : [data];
    items.forEach((item, index) => {
      const jsonPath = source.collectionKey ? `$.${source.collectionKey}[${index}]` : "$";
      const doc = buildDocument(item, source, index, jsonPath);
      if (doc.text.length >= 40) documents.push(doc);
    });
  }

  const chunks = documents.flatMap((doc) => chunkText(doc.text).map((text, index) => ({
    id: `${doc.id}#${index + 1}`,
    documentId: doc.id,
    type: doc.type,
    sourceType: doc.sourceType,
    sourcePath: doc.sourcePath,
    jsonPath: doc.jsonPath,
    visibility: doc.visibility,
    copyOwner: doc.copyOwner,
    evidenceLevel: doc.evidenceLevel,
    title: doc.title,
    url: doc.url,
    chunkIndex: index,
    keywords: doc.keywords,
    terms: tokenize(`${doc.title} ${doc.keywords.join(" ")} ${text}`),
    text
  })));

  const typeCounts = documents.reduce((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {});

  const index = {
    generatedAt: new Date().toISOString(),
    version: 1,
    purpose: "Local retrieval index for bachata.co.kr content editing, Korean copy review, and future article drafting.",
    summary: {
      documents: documents.length,
      chunks: chunks.length,
      typeCounts
    },
    writingRules: documents
      .filter((doc) => doc.type === "knowledge-note")
      .map((doc) => ({ id: doc.id, title: doc.title, url: doc.url, keywords: doc.keywords })),
    documents: documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      sourceType: doc.sourceType,
      sourcePath: doc.sourcePath,
      jsonPath: doc.jsonPath,
      visibility: doc.visibility,
      copyOwner: doc.copyOwner,
      evidenceLevel: doc.evidenceLevel,
      title: doc.title,
      slug: doc.slug,
      url: doc.url,
      updatedAt: doc.updatedAt,
      keywords: doc.keywords,
      sourceUrls: doc.sourceUrls,
      length: doc.text.length
    })),
    chunks
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputPath}`);
  console.log(JSON.stringify(index.summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
