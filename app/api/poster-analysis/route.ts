import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import {
  getCommunityContext,
  hasTrustedRequestOrigin,
  jsonHeaders,
  requestFingerprint
} from "@/lib/community-server";
import {
  buildPosterDraft,
  normalizePosterFields,
  posterAnalysisSchema,
  posterCategoryLabel,
  type PosterAnalysisResult
} from "@/lib/poster-analysis";

type R2ObjectBody = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
};

type R2BucketBinding = {
  get: (key: string) => Promise<R2ObjectBody | null>;
};

type UploadRow = {
  objectKey: string;
  byteSize: number;
  contentType: string;
};

type CachedAnalysisRow = {
  id: string;
  resultJson: string;
  ocrText: string;
};

type MarkdownConversionResult = {
  format?: string;
  data?: string;
  error?: string;
};

const model = "@cf/zai-org/glm-4.7-flash";
const allowedCategories = new Set(["events", "promotion"]);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxAnalysisBytes = 8 * 1024 * 1024;
const hourlyUserLimit = 3;
const dailyUserLimit = 10;
const dailySiteLimit = 100;

const respond = (request: NextRequest, status: number, body: unknown) => (
  Response.json(body, {
    status,
    headers: jsonHeaders(request, "POST,OPTIONS")
  })
);

const mediaKeyFrom = (value: unknown, request: NextRequest) => {
  if (typeof value !== "string" || !value.trim()) return "";
  let key = value.trim();
  try {
    const pathname = new URL(key, new URL(request.url).origin).pathname;
    key = pathname.startsWith("/api/media/") ? pathname.slice("/api/media/".length) : key;
    key = decodeURIComponent(key);
  } catch {
    return "";
  }
  return /^uploads\/\d{4}\/\d{2}\/\d{2}\/[a-zA-Z0-9_.-]+$/.test(key) ? key : "";
};

const getBucket = async (): Promise<R2BucketBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).MEDIA_BUCKET as R2BucketBinding | undefined) || null;
  } catch {
    return null;
  }
};

const extractJson = (output: unknown) => {
  const result = output && typeof output === "object"
    ? output as {
      response?: unknown;
      choices?: Array<{ message?: { content?: unknown } }>;
    }
    : null;
  const response = result?.response
    ?? result?.choices?.[0]?.message?.content
    ?? output;
  if (response && typeof response === "object") return response;
  if (typeof response !== "string") return null;
  try {
    return JSON.parse(response);
  } catch {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const readConvertedText = (value: unknown) => {
  const result = Array.isArray(value) ? value[0] : value;
  if (!result || typeof result !== "object") return "";
  const conversion = result as MarkdownConversionResult;
  return conversion.format !== "error" && typeof conversion.data === "string"
    ? conversion.data.replace(/\u0000/g, "").trim().slice(0, 10_000)
    : "";
};

const cachedResult = (
  row: CachedAnalysisRow,
  cached: boolean
): PosterAnalysisResult | null => {
  try {
    const stored = JSON.parse(row.resultJson) as PosterAnalysisResult;
    return {
      ...stored,
      id: row.id,
      sourceTextPreview: row.ocrText.slice(0, 1200),
      cached
    };
  } catch {
    return null;
  }
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(request, "POST,OPTIONS")
  });
}

