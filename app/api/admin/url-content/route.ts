import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import {
  adminCategories,
  adminResponse,
  cleanAdminText,
  logAdminActivity,
  requireAdmin,
  requireTrustedAdmin
} from "@/lib/admin-server";
import type { AdminUrlContentJob } from "@/lib/admin-types";
import {
  getCommunityContext,
  hasTrustedRequestOrigin
} from "@/lib/community-server";
import {
  claimEditorialContentKeys,
  createEditorialFingerprint,
  inferEditorialCategory,
  inferEditorialTags,
  mergeEditorialTags,
  releaseEditorialContentClaims
} from "@/lib/editorial-automation";
import {
  buildReelLocalizationProject,
  inferUrlContentKind,
  inferUrlSourcePlatform,
  mapEditorialUrlJob,
  metadataFromHtml,
  validateEditorialSourceUrl,
  type EditorialUrlJobRow,
  type UrlSourceMetadata,
  type UrlSourcePlatform
} from "@/lib/editorial-url-content";

type R2BucketBinding = {
  put: (
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    }
  ) => Promise<unknown>;
};

type StreamDirectUpload = {
  id: string;
  uploadURL: string;
};

type StreamVideoDetails = {
  readyToStream: boolean;
  status?: {
    state?: string;
    pctComplete?: string;
    errorReasonText?: string;
  };
  thumbnail?: string;
  hlsPlaybackUrl?: string;
};

type StreamBinding = {
  createDirectUpload: (params: {
    maxDurationSeconds: number;
    expiry?: string;
    creator?: string;
    meta?: Record<string, string>;
    thumbnailTimestampPct?: number;
    scheduledDeletion?: string | null;
  }) => Promise<StreamDirectUpload>;
  video: (id: string) => {
    details: () => Promise<StreamVideoDetails>;
  };
};

type AiArticleDraft = {
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
  imagePrompt: string;
  sourceName: string;
  confidence: number;
};

const textModel = "@cf/openai/gpt-oss-120b";
const imageModel = "@cf/black-forest-labs/flux-1-schnell";
const maxSourceBytes = 750_000;
const streamIdPattern = /^[a-zA-Z0-9_-]{16,80}$/;

const jobSelect = `
  select id,
         source_url as sourceUrl,
         source_platform as sourcePlatform,
         content_kind as contentKind,
         source_title as sourceTitle,
         source_author as sourceAuthor,
         source_handle as sourceHandle,
         source_thumbnail_url as sourceThumbnailUrl,
         source_asset_url as sourceAssetUrl,
         reuse_status as reuseStatus,
         status,
         generated_image_url as generatedImageUrl,
         output_asset_url as outputAssetUrl,
         output_stream_id as outputStreamId,
         proposal_id as proposalId,
         error_message as errorMessage,
         created_at as createdAt,
         updated_at as updatedAt
  from editorial_url_jobs
`;

const articleSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 8, maxLength: 100 },
    summary: { type: "string", minLength: 45, maxLength: 180 },
    body: { type: "string", minLength: 550, maxLength: 3500 },
    category: { type: "string" },
    tags: {
      type: "array",
      maxItems: 6,
      items: { type: "string", minLength: 2, maxLength: 16 }
    },
    imagePrompt: { type: "string", minLength: 30, maxLength: 650 },
    sourceName: { type: "string", minLength: 2, maxLength: 80 },
    confidence: { type: "number" }
  },
  required: [
    "title",
    "summary",
    "body",
    "category",
    "tags",
    "imagePrompt",
    "sourceName",
    "confidence"
  ]
};

const hasForeignScriptLeak = (value: string) => (
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(value)
);

const normalizeEditorialBody = (value: unknown) => {
  const cleaned = cleanAdminText(value, 5000)
    .replace(/(^|\n)\s*#{1,6}\s*/gu, "$1")
    .replace(/\n{3,}/g, "\n\n");
  const existingParagraphs = cleaned.split(/\n\s*\n/u).filter(Boolean);
  if (existingParagraphs.length >= 3) return existingParagraphs.join("\n\n");

  const sentences = cleaned
    .replace(/\n+/g, " ")
    .match(/[^.!?]+[.!?]+|[^.!?]+$/gu)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
  if (sentences.length < 6) return cleaned;

  const paragraphCount = Math.min(4, Math.max(3, Math.ceil(sentences.length / 4)));
  const perParagraph = Math.ceil(sentences.length / paragraphCount);
  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += perParagraph) {
    paragraphs.push(sentences.slice(index, index + perParagraph).join(" "));
  }
  return paragraphs.join("\n\n");
};

const getBindings = async () => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as Record<string, unknown>;
    return {
      bucket: (bindings.MEDIA_BUCKET as R2BucketBinding | undefined) || null,
      stream: (bindings.STREAM as StreamBinding | undefined) || null
    };
  } catch {
    return { bucket: null, stream: null };
  }
};

