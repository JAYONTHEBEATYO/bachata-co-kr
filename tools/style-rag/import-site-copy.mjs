import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chunkText, execSchema, normalize, nowIso, openDb, resetFts, stripHtml, tokenize, upsert } from "./lib.mjs";

const jsonSources = [
  "data/home-rail.json",
  "data/articles.json",
  "data/style-guides.json",
  "data/profiles.json",
  "data/programs.json",
  "data/events.json",
  "data/board.json",
  "data/submissions.json",
  "data/gear.json",
  "data/knowledge-notes.json"
];

const htmlRoots = [
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

const hash = (value) => createHash("sha1").update(value).digest("hex").slice(0, 16);

const root = resolve(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const extractJsonStrings = (value, path = "$", out = []) => {
  if (value == null) return out;
  if (typeof value === "string" || typeof value === "number") {
    const text = normalize(value);
    if (text.length >= 8 && !/^https?:\/\//.test(text) && !text.startsWith("mailto:")) {
      out.push({ jsonPath: path, text });
    }
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => extractJsonStrings(item, `${path}[${index}]`, out));
    return out;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      if (["url", "href", "sourceUrl", "embedUrl", "image", "thumbnail"].includes(key)) return;
      extractJsonStrings(item, `${path}.${key}`, out);
    });
  }
  return out;
};

const walkHtml = async (relativePath, out = []) => {
  const absolutePath = resolve(root, relativePath);
  try {
    const info = await stat(absolutePath);
    if (info.isDirectory()) {
      for (const entry of await readdir(absolutePath)) {
        await walkHtml(`${relativePath}/${entry}`, out);
      }
    } else if (extname(relativePath) === ".html") {
      out.push(relativePath);
    }
  } catch {
    // Optional generated folder.
  }
  return out;
};

const insertCopyUnit = (db, unit) => {
  upsert(db, `
    INSERT INTO copy_units (
      id, source_path, json_path, source_type, visibility, copy_owner,
      title, text, evidence_level, updated_at
    )
    VALUES (
      $id, $sourcePath, $jsonPath, $sourceType, $visibility, $copyOwner,
      $title, $text, $evidenceLevel, $updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      source_path = excluded.source_path,
      json_path = excluded.json_path,
      source_type = excluded.source_type,
      visibility = excluded.visibility,
      copy_owner = excluded.copy_owner,
      title = excluded.title,
      text = excluded.text,
      evidence_level = excluded.evidence_level,
      updated_at = excluded.updated_at
  `, {
    $id: unit.id,
    $sourcePath: unit.sourcePath,
    $jsonPath: unit.jsonPath || null,
    $sourceType: unit.sourceType,
    $visibility: unit.visibility,
    $copyOwner: unit.copyOwner,
    $title: unit.title || null,
    $text: unit.text,
    $evidenceLevel: unit.evidenceLevel,
    $updatedAt: unit.updatedAt
  });
};

const insertChunk = (db, unit, chunk, index) => {
  const chunkId = `${unit.id}#${index + 1}`;
  const terms = tokenize(`${unit.title || ""} ${chunk}`).join(" ");
  upsert(db, `
    INSERT INTO rag_chunks (
      id, source_id, source_type, title, url, chunk_index, text, terms,
      visibility, copy_owner, evidence_level, updated_at
    )
    VALUES (
      $id, $sourceId, $sourceType, $title, $url, $chunkIndex, $text, $terms,
      $visibility, $copyOwner, $evidenceLevel, $updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      source_type = excluded.source_type,
      title = excluded.title,
      url = excluded.url,
      chunk_index = excluded.chunk_index,
      text = excluded.text,
      terms = excluded.terms,
      visibility = excluded.visibility,
      copy_owner = excluded.copy_owner,
      evidence_level = excluded.evidence_level,
      updated_at = excluded.updated_at
  `, {
    $id: chunkId,
    $sourceId: unit.id,
    $sourceType: unit.sourceType,
    $title: unit.title || null,
    $url: unit.url || null,
    $chunkIndex: index,
    $text: chunk,
    $terms: terms,
    $visibility: unit.visibility,
    $copyOwner: unit.copyOwner,
    $evidenceLevel: unit.evidenceLevel,
    $updatedAt: unit.updatedAt
  });
};

const main = async () => {
  const db = await openDb();
  execSchema(db);
  db.exec("DELETE FROM copy_units;");
  db.exec("DELETE FROM rag_chunks;");
  const now = nowIso();
  let units = 0;
  let chunks = 0;

  for (const relativePath of jsonSources) {
    const data = JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
    const strings = extractJsonStrings(data);
    for (const item of strings) {
      const unit = {
        id: `json:${relativePath}:${hash(item.jsonPath + item.text)}`,
        sourcePath: relativePath,
        jsonPath: item.jsonPath,
        sourceType: "owned-json-copy",
        visibility: "public",
        copyOwner: "site",
        title: relativePath,
        text: item.text,
        evidenceLevel: "owned",
        updatedAt: now
      };
      insertCopyUnit(db, unit);
      units += 1;
      for (const [index, chunk] of chunkText(item.text, 700, 80).entries()) {
        insertChunk(db, unit, chunk, index);
        chunks += 1;
      }
    }
  }

  const htmlFiles = [...new Set((await Promise.all(htmlRoots.map((rootPath) => walkHtml(rootPath)))).flat())];
  for (const relativePath of htmlFiles) {
    const html = await readFile(resolve(root, relativePath), "utf8");
    const text = stripHtml(html);
    if (text.length < 40) continue;
    const unit = {
      id: `html:${relativePath}`,
      sourcePath: relativePath,
      jsonPath: null,
      sourceType: "owned-html-page",
      visibility: "public",
      copyOwner: "site",
      title: relativePath,
      text,
      evidenceLevel: "owned",
      updatedAt: now,
      url: `/${relativePath.replace(/index\.html$/, "").replace(/\\/g, "/")}`
    };
    insertCopyUnit(db, unit);
    units += 1;
    for (const [index, chunk] of chunkText(text).entries()) {
      insertChunk(db, unit, chunk, index);
      chunks += 1;
    }
  }

  resetFts(db);
  db.close();
  console.log(JSON.stringify({ ok: true, units, chunks }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