export async function POST(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return respond(request, 403, { error: "허용되지 않은 요청입니다." });
  }

  const { db, hashSalt, ai } = await getCommunityContext();
  const bucket = await getBucket();
  if (!db || !bucket || !ai) {
    return respond(request, 503, { error: "포스터 분석 기능을 준비하고 있습니다. 잠시 후 다시 시도해주세요." });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "분석할 포스터 정보를 읽지 못했습니다." });
  }

  const key = mediaKeyFrom(payload.key || payload.url, request);
  const category = typeof payload.category === "string" ? payload.category : "";
  const refresh = payload.refresh === true;
  if (!key) return respond(request, 400, { error: "분석할 포스터 이미지를 다시 선택해주세요." });
  if (!allowedCategories.has(category)) {
    return respond(request, 400, { error: "포스터 분석은 행사 또는 홍보 글에서 사용할 수 있습니다." });
  }

  const uploaderHash = await requestFingerprint(request, hashSalt, "uploads");
  const upload = await db.prepare(
    `select object_key as objectKey, byte_size as byteSize, content_type as contentType
     from upload_events
     where object_key = ? and uploader_hash = ?
     limit 1`
  ).bind(key, uploaderHash).first<UploadRow>();
  if (!upload) {
    return respond(request, 403, { error: "직접 업로드한 이미지에만 포스터 분석을 사용할 수 있습니다." });
  }
  if (!allowedTypes.has(upload.contentType)) {
    return respond(request, 400, { error: "JPG, PNG, WebP, GIF 포스터만 분석할 수 있습니다." });
  }
  if (Number(upload.byteSize || 0) > maxAnalysisBytes) {
    return respond(request, 400, { error: "포스터 분석용 이미지는 8MB 이하로 올려주세요." });
  }

  if (!refresh) {
    const cached = await db.prepare(
      `select id, result_json as resultJson, ocr_text as ocrText
       from poster_analyses
       where object_key = ? and uploader_hash = ? and category = ? and status = 'completed'
       order by created_at desc
       limit 1`
    ).bind(key, uploaderHash, category).first<CachedAnalysisRow>();
    const parsed = cached ? cachedResult(cached, true) : null;
    if (parsed) return respond(request, 200, { analysis: parsed });
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60_000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  const [hourly, daily, siteDaily] = await Promise.all([
    db.prepare("select count(*) as count from poster_analyses where uploader_hash = ? and created_at >= ?")
      .bind(uploaderHash, hourAgo).first<{ count: number }>(),
    db.prepare("select count(*) as count from poster_analyses where uploader_hash = ? and created_at >= ?")
      .bind(uploaderHash, dayAgo).first<{ count: number }>(),
    db.prepare("select count(*) as count from poster_analyses where created_at >= ?")
      .bind(dayAgo).first<{ count: number }>()
  ]);
  if (Number(hourly?.count || 0) >= hourlyUserLimit) {
    return respond(request, 429, { error: "포스터는 한 시간에 3장까지 분석할 수 있습니다." });
  }
  if (Number(daily?.count || 0) >= dailyUserLimit) {
    return respond(request, 429, { error: "오늘 사용할 수 있는 포스터 분석 횟수를 모두 사용했습니다." });
  }
  if (Number(siteDaily?.count || 0) >= dailySiteLimit) {
    return respond(request, 429, { error: "오늘의 포스터 분석 사용량이 찼습니다. 내일 다시 시도해주세요." });
  }

  const object = await bucket.get(upload.objectKey);
  if (!object) return respond(request, 404, { error: "업로드한 포스터 이미지를 찾지 못했습니다." });

  const analysisId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await db.prepare(
    `insert into poster_analyses
      (id, object_key, uploader_hash, category, content_type, model, status, created_at)
     values (?, ?, ?, ?, ?, ?, 'running', ?)`
  ).bind(
    analysisId,
    upload.objectKey,
    uploaderHash,
    category,
    upload.contentType,
    model,
    startedAt
  ).run();

  try {
    const bytes = await object.arrayBuffer();
    const blob = new Blob([bytes], { type: upload.contentType });
    let ocrText = "";
    if (ai.toMarkdown) {
      const converted = await ai.toMarkdown(
        { name: upload.objectKey.split("/").pop() || "poster", blob },
        {
          conversionOptions: {
            output: { format: "text" },
            image: { descriptionLanguage: "en" }
          }
        }
      ).catch(() => null);
      ocrText = readConvertedText(converted);
    }
    if (!ocrText) throw new Error("poster_conversion_empty");

    const output = await ai.run(model, {
      messages: [
        {
          role: "system",
          content: [
            "당신은 한국 바차타 행사 포스터를 정리하는 정확한 편집자다.",
            "이미지와 OCR 보조문구에서 눈으로 확인되는 정보만 추출한다.",
            "날짜, 시간, 장소, 이름, 금액, 연락처, 링크를 절대 추측하지 않는다.",
            "읽히지 않거나 애매한 값은 빈 문자열 또는 빈 배열로 두고 uncertainFields에 한국어 필드명을 넣는다.",
            "intro는 포스터에서 확인되는 내용만 사용해 자연스러운 한국어 1~2문장으로 쓴다.",
            "포스터 문구를 길게 복사하지 말고 핵심 정보만 정리한다.",
            "태그는 바차타, 지역, 행사 종류처럼 검색에 도움이 되는 짧은 단어만 넣는다."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            `글 분류: ${posterCategoryLabel(category)}`,
            "포스터를 읽고 지정된 JSON 구조로 정리하세요.",
            `이미지 인식 결과:\n${ocrText}`
          ].join("\n\n")
        }
      ],
      max_tokens: 1800,
      temperature: 0.1,
      repetition_penalty: 1.08,
      response_format: {
        type: "json_schema",
        json_schema: posterAnalysisSchema
      }
    });

    const fields = normalizePosterFields(extractJson(output));
    if (!fields) throw new Error("poster_fields_missing");
    if (!fields.title) {
      fields.title = fields.eventKind
        ? `${fields.eventKind} 안내`
        : category === "promotion" ? "바차타 홍보 안내" : "바차타 행사 안내";
      if (!fields.uncertainFields.includes("행사명")) fields.uncertainFields.push("행사명");
    }
    const draftBody = buildPosterDraft(fields);
    if (draftBody.length < 20) throw new Error("poster_draft_too_short");

    const result: PosterAnalysisResult = {
      ...fields,
      id: analysisId,
      sourceTextPreview: ocrText.slice(0, 1200),
      draftBody,
      cached: false
    };
    await db.prepare(
      `update poster_analyses
       set status = 'completed', result_json = ?, ocr_text = ?, completed_at = ?
       where id = ?`
    ).bind(
      JSON.stringify(result),
      ocrText.slice(0, 12_000),
      new Date().toISOString(),
      analysisId
    ).run();
    return respond(request, 200, { analysis: result });
  } catch (error) {
    console.error("Poster analysis failed", error);
    await db.prepare(
      `update poster_analyses
       set status = 'failed', result_json = ?, completed_at = ?
       where id = ?`
    ).bind(
      JSON.stringify({ error: error instanceof Error ? error.message.slice(0, 200) : "unknown" }),
      new Date().toISOString(),
      analysisId
    ).run();
    return respond(request, 502, {
      error: "포스터를 정확하게 읽지 못했습니다. 글자가 선명한 원본 이미지로 다시 시도해주세요."
    });
  }
}
