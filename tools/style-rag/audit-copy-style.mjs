import { createHash } from "node:crypto";
import { all, execSchema, normalize, nowIso, openDb, upsert } from "./lib.mjs";

const hash = (value) => createHash("sha1").update(value).digest("hex").slice(0, 16);

const rules = [
  { re: /Graph API|oEmbed|credential-needed|source health|출처 상태/i, severity: "blocking", message: "공개 카피에 운영/검수 용어가 보입니다." },
  { re: /\bRAG\b|\bqueue\b|\bintake\b|\bradar\b|editorial desk/i, severity: "blocking", message: "독자에게 필요 없는 내부 시스템 용어가 보입니다." },
  { re: /우선 묶|콘텐츠화|검색 신호|소셜 레이더|행사 레이더|브리핑와|소식로|일정와/, severity: "blocking", message: "어색하거나 기계적인 한국어 표현입니다." },
  { re: /Article Library|Published Guide|Content Graph|Message Builder|Submission Types|News Desk|Style Library/i, severity: "blocking", message: "공개 UI에 영어 템플릿 라벨이 남아 있습니다." },
  { re: /검색엔진이 좋아하는|플랫폼으로 성장|깊은 한국어 콘텐츠/, severity: "warning", message: "독자보다 SEO를 먼저 보는 문장입니다." }
];

const sentenceWarnings = (text) => {
  const findings = [];
  const sentences = text.split(/[.!?。？！]|다\.|요\./).map(normalize).filter(Boolean);
  for (const sentence of sentences) {
    if (sentence.length > 170) {
      findings.push({
        severity: "warning",
        message: "문장이 너무 깁니다. 매거진 문체로 읽히게 둘로 나누세요.",
        excerpt: sentence.slice(0, 220)
      });
    }
  }
  return findings;
};

const main = async () => {
  const db = await openDb();
  execSchema(db);
  db.exec("DELETE FROM copy_audit_findings;");
  const now = nowIso();
  const units = all(db, "SELECT id, source_path, text FROM copy_units WHERE visibility = 'public'");
  const findings = [];

  for (const unit of units) {
    for (const rule of rules) {
      const match = unit.text.match(rule.re);
      if (!match) continue;
      const index = Math.max(0, unit.text.indexOf(match[0]) - 90);
      findings.push({
        copyUnitId: unit.id,
        sourcePath: unit.source_path,
        severity: rule.severity,
        message: rule.message,
        excerpt: unit.text.slice(index, index + 240)
      });
    }
    for (const warning of sentenceWarnings(unit.text)) {
      findings.push({
        copyUnitId: unit.id,
        sourcePath: unit.source_path,
        ...warning
      });
    }
  }

  for (const finding of findings) {
    upsert(db, `
      INSERT INTO copy_audit_findings (id, copy_unit_id, severity, message, excerpt, created_at)
      VALUES ($id, $copyUnitId, $severity, $message, $excerpt, $createdAt)
    `, {
      $id: `finding:${hash(`${finding.copyUnitId}:${finding.message}:${finding.excerpt}`)}`,
      $copyUnitId: finding.copyUnitId,
      $severity: finding.severity,
      $message: finding.message,
      $excerpt: finding.excerpt,
      $createdAt: now
    });
  }

  const blocking = findings.filter((finding) => finding.severity === "blocking");
  const report = {
    ok: blocking.length === 0,
    scannedUnits: units.length,
    findings: findings.length,
    blocking: blocking.length,
    samples: findings.slice(0, 20).map(({ sourcePath, severity, message, excerpt }) => ({ sourcePath, severity, message, excerpt }))
  };
  db.close();
  console.log(JSON.stringify(report, null, 2));
  if (blocking.length) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