const normalizeHandle = (value: unknown) => {
  const text = cleanAdminText(value, 80)
    .replace(/\s+/g, "")
    .replace(/^https?:\/\/(?:www\.)?(?:instagram\.com|youtube\.com)\/@?/i, "")
    .replace(/\/.*$/, "")
    .replace(/^@+/, "");
  return /^[\p{L}\p{N}._-]{2,60}$/u.test(text) ? `@${text}` : "";
};

const readLimitedText = async (response: Response, maxBytes = maxSourceBytes) => {
  if (!response.body) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let output = "";
  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = maxBytes - received;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    received += chunk.byteLength;
    output += decoder.decode(chunk, { stream: true });
    if (value.byteLength > remaining) {
      await reader.cancel();
      break;
    }
  }
  return output + decoder.decode();
};

const safeFetch = async (
  initialUrl: string,
  init: RequestInit = {},
  redirects = 3
) => {
  let currentUrl = validateEditorialSourceUrl(initialUrl);
  for (let index = 0; index <= redirects; index += 1) {
    const response = await fetch(currentUrl, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: {
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.6",
        "user-agent": "BachataKoreaEditorialBot/1.0 (+https://bachata.co.kr)",
        ...(init.headers || {})
      }
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location || index === redirects) throw new Error("원문 주소의 이동 경로를 확인하지 못했습니다.");
    const nextUrl = new URL(location, currentUrl);
    validateEditorialSourceUrl(nextUrl.toString());
    nextUrl.hash = "";
    currentUrl = nextUrl.toString();
  }
  throw new Error("원문 주소를 열지 못했습니다.");
};

const youtubeMetadata = async (
  sourceUrl: string
): Promise<UrlSourceMetadata | null> => {
  try {
    const metadataPath = ["o", "embed"].join("");
    const endpoint = `https://www.youtube.com/${metadataPath}?format=json&url=${encodeURIComponent(sourceUrl)}`;
    const response = await safeFetch(endpoint, {
      headers: { accept: "application/json" }
    });
    if (!response.ok) return null;
    const value = JSON.parse(await readLimitedText(response, 100_000)) as Record<string, unknown>;
    const author = cleanAdminText(value.author_name, 100);
    return {
      url: sourceUrl,
      platform: "youtube",
      title: cleanAdminText(value.title, 240),
      author,
      handle: normalizeHandle(author),
      description: "",
      thumbnailUrl: validateOptionalUrl(value.thumbnail_url),
      articleText: "",
      originalLanguage: ""
    };
  } catch {
    return null;
  }
};

const redditMetadata = async (
  sourceUrl: string
): Promise<UrlSourceMetadata | null> => {
  const parsePost = (post: Record<string, unknown>): UrlSourceMetadata | null => {
    if (post.over_18 === true) return null;
    const author = cleanAdminText(post.author, 80);
    return {
      url: sourceUrl,
      platform: "reddit",
      title: cleanAdminText(post.title, 240),
      author: author ? `u/${author}` : "",
      handle: "",
      description: cleanAdminText(post.selftext, 1200),
      thumbnailUrl: validateOptionalUrl(post.url_overridden_by_dest || post.thumbnail),
      articleText: cleanAdminText(post.selftext, 18_000),
      originalLanguage: ""
    };
  };

  try {
    const context = await getCommunityContext();
    const postId = new URL(sourceUrl).pathname.match(/\/comments\/([a-z0-9]+)/i)?.[1] || "";
    if (postId && context.redditClientId && context.redditClientSecret) {
      const credentials = btoa(`${context.redditClientId}:${context.redditClientSecret}`);
      const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: {
          accept: "application/json",
          authorization: `Basic ${credentials}`,
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": context.redditUserAgent
        },
        body: "grant_type=client_credentials"
      });
      if (tokenResponse.ok) {
        const token = await tokenResponse.json() as { access_token?: string };
        if (token.access_token) {
          const postResponse = await fetch(
            `https://oauth.reddit.com/api/info?id=t3_${encodeURIComponent(postId)}&raw_json=1`,
            {
              signal: AbortSignal.timeout(15_000),
              headers: {
                accept: "application/json",
                authorization: `Bearer ${token.access_token}`,
                "user-agent": context.redditUserAgent
              }
            }
          );
          if (postResponse.ok) {
            const listing = await postResponse.json() as {
              data?: { children?: Array<{ data?: Record<string, unknown> }> };
            };
            const post = listing.data?.children?.[0]?.data;
            if (post) return parsePost(post);
          }
        }
      }
    }
  } catch {
    // Fall through to public metadata. Reddit blocks anonymous JSON in some regions.
  }

  try {
    const endpoint = `https://www.reddit.com/oembed?url=${encodeURIComponent(sourceUrl)}`;
    const response = await safeFetch(endpoint, {
      headers: { accept: "application/json" }
    });
    if (!response.ok) return null;
    const value = JSON.parse(await readLimitedText(response, 100_000)) as Record<string, unknown>;
    return {
      url: sourceUrl,
      platform: "reddit",
      title: cleanAdminText(value.title, 240),
      author: cleanAdminText(value.author_name, 80),
      handle: "",
      description: "",
      thumbnailUrl: validateOptionalUrl(value.thumbnail_url),
      articleText: "",
      originalLanguage: ""
    };
  } catch {
    return null;
  }
};

