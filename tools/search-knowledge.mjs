import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "data/generated/knowledge-index.json");

const normalize = (value = "") => String(value).replace(/\s+/g, " ").trim();

const tokenize = (text) => normalize(text)
  .toLowerCase()
  .split(/[^a-z0-9가-힣]+/u)
  .filter((token) => token.length >= 2);

const scoreChunk = (chunk, terms) => {
  const haystack = `${chunk.title} ${chunk.keywords.join(" ")} ${chunk.text}`.toLowerCase();
  return terms.reduce((score, term) => {
    if (!haystack.includes(term)) return score;
    const titleBonus = chunk.title.toLowerCase().includes(term) ? 4 : 0;
    const keywordBonus = chunk.keywords.some((keyword) => keyword.toLowerCase().includes(term)) ? 3 : 0;
    return score + 1 + titleBonus + keywordBonus;
  }, 0);
};

const main = async () => {
  const query = normalize(process.argv.slice(2).join(" "));
  if (!query) {
    console.error("Usage: node tools/search-knowledge.mjs <query>");
    process.exitCode = 1;
    return;
  }

  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const terms = tokenize(query);
  const results = index.chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  console.log(`Query: ${query}`);
  console.log(`Index: ${index.summary.documents} documents, ${index.summary.chunks} chunks`);
  console.log("");

  for (const { chunk, score } of results) {
    console.log(`[${score}] ${chunk.title}`);
    console.log(`${chunk.type} | ${chunk.url} | ${chunk.id}`);
    console.log(`${chunk.text.slice(0, 260)}${chunk.text.length > 260 ? "..." : ""}`);
    console.log("");
  }

  if (!results.length) {
    console.log("No matching chunks.");
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
