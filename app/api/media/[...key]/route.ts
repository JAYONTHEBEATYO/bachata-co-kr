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
  get: (key: string) => Promise<R2ObjectBody | null>;
};

type PageProps = {
  params: Promise<{ key: string[] }>;
};

const getBucket = async (): Promise<R2BucketBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).MEDIA_BUCKET as R2BucketBinding | undefined) || null;
  } catch {
    return null;
  }
};

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: PageProps) {
  const bucket = await getBucket();
  if (!bucket) return new Response("Media storage is not configured.", { status: 503 });

  const { key: keyParts } = await params;
  const key = keyParts.join("/");
  if (!key.startsWith("uploads/")) return new Response("Not found.", { status: 404 });

  const object = await bucket.get(key);
  if (!object) return new Response("Not found.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("content-type")) headers.set("content-type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("access-control-allow-origin", "*");

  return new Response(object.body, { headers });
}
