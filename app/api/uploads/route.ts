import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

type R2ObjectBody = {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
  };
  writeHttpMetadata?: (headers: Headers) => void;
};

type R2BucketBinding = {
  put: (key: string, value: ArrayBuffer | ReadableStream, options?: {
    httpMetadata?: { contentType?: string };
    customMetadata?: Record<string, string>;
  }) => Promise<unknown>;
  get: (key: string) => Promise<R2ObjectBody | null>;
};

const allowedOrigins = new Set([
  "https://bachata.co.kr",
  "https://www.bachata.co.kr",
  "https://bachata-co-kr.bachata-korea.workers.dev",
  "http://localhost:3000",
  "http://localhost:3333",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3333"
]);

const jsonHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://bachata.co.kr";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    vary: "Origin"
  };
};

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const getBucket = async (): Promise<R2BucketBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).MEDIA_BUCKET as R2BucketBinding | undefined) || null;
  } catch {
    return null;
  }
};

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "media";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function POST(request: NextRequest) {
  const bucket = await getBucket();
  if (!bucket) return respond(request, 503, { error: "미디어 저장소가 아직 연결되지 않았습니다." });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return respond(request, 400, { error: "업로드 파일을 읽을 수 없습니다." });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return respond(request, 400, { error: "파일을 선택해주세요." });
  if (!allowedTypes.has(file.type)) return respond(request, 400, { error: "이미지, MP4, WebM, MOV 파일만 올릴 수 있습니다." });
  if (file.size > 40 * 1024 * 1024) return respond(request, 400, { error: "파일은 40MB 이하로 올려주세요." });

  const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const key = `uploads/${datePath}/${crypto.randomUUID()}-${safeName(file.name)}`;
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      originalName: file.name.slice(0, 120)
    }
  });

  const origin = new URL(request.url).origin;
  return respond(request, 201, {
    media: {
      url: `${origin}/api/media/${key}`,
      name: file.name,
      contentType: file.type,
      size: file.size
    }
  });
}
