import { execSchema, nowIso, openDb, upsert } from "./lib.mjs";

const rules = [
  ["reader-first", "독자가 첫 문단만 읽어도 무엇을 얻는지 알아야 한다.", "blocking"],
  ["no-internal-ops", "공개 문장에 RAG, queue, Graph API, oEmbed, source health 같은 운영 용어를 노출하지 않는다.", "blocking"],
  ["magazine-headline", "제목은 키워드를 넣되 검색 문장처럼 쓰지 말고 장면, 질문, 인물, 스타일 중 하나를 앞세운다.", "warning"],
  ["paragraph-rhythm", "문단은 2-5문장 중심으로 자르고, 설명문과 관찰문을 번갈아 배치한다.", "warning"],
  ["source-boundary", "외부 기사와 커뮤니티 글은 복사하지 않고 링크, 짧은 인용, 관찰값, 자체 문장으로만 재구성한다.", "blocking"],
  ["bachata-keywords", "바차타, bachata, 센슈얼, 도미니칸, 소셜, 워크숍, 페스티벌, 댄서 같은 핵심어를 자연스럽게 포함한다.", "warning"]
];

const main = async () => {
  const db = await openDb();
  execSchema(db);
  const now = nowIso();
  for (const [id, label, severity] of rules) {
    upsert(db, `
      INSERT INTO style_rules (id, label, rule_text, severity, created_at, updated_at)
      VALUES ($id, $label, $ruleText, $severity, $now, $now)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        rule_text = excluded.rule_text,
        severity = excluded.severity,
        updated_at = excluded.updated_at
    `, {
      $id: id,
      $label: label,
      $ruleText: label,
      $severity: severity,
      $now: now
    });
  }
  db.close();
  console.log(JSON.stringify({ ok: true, rules: rules.length }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
