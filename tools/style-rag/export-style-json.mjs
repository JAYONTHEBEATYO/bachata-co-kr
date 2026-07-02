import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { all, execSchema, get, nowIso, openDb } from "./lib.mjs";

const root = resolve(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const styleOutputPath = resolve(root, "data/generated/style-reference-index.json");
const auditOutputPath = resolve(root, "data/generated/copy-style-audit.json");

const main = async () => {
  const db = await openDb();
  execSchema(db);
  const generatedAt = nowIso();

  const references = all(db, `
    SELECT
      rs.id, rs.outlet, rs.url, rs.section, rs.title, rs.fetch_status AS fetchStatus, rs.fetched_at AS fetchedAt,
      so.headline_shape AS headlineShape,
      so.lede_strategy AS ledeStrategy,
      so.paragraph_cadence AS paragraphCadence,
      so.sentence_rhythm AS sentenceRhythm,
      so.vocabulary_notes AS vocabularyNotes,
      so.layout_notes AS layoutNotes,
      so.cta_pattern AS ctaPattern,
      so.sample_count AS sampleCount
    FROM reference_sources rs
    LEFT JOIN style_observations so ON so.source_id = rs.id
    ORDER BY rs.outlet, rs.section
  `);

  const rules = all(db, "SELECT id, label, rule_text AS ruleText, severity FROM style_rules ORDER BY severity, id");
  const auditSummary = get(db, `
    SELECT
      COUNT(*) AS findings,
      SUM(CASE WHEN severity = 'blocking' THEN 1 ELSE 0 END) AS blocking,
      SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) AS warnings
    FROM copy_audit_findings
  `) || { findings: 0, blocking: 0, warnings: 0 };
  const auditFindings = all(db, `
    SELECT cf.id, cu.source_path AS sourcePath, cf.severity, cf.message, cf.excerpt, cf.created_at AS createdAt
    FROM copy_audit_findings cf
    JOIN copy_units cu ON cu.id = cf.copy_unit_id
    ORDER BY CASE cf.severity WHEN 'blocking' THEN 0 ELSE 1 END, cu.source_path
    LIMIT 200
  `);

  const styleIndex = {
    generatedAt,
    policy: {
      storesFullExternalArticleBodies: false,
      note: "외부 매거진은 제목 구조, 레이아웃, 문단 리듬, CTA 방식 같은 관찰값만 저장합니다."
    },
    summary: {
      references: references.length,
      rules: rules.length
    },
    references,
    rules
  };

  const auditIndex = {
    generatedAt,
    ok: Number(auditSummary.blocking || 0) === 0,
    summary: {
      findings: Number(auditSummary.findings || 0),
      blocking: Number(auditSummary.blocking || 0),
      warnings: Number(auditSummary.warnings || 0)
    },
    findings: auditFindings
  };

  await mkdir(dirname(styleOutputPath), { recursive: true });
  await writeFile(styleOutputPath, `${JSON.stringify(styleIndex, null, 2)}\n`, "utf8");
  await writeFile(auditOutputPath, `${JSON.stringify(auditIndex, null, 2)}\n`, "utf8");
  db.close();

  console.log(JSON.stringify({
    ok: true,
    styleOutputPath,
    auditOutputPath,
    references: references.length,
    audit: auditIndex.summary
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
