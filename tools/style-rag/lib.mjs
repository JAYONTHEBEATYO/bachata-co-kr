import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const dbPath = resolve(root, process.env.STYLE_RAG_DB || "data/.private/style-rag.sqlite");

export const nowIso = () => new Date().toISOString();

export const normalize = (value = "") => String(value)
  .replace(/\s+/g, " ")
  .trim();

export const slugify = (value = "") => normalize(value)
  .toLowerCase()
  .replace(/[^a-z0-9가-힣]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const openDb = async () => {
  await mkdir(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  return db;
};

export const execSchema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reference_sources (
      id TEXT PRIMARY KEY,
      outlet TEXT NOT NULL,
      url TEXT NOT NULL,
      section TEXT,
      title TEXT,
      source_type TEXT NOT NULL DEFAULT 'style-reference',
      fetch_status TEXT NOT NULL DEFAULT 'seed',
      fetched_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS style_observations (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES reference_sources(id) ON DELETE CASCADE,
      headline_shape TEXT,
      lede_strategy TEXT,
      paragraph_cadence TEXT,
      sentence_rhythm TEXT,
      vocabulary_notes TEXT,
      layout_notes TEXT,
      cta_pattern TEXT,
      sample_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS style_rules (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      rule_text TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_runs (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS copy_units (
      id TEXT PRIMARY KEY,
      source_path TEXT NOT NULL,
      json_path TEXT,
      source_type TEXT NOT NULL,
      visibility TEXT NOT NULL,
      copy_owner TEXT NOT NULL,
      title TEXT,
      text TEXT NOT NULL,
      evidence_level TEXT NOT NULL DEFAULT 'owned',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS copy_audit_findings (
      id TEXT PRIMARY KEY,
      copy_unit_id TEXT NOT NULL REFERENCES copy_units(id) ON DELETE CASCADE,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rag_chunks (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      title TEXT,
      url TEXT,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      terms TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      copy_owner TEXT NOT NULL DEFAULT 'site',
      evidence_level TEXT NOT NULL DEFAULT 'owned',
      updated_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(
      title,
      text,
      terms,
      content='rag_chunks',
      content_rowid='rowid'
    );
  `);
};

export const resetFts = (db) => {
  db.exec("INSERT INTO rag_chunks_fts(rag_chunks_fts) VALUES('rebuild');");
};

export const upsert = (db, sql, values) => {
  db.prepare(sql).run(values);
};

export const all = (db, sql, values = {}) => db.prepare(sql).all(values);
export const get = (db, sql, values = {}) => db.prepare(sql).get(values);

export const toJson = (value) => JSON.stringify(value ?? null);

export const stripHtml = (html = "") => normalize(html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'"));

export const tokenize = (text = "") => [...new Set(normalize(text)
  .toLowerCase()
  .split(/[^a-z0-9가-힣]+/u)
  .filter((token) => token.length >= 2))];

export const chunkText = (text, size = 900, overlap = 120) => {
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
