import { createHash } from "node:crypto";
import { execSchema, normalize, nowIso, openDb, stripHtml, upsert } from "./lib.mjs";
import { referenceSources } from "./reference-sources.mjs";

const hash = (value) => createHash("sha1").update(value).digest("hex").slice(0, 12);

const extractTag = (html, tag) => {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
};

const extractMetaTitle = (html) => {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const title = extractTag(html, "title");
  return normalize(og?.[1] || title);
};

const analyzeHtml = (source, html) => {
  const text = stripHtml(html);
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((item) => item.length >= 20)
    .slice(0, 40);
  const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)
    .slice(0, 12);
  const avgParagraph = paragraphs.length
    ? Math.round(paragraphs.reduce((sum, item) => sum + item.length, 0) / paragraphs.length)
    : 0;
  const shortParagraphs = paragraphs.filter((item) => item.length < 90).length;
  const longParagraphs = paragraphs.filter((item) => item.length > 180).length;

  return {
    title: extractMetaTitle(html) || source.fallbackTitle,
    headlineShape: headings.length
      ? `대표 제목 ${headings.slice(0, 3).map((item) => `「${item.slice(0, 36)}」`).join(", ")}처럼 대상과 관점을 함께 둔다.`
      : source.fallbackObservation.headlineShape,
    ledeStrategy: source.fallbackObservation.ledeStrategy,
    paragraphCadence: avgParagraph
      ? `분석 대상 문단 ${paragraphs.length}개, 평균 ${avgParagraph}자. 짧은 문단 ${shortParagraphs}개와 긴 문단 ${longParagraphs}개를 섞는다.`
      : source.fallbackObservation.paragraphCadence,
    sentenceRhythm: source.fallbackObservation.sentenceRhythm,
    vocabularyNotes: source.fallbackObservation.vocabularyNotes,
    layoutNotes: source.fallbackObservation.layoutNotes,
    ctaPattern: source.fallbackObservation.ctaPattern,
    sampleCount: Math.max(paragraphs.length, headings.length, text ? 1 : 0)
  };
};

const fetchHtml = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "bachata.co.kr style-reference-bot/1.0 (+https://bachata.co.kr/)"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const main = async () => {
  const db = await openDb();
  execSchema(db);
  const now = nowIso();
  const runId = `style-run-${now.slice(0, 10)}-${hash(now)}`;
  upsert(db, "INSERT INTO weekly_runs (id, started_at, status, notes) VALUES ($id, $now, 'running', 'style reference ingest')", {
    $id: runId,
    $now: now
  });

  const results = [];
  for (const source of referenceSources) {
    let status = "fallback";
    let observation = { title: source.fallbackTitle, ...source.fallbackObservation, sampleCount: 0 };
    try {
      const html = await fetchHtml(source.url);
      observation = analyzeHtml(source, html);
      status = "ok";
    } catch (error) {
      observation.error = error.message;
    }

    upsert(db, `
      INSERT INTO reference_sources (id, outlet, url, section, title, source_type, fetch_status, fetched_at, created_at, updated_at)
      VALUES ($id, $outlet, $url, $section, $title, 'style-reference', $status, $now, $now, $now)
      ON CONFLICT(id) DO UPDATE SET
        outlet = excluded.outlet,
        url = excluded.url,
        section = excluded.section,
        title = excluded.title,
        fetch_status = excluded.fetch_status,
        fetched_at = excluded.fetched_at,
        updated_at = excluded.updated_at
    `, {
      $id: source.id,
      $outlet: source.outlet,
      $url: source.url,
      $section: source.section,
      $title: observation.title,
      $status: status,
      $now: now
    });

    upsert(db, `
      INSERT INTO style_observations (
        id, source_id, headline_shape, lede_strategy, paragraph_cadence, sentence_rhythm,
        vocabulary_notes, layout_notes, cta_pattern, sample_count, created_at, updated_at
      )
      VALUES (
        $id, $sourceId, $headlineShape, $ledeStrategy, $paragraphCadence, $sentenceRhythm,
        $vocabularyNotes, $layoutNotes, $ctaPattern, $sampleCount, $now, $now
      )
      ON CONFLICT(id) DO UPDATE SET
        headline_shape = excluded.headline_shape,
        lede_strategy = excluded.lede_strategy,
        paragraph_cadence = excluded.paragraph_cadence,
        sentence_rhythm = excluded.sentence_rhythm,
        vocabulary_notes = excluded.vocabulary_notes,
        layout_notes = excluded.layout_notes,
        cta_pattern = excluded.cta_pattern,
        sample_count = excluded.sample_count,
        updated_at = excluded.updated_at
    `, {
      $id: `obs-${source.id}`,
      $sourceId: source.id,
      $headlineShape: observation.headlineShape,
      $ledeStrategy: observation.ledeStrategy,
      $paragraphCadence: observation.paragraphCadence,
      $sentenceRhythm: observation.sentenceRhythm,
      $vocabularyNotes: observation.vocabularyNotes,
      $layoutNotes: observation.layoutNotes,
      $ctaPattern: observation.ctaPattern,
      $sampleCount: observation.sampleCount || 0,
      $now: now
    });

    results.push({ id: source.id, outlet: source.outlet, status, sampleCount: observation.sampleCount || 0 });
  }

  upsert(db, "UPDATE weekly_runs SET finished_at = $now, status = 'ok', notes = $notes WHERE id = $id", {
    $id: runId,
    $now: nowIso(),
    $notes: JSON.stringify(results)
  });

  db.close();
  console.log(JSON.stringify({ ok: true, runId, references: results }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
