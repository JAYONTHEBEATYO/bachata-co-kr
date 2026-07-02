import { all, execSchema, normalize, openDb } from "./lib.mjs";

const query = normalize(process.argv.slice(2).join(" "));

if (!query) {
  console.error("Usage: node tools/style-rag/search-style.mjs <query>");
  process.exit(1);
}

const main = async () => {
  const db = await openDb();
  execSchema(db);
  const rows = all(db, `
    SELECT rc.id, rc.source_type AS sourceType, rc.title, rc.url, snippet(rag_chunks_fts, 1, '[', ']', '...', 12) AS snippet
    FROM rag_chunks_fts
    JOIN rag_chunks rc ON rc.rowid = rag_chunks_fts.rowid
    WHERE rag_chunks_fts MATCH $query
    LIMIT 12
  `, { $query: query });
  db.close();
  console.log(JSON.stringify({ query, results: rows }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