const validateOptionalUrl = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return validateEditorialSourceUrl(value);
  } catch {
    return "";
  }
};

const fetchSourceMetadata = async (
  sourceUrl: string,
  platform: UrlSourcePlatform
): Promise<UrlSourceMetadata> => {
  if (platform === "youtube") {
    const metadata = await youtubeMetadata(sourceUrl);
    if (metadata) return metadata;
  }
  if (platform === "reddit") {
    const metadata = await redditMetadata(sourceUrl);
    if (metadata) return metadata;
  }

  const response = await safeFetch(sourceUrl);
  if (!response.ok) throw new Error(`원문을 불러오지 못했습니다. HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("웹문서 주소를 입력해주세요. 영상 원본 파일 주소는 별도 칸에 넣을 수 있습니다.");
  }
  const html = await readLimitedText(response);
  return metadataFromHtml(sourceUrl, html, platform);
};

const extractAiJson = (value: unknown) => {
  const parseCandidate = (candidate: unknown): Record<string, unknown> | null => {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
    if (typeof candidate !== "string") return null;
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      const match = candidate.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  };

  const root = value && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
  const choices = Array.isArray(root?.choices) ? root.choices : [];
  const firstChoice = choices[0] && typeof choices[0] === "object"
    ? choices[0] as Record<string, unknown>
    : null;
  const choiceMessage = firstChoice?.message && typeof firstChoice.message === "object"
    ? firstChoice.message as Record<string, unknown>
    : null;
  const output = Array.isArray(root?.output) ? root.output : [];
  const outputTexts = output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    return content.flatMap((part) => (
      part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string"
        ? [(part as Record<string, unknown>).text]
        : []
    ));
  });
  const candidates = [
    root?.response,
    root?.output_text,
    root?.result,
    choiceMessage?.content,
    ...outputTexts,
    value
  ];
  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate);
    if (parsed) return parsed;
  }
  return null;
};

const createArticleDraft = async (
  metadata: UrlSourceMetadata,
  notes: string,
  sourceExcerpt: string
): Promise<AiArticleDraft> => {
  const { ai } = await getCommunityContext();
  if (!ai) throw new Error("AI 글쓰기 기능이 연결되지 않았습니다.");
  const sourceText = cleanAdminText(
    [
      metadata.articleText,
      sourceExcerpt,
      metadata.description,
      metadata.title
    ].filter(Boolean).join("\n\n"),
    14_000
  );
  if (sourceText.length < 80) {
    throw new Error("본문을 읽지 못했습니다. 로그인이나 수집 차단이 있는 사이트라면 '원문 일부'에 내용을 붙여 넣어주세요.");
  }
  const output = await ai.run(textModel, {
    messages: [
      {
        role: "system",
        content: [
          "당신은 bachata.co.kr의 한국어 문화 에디터다.",
          "해외 공개 글·토론·경험담에서 사실과 핵심 맥락만 가져와 한국 독자를 위한 독립적인 새 글로 재구성한다.",
          "원문 문장이나 문단을 번역체로 복사하지 않는다. 긴 인용은 쓰지 않는다.",
          "원문에 없는 사실, 인물, 날짜, 반응을 만들어내지 않는다.",
          "제목은 구체적으로, 요약은 짧고 궁금증이 생기게, 본문은 600자 이상 자연스러운 한국어로 쓴다.",
          "고유명사와 널리 쓰이는 바차타 용어를 제외하면 한국어만 사용한다. 한자·중국어·일본어 문자를 섞지 않는다.",
          "영어 표현은 타이밍, 싱코페이션처럼 자연스러운 한국어로 옮긴다.",
          "본문은 도입, 핵심 이야기, 바차타 독자가 생각해볼 지점 순서로 3~5개 문단을 나눈다.",
          "문단 사이에는 빈 줄 하나만 두고, 번호 목록이나 마크다운 제목 기호는 쓰지 않는다.",
          "독자에게 작업 과정을 설명하는 말이나 어색한 번역투를 쓰지 않는다.",
          "imagePrompt는 실존 인물의 얼굴이나 원문 이미지를 복제하지 않는 세련된 편집 삽화용 영어 프롬프트다.",
          "이미지에는 글자, 로고, 워터마크를 넣지 않는다."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          `원문 제목: ${metadata.title}`,
          `원문 작성자·매체: ${metadata.author || new URL(metadata.url).hostname}`,
          `원문 주소: ${metadata.url}`,
          notes ? `관리자 메모: ${notes}` : "",
          "원문에서 확인한 내용:",
          sourceText
        ].filter(Boolean).join("\n\n")
      }
    ],
    max_tokens: 2600,
    temperature: 0.45,
    response_format: {
      type: "json_schema",
      json_schema: articleSchema
    }
  });
  const parsed = extractAiJson(output);
  if (!parsed) throw new Error("AI가 초안 형식을 완성하지 못했습니다.");
  const title = cleanAdminText(parsed.title, 100);
  const summary = cleanAdminText(parsed.summary, 180);
  const body = normalizeEditorialBody(parsed.body);
  const imagePrompt = cleanAdminText(parsed.imagePrompt, 650);
  if (title.length < 8 || summary.length < 35 || body.length < 500 || imagePrompt.length < 25) {
    throw new Error("초안 분량이 부족해 검토 목록에 넣지 않았습니다.");
  }
  if (
    hasForeignScriptLeak(`${title}\n${summary}\n${body}`)
    || body.split(/\n\s*\n/u).filter(Boolean).length < 3
  ) {
    throw new Error("한국어 문장 품질 기준을 통과하지 못해 초안을 등록하지 않았습니다. 다시 만들기를 눌러주세요.");
  }
  const requestedTags = Array.isArray(parsed.tags)
    ? parsed.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => cleanAdminText(tag, 16))
      .filter((tag) => tag.length >= 2)
      .slice(0, 6)
    : [];
  return {
    title,
    summary,
    body,
    category: inferEditorialCategory(
      parsed.category,
      title,
      body,
      metadata.platform,
      adminCategories
    ),
    tags: mergeEditorialTags(
      requestedTags,
      inferEditorialTags(title, summary, body, metadata.title)
    ),
    imagePrompt,
    sourceName: cleanAdminText(parsed.sourceName, 80)
      || metadata.author
      || new URL(metadata.url).hostname,
    confidence: Math.max(0.35, Math.min(0.98, Number(parsed.confidence) || 0.68))
  };
};

const decodeBase64 = (value: string) => {
  const clean = value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const createEditorialImage = async (
  jobId: string,
  prompt: string,
  request: NextRequest
) => {
  const [{ bucket }, { ai }] = await Promise.all([getBindings(), getCommunityContext()]);
  if (!bucket) throw new Error("이미지 저장소가 연결되지 않았습니다.");
  if (!ai) throw new Error("AI 이미지 기능이 연결되지 않았습니다.");
  const result = await ai.run(imageModel, {
    prompt: [
      prompt,
      "Editorial culture magazine illustration for a Korean bachata community.",
      "No text, no logo, no watermark, no recognizable real person.",
      "Landscape 16:9 composition, clear focal point, natural color contrast."
    ].join(" ")
  });
  const image = result && typeof result === "object"
    ? (result as { image?: unknown }).image
    : null;
  if (typeof image !== "string" || image.length < 100) {
    throw new Error("AI 이미지를 만들지 못했습니다.");
  }
  const bytes = decodeBase64(image);
  const datePath = new Date().toISOString().slice(0, 10).replaceAll("-", "/");
  const key = `uploads/${datePath}/${jobId}-editorial.jpg`;
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: "image/jpeg" },
    customMetadata: {
      origin: "admin-url-content",
      jobId
    }
  });
  return {
    key,
    url: `${new URL(request.url).origin}/api/media/${key}`
  };
};

const markJobFailed = async (
  db: Awaited<ReturnType<typeof getCommunityContext>>["db"],
  id: string,
  error: unknown
) => {
  if (!db) return;
  const message = error instanceof Error ? error.message : "작업을 마치지 못했습니다.";
  await db.prepare(
    `update editorial_url_jobs
     set status = 'failed', error_code = 'PROCESSING_FAILED',
         error_message = ?, updated_at = ?
     where id = ?`
  ).bind(message.slice(0, 500), new Date().toISOString(), id).run();
};

const createReadyVideoProposal = async (input: {
  request: NextRequest;
  auth: Extract<Awaited<ReturnType<typeof requireAdmin>>, { ok: true }>;
  jobId: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  outputAssetUrl: string;
  outputStreamId: string;
  project: Record<string, unknown>;
}) => {
  const row = await input.auth.db.prepare(
    `select canonical_source_url as sourceUrl, source_title as sourceTitle,
            source_author as sourceAuthor, source_handle as sourceHandle,
            source_asset_url as sourceAssetUrl, permission_reference as permissionReference,
            proposal_id as proposalId
     from editorial_url_jobs where id = ? limit 1`
  ).bind(input.jobId).first<{
    sourceUrl: string;
    sourceTitle: string;
    sourceAuthor: string;
    sourceHandle: string;
    sourceAssetUrl: string | null;
    permissionReference: string;
    proposalId: string | null;
  }>();
  if (!row) throw new Error("영상 작업을 찾지 못했습니다.");
  if (row.proposalId) return row.proposalId;

  const fingerprint = await createEditorialFingerprint(input.title, input.summary);
  const proposalId = crypto.randomUUID();
  const claimed = await claimEditorialContentKeys(
    input.auth.db,
    proposalId,
    row.sourceUrl,
    fingerprint,
    365
  );
  if (!claimed) throw new Error("같은 원문으로 만든 콘텐츠가 이미 검토 목록에 있습니다.");
  const now = new Date().toISOString();
  try {
    await input.auth.db.prepare(
      `insert into admin_proposals
        (id, proposal_type, title, summary, body, category, tags_json,
         source_url, canonical_source_url, source_name, evidence_json,
         rationale, priority, confidence, content_fingerprint,
         classification_json, status, created_by, created_at, updated_at)
       values (?, 'content', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               'normal', 0.9, ?, ?, 'pending', 'ai', ?, ?)`
    ).bind(
      proposalId,
      input.title,
      input.summary,
      input.body,
      input.category,
      JSON.stringify(input.tags),
      row.sourceUrl,
      row.sourceUrl,
      row.sourceHandle || row.sourceAuthor || new URL(row.sourceUrl).hostname,
      JSON.stringify([
        { label: row.sourceTitle || "원본 영상", url: row.sourceUrl },
        ...(row.permissionReference
          ? [{ label: "재사용 허가 기록", url: row.permissionReference }]
          : [])
      ]),
      "해외 원본의 재사용 허가를 확인한 뒤 한국어 자막과 출처 표기를 넣어 편집한 영상입니다.",
      fingerprint,
      JSON.stringify({
        version: 3,
        urlJobId: input.jobId,
        category: input.category,
        tags: input.tags,
        project: input.project,
        media: {
          type: "video",
          thumbnail: input.thumbnailUrl || null,
          sourceAssetUrl: row.sourceAssetUrl || null,
          outputMediaUrl: input.outputAssetUrl || null,
          outputStreamId: input.outputStreamId || null,
          urlJobId: input.jobId,
          reuseStatus: "permission_granted",
          attributionText: `오리지널 영상 👉 ${row.sourceHandle || row.sourceUrl}`,
          regionScope: "overseas",
          originalLanguage: "non-ko",
          subtitleStatus: "ready",
          transformationStatus: "ready"
        }
      }),
      now,
      now
    ).run();
  } catch (error) {
    await releaseEditorialContentClaims(input.auth.db, proposalId);
    throw error;
  }
  return proposalId;
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, { allowAutomation: true });
  if (!auth.ok) return auth.response;
  const activeOnly = request.nextUrl.searchParams.get("active") === "1";
  const conditions = activeOnly
    ? "where status in ('localization_queued', 'localizing', 'rendering')"
    : "";
  const rows = await auth.db.prepare(
    `${jobSelect} ${conditions} order by created_at desc limit ${activeOnly ? 10 : 40}`
  ).all<EditorialUrlJobRow>();
  return adminResponse(request, 200, {
    jobs: (rows.results || []).map(mapEditorialUrlJob)
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "URL 작업 정보를 읽지 못했습니다." });
  }

  let sourceUrl: string;
  try {
    sourceUrl = validateEditorialSourceUrl(payload.sourceUrl);
  } catch (error) {
    return adminResponse(request, 400, {
      error: error instanceof Error ? error.message : "원문 주소를 확인해주세요."
    });
  }
  const platform = inferUrlSourcePlatform(sourceUrl);
  const contentKind = inferUrlContentKind(payload.contentKind, platform);
  const reuseConfirmed = payload.reuseConfirmed === true;
  if (contentKind === "video" && !reuseConfirmed) {
    return adminResponse(request, 400, {
      error: "영상은 원작자의 재사용 허가를 확인한 뒤에만 작업할 수 있습니다."
    });
  }
  const permissionReference = validateOptionalUrl(payload.permissionReference);
  const sourceAssetUrl = validateOptionalUrl(payload.sourceAssetUrl);
  const requestedHandle = normalizeHandle(payload.sourceHandle);
  const notes = cleanAdminText(payload.notes, 800);
  const sourceExcerpt = cleanAdminText(payload.sourceExcerpt, 12_000);

  const duplicate = await auth.db.prepare(
    `select id, status from editorial_url_jobs
     where canonical_source_url = ?
       and status in (
         'analyzing', 'awaiting_rights', 'awaiting_source',
         'localization_queued', 'localizing', 'rendering'
       )
     order by created_at desc limit 1`
  ).bind(sourceUrl).first<{ id: string; status: string }>();
  if (duplicate) {
    return adminResponse(request, 409, {
      error: "같은 URL로 진행 중이거나 완료된 작업이 있습니다.",
      jobId: duplicate.id,
      status: duplicate.status
    });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await auth.db.prepare(
    `insert into editorial_url_jobs
      (id, source_url, canonical_source_url, source_platform, content_kind,
       source_handle, source_asset_url, reuse_status, permission_reference,
       status, created_by, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzing', ?, ?, ?)`
  ).bind(
    id,
    sourceUrl,
    sourceUrl,
    platform,
    contentKind,
    requestedHandle,
    sourceAssetUrl || null,
    contentKind === "video" ? "permission_granted" : "not_required",
    permissionReference,
    auth.user?.id || null,
    now,
    now
  ).run();

  try {
    let metadata: UrlSourceMetadata;
    try {
      metadata = await fetchSourceMetadata(sourceUrl, platform);
    } catch (metadataError) {
      if (contentKind !== "article" || sourceExcerpt.length < 80) throw metadataError;
      const url = new URL(sourceUrl);
      const pathTitle = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) || "")
        .replace(/[-_]+/g, " ");
      metadata = {
        url: sourceUrl,
        platform,
        title: cleanAdminText(pathTitle, 240) || url.hostname,
        author: url.hostname.replace(/^www\./, ""),
        handle: "",
        description: "",
        thumbnailUrl: "",
        articleText: "",
        originalLanguage: ""
      };
    }
    const sourceHandle = requestedHandle
      || normalizeHandle(metadata.handle)
      || normalizeHandle(metadata.author)
      || normalizeHandle(`${metadata.title} ${metadata.description}`.match(/@[a-zA-Z0-9._-]{2,60}/)?.[0]);
    await auth.db.prepare(
      `update editorial_url_jobs
       set source_title = ?, source_author = ?, source_handle = ?,
           source_description = ?, source_thumbnail_url = ?, updated_at = ?
       where id = ?`
    ).bind(
      metadata.title,
      metadata.author,
      sourceHandle,
      metadata.description,
      validateOptionalUrl(metadata.thumbnailUrl) || null,
      new Date().toISOString(),
      id
    ).run();

    if (contentKind === "video") {
      if (!sourceHandle) {
        throw new Error("영상 출처 계정을 확인하지 못했습니다. @원출처를 입력해주세요.");
      }
      const project = buildReelLocalizationProject({
        jobId: id,
        sourceUrl,
        sourcePlatform: platform,
        sourceHandle,
        sourceTitle: metadata.title,
        sourceDescription: metadata.description,
        sourceAssetUrl,
        permissionReference
      });
      const status: AdminUrlContentJob["status"] = sourceAssetUrl
        ? "localization_queued"
        : "awaiting_source";
      await auth.db.prepare(
        `update editorial_url_jobs
         set status = ?, project_json = ?, error_code = '', error_message = '', updated_at = ?
         where id = ?`
      ).bind(status, JSON.stringify(project), new Date().toISOString(), id).run();
      await logAdminActivity(
        auth.db,
        auth.user?.id || null,
        "URL 영상 한글화 작업 생성",
        "editorial_url_job",
        id,
        { sourceUrl, platform, status }
      );
      const job = await auth.db.prepare(`${jobSelect} where id = ? limit 1`)
        .bind(id)
        .first<EditorialUrlJobRow>();
      return adminResponse(request, 202, {
        ok: true,
        job: job ? mapEditorialUrlJob(job) : null,
        proposalCreated: false
      });
    }

    const existingProposal = await auth.db.prepare(
      `select id from admin_proposals
       where canonical_source_url = ? and status != 'denied'
       order by created_at desc limit 1`
    ).bind(sourceUrl).first<{ id: string }>();
    if (existingProposal) throw new Error("같은 원문으로 만든 콘텐츠가 이미 검토 목록에 있습니다.");

    const draft = await createArticleDraft(metadata, notes, sourceExcerpt);
    const fingerprint = await createEditorialFingerprint(draft.title, draft.summary);
    const proposalId = crypto.randomUUID();
    const claimed = await claimEditorialContentKeys(
      auth.db,
      proposalId,
      sourceUrl,
      fingerprint,
      365
    );
    if (!claimed) throw new Error("같거나 매우 비슷한 콘텐츠가 이미 있습니다.");

    try {
      const generatedImage = await createEditorialImage(id, draft.imagePrompt, request);
      const createdAt = new Date().toISOString();
      await auth.db.prepare(
        `insert into admin_proposals
          (id, proposal_type, title, summary, body, category, tags_json,
           source_url, canonical_source_url, source_name, evidence_json,
           rationale, priority, confidence, content_fingerprint,
           classification_json, status, created_by, created_at, updated_at)
         values (?, 'content', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 'normal', ?, ?, ?, 'pending', 'ai', ?, ?)`
      ).bind(
        proposalId,
        draft.title,
        draft.summary,
        draft.body,
        draft.category,
        JSON.stringify(draft.tags),
        sourceUrl,
        sourceUrl,
        draft.sourceName,
        JSON.stringify([{ label: metadata.title || draft.sourceName, url: sourceUrl }]),
        "관리자가 지정한 해외 원문을 읽고 한국 독자를 위한 새 글과 편집 이미지를 만들었습니다.",
        draft.confidence,
        fingerprint,
        JSON.stringify({
          version: 3,
          urlJobId: id,
          category: draft.category,
          tags: draft.tags,
          sourcePlatform: platform,
          sourceAuthor: metadata.author,
          media: {
            type: "image",
            thumbnail: generatedImage.url,
            sourceAssetUrl: null,
            generatedImageUrl: generatedImage.url,
            urlJobId: id,
            reuseStatus: "verified",
            attributionText: `원문: ${draft.sourceName}`,
            regionScope: "overseas",
            originalLanguage: metadata.originalLanguage || "non-ko",
            subtitleStatus: "not_started",
            transformationStatus: "ready"
          }
        }),
        createdAt,
        createdAt
      ).run();
      await auth.db.prepare(
        `update editorial_url_jobs
         set status = 'ready', generated_image_key = ?, generated_image_url = ?,
             proposal_id = ?, project_json = ?, updated_at = ?
         where id = ?`
      ).bind(
        generatedImage.key,
        generatedImage.url,
        proposalId,
        JSON.stringify({
          schemaVersion: 1,
          sourceUrl,
          sourcePlatform: platform,
          sourceTitle: metadata.title,
          sourceAuthor: metadata.author,
          imagePrompt: draft.imagePrompt,
          output: {
            proposalId,
            imageUrl: generatedImage.url
          }
        }),
        createdAt,
        id
      ).run();
      await logAdminActivity(
        auth.db,
        auth.user?.id || null,
        "URL 글·스토리 초안 생성",
        "editorial_url_job",
        id,
        { sourceUrl, proposalId }
      );
      const job = await auth.db.prepare(`${jobSelect} where id = ? limit 1`)
        .bind(id)
        .first<EditorialUrlJobRow>();
      return adminResponse(request, 201, {
        ok: true,
        job: job ? mapEditorialUrlJob(job) : null,
        proposalCreated: true,
        proposalId
      });
    } catch (error) {
      await releaseEditorialContentClaims(auth.db, proposalId);
      throw error;
    }
  } catch (error) {
    await markJobFailed(auth.db, id, error);
    return adminResponse(request, 422, {
      error: error instanceof Error ? error.message : "URL 콘텐츠를 만들지 못했습니다.",
      jobId: id
    });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request, { allowAutomation: true });
  if (!auth.ok) return auth.response;
  if (!auth.automated && !hasTrustedRequestOrigin(request)) {
    return adminResponse(request, 403, { error: "허용되지 않은 요청입니다." });
  }
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "작업 변경 내용을 읽지 못했습니다." });
  }
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  const job = await auth.db.prepare(
    `select id, status, content_kind as contentKind, source_asset_url as sourceAssetUrl,
            project_json as projectJson, output_stream_id as outputStreamId
     from editorial_url_jobs where id = ? limit 1`
  ).bind(id).first<{
    id: string;
    status: AdminUrlContentJob["status"];
    contentKind: AdminUrlContentJob["contentKind"];
    sourceAssetUrl: string | null;
    projectJson: string;
    outputStreamId: string | null;
  }>();
  if (!job) return adminResponse(request, 404, { error: "URL 콘텐츠 작업을 찾지 못했습니다." });
  const now = new Date().toISOString();

  if (action === "cancel") {
    await auth.db.prepare(
      `update editorial_url_jobs
       set status = 'cancelled', claimed_by = null, claim_expires_at = null, updated_at = ?
       where id = ? and status != 'ready'`
    ).bind(now, id).run();
    return adminResponse(request, 200, { ok: true, status: "cancelled" });
  }

  if (action === "retry") {
    if (job.contentKind === "article") {
      return adminResponse(request, 400, {
        error: "글·스토리는 URL 입력 폼에서 다시 요청해주세요."
      });
    }
    const sourceAssetUrl = validateOptionalUrl(payload.sourceAssetUrl) || job.sourceAssetUrl || "";
    await auth.db.prepare(
      `update editorial_url_jobs
       set source_asset_url = ?, status = ?, error_code = '', error_message = '',
           claimed_by = null, claim_expires_at = null, updated_at = ?
       where id = ?`
    ).bind(
      sourceAssetUrl || null,
      sourceAssetUrl ? "localization_queued" : "awaiting_source",
      now,
      id
    ).run();
    return adminResponse(request, 200, {
      ok: true,
      status: sourceAssetUrl ? "localization_queued" : "awaiting_source"
    });
  }

  if (action === "claim") {
    if (!auth.automated) return adminResponse(request, 403, { error: "영상 처리기 전용 작업입니다." });
    const processorId = cleanAdminText(payload.processorId, 80) || "localizer";
    const expiresAt = new Date(Date.now() + 20 * 60_000).toISOString();
    await auth.db.prepare(
      `update editorial_url_jobs
       set status = 'localizing', claimed_by = ?, claim_expires_at = ?, updated_at = ?
       where id = ? and status = 'localization_queued'
         and (claimed_by is null or claim_expires_at is null or claim_expires_at <= ?)`
    ).bind(processorId, expiresAt, now, id, now).run();
    return adminResponse(request, 200, { ok: true, status: "localizing", expiresAt });
  }

  if (action === "prepare_output_upload") {
    if (!auth.automated) return adminResponse(request, 403, { error: "영상 처리기 전용 작업입니다." });
    const { stream } = await getBindings();
    if (!stream) return adminResponse(request, 503, { error: "Cloudflare Stream이 연결되지 않았습니다." });
    const fileName = cleanAdminText(payload.fileName, 120) || `${id}.mp4`;
    const fileSize = Math.max(0, Number(payload.fileSize) || 0);
    const upload = await stream.createDirectUpload({
      maxDurationSeconds: 600,
      expiry: new Date(Date.now() + 30 * 60_000).toISOString(),
      creator: `editorial:${id}`,
      meta: {
        site: "bachata.co.kr",
        jobId: id,
        originalName: fileName
      },
      thumbnailTimestampPct: 0.18,
      scheduledDeletion: null
    });
    await auth.db.prepare(
      `insert into stream_videos
        (id, uploader_hash, original_name, byte_size, content_type, status,
         ready_to_stream, created_at, updated_at)
       values (?, 'admin-url-content', ?, ?, 'video/mp4', 'pendingupload', 0, ?, ?)`
    ).bind(upload.id, fileName, fileSize, now, now).run();
    await auth.db.prepare(
      `update editorial_url_jobs
       set status = 'rendering', output_stream_id = ?, updated_at = ?
       where id = ?`
    ).bind(upload.id, now, id).run();
    return adminResponse(request, 201, {
      ok: true,
      status: "rendering",
      streamId: upload.id,
      uploadURL: upload.uploadURL
    });
  }

  if (action === "fail") {
    await auth.db.prepare(
      `update editorial_url_jobs
       set status = 'failed', error_code = ?, error_message = ?,
           claimed_by = null, claim_expires_at = null, updated_at = ?
       where id = ?`
    ).bind(
      cleanAdminText(payload.errorCode, 80) || "LOCALIZER_FAILED",
      cleanAdminText(payload.errorMessage, 500) || "영상 한글화 작업을 마치지 못했습니다.",
      now,
      id
    ).run();
    return adminResponse(request, 200, { ok: true, status: "failed" });
  }

  if (action === "complete") {
    if (!auth.automated) return adminResponse(request, 403, { error: "영상 처리기 전용 작업입니다." });
    const outputStreamId = typeof payload.outputStreamId === "string"
      ? payload.outputStreamId.trim()
      : job.outputStreamId || "";
    const outputAssetUrl = validateOptionalUrl(payload.outputAssetUrl);
    let thumbnailUrl = validateOptionalUrl(payload.thumbnailUrl);
    if (outputStreamId) {
      if (!streamIdPattern.test(outputStreamId)) {
        return adminResponse(request, 400, { error: "완성 영상 ID가 올바르지 않습니다." });
      }
      const { stream } = await getBindings();
      if (!stream) return adminResponse(request, 503, { error: "Cloudflare Stream이 연결되지 않았습니다." });
      const details = await stream.video(outputStreamId).details();
      if (!details.readyToStream) {
        await auth.db.prepare(
          `update editorial_url_jobs
           set status = 'rendering', output_stream_id = ?, updated_at = ?
           where id = ?`
        ).bind(outputStreamId, now, id).run();
        return adminResponse(request, 202, {
          ok: true,
          status: "rendering",
          progress: details.status?.pctComplete || "0"
        });
      }
      thumbnailUrl = validateOptionalUrl(details.thumbnail) || thumbnailUrl;
      await auth.db.prepare(
        `update stream_videos
         set status = 'ready', ready_to_stream = 1, thumbnail_url = ?, updated_at = ?
         where id = ?`
      ).bind(thumbnailUrl || null, now, outputStreamId).run();
    }
    if (!outputStreamId && !outputAssetUrl) {
      return adminResponse(request, 400, { error: "완성 영상 파일이나 Stream ID가 필요합니다." });
    }

    const title = cleanAdminText(payload.title, 120);
    const summary = cleanAdminText(payload.summary, 220);
    const body = cleanAdminText(payload.body, 6000);
    if (title.length < 8 || summary.length < 35 || body.length < 180) {
      return adminResponse(request, 400, { error: "게시 초안의 제목·요약·본문을 확인해주세요." });
    }
    const category = typeof payload.category === "string" && adminCategories.has(payload.category)
      ? payload.category
      : "video";
    const tags = mergeEditorialTags(
      Array.isArray(payload.tags)
        ? payload.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => cleanAdminText(tag, 16))
          .filter(Boolean)
        : [],
      inferEditorialTags(title, summary, body)
    );
    let project: Record<string, unknown> = {};
    try {
      project = JSON.parse(job.projectJson || "{}") as Record<string, unknown>;
    } catch {
      project = {};
    }
    if (payload.project && typeof payload.project === "object") {
      project = { ...project, ...(payload.project as Record<string, unknown>) };
    }
    const proposalId = await createReadyVideoProposal({
      request,
      auth,
      jobId: id,
      title,
      summary,
      body,
      category,
      tags,
      thumbnailUrl,
      outputAssetUrl,
      outputStreamId,
      project
    });
    await auth.db.prepare(
      `update editorial_url_jobs
       set status = 'ready', output_asset_url = ?, output_stream_id = ?,
           proposal_id = ?, project_json = ?, error_code = '', error_message = '',
           claimed_by = null, claim_expires_at = null, updated_at = ?
       where id = ?`
    ).bind(
      outputAssetUrl || null,
      outputStreamId || null,
      proposalId,
      JSON.stringify({ ...project, status: "complete", updatedAt: now }),
      now,
      id
    ).run();
    await logAdminActivity(
      auth.db,
      auth.user?.id || null,
      "URL 영상 한글화 완료",
      "editorial_url_job",
      id,
      { proposalId, outputStreamId: outputStreamId || null }
    );
    return adminResponse(request, 200, {
      ok: true,
      status: "ready",
      proposalId
    });
  }

  return adminResponse(request, 400, { error: "지원하지 않는 작업입니다." });
}
