import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

type D1Rows<T> = {
  results?: T[];
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T = unknown>() => Promise<D1Rows<T>>;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare: (query: string) => D1PreparedStatement;
};

type GuestThreadRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  linkUrl: string | null;
  guestId: string;
  ipPrefix: string;
  score: number;
  downvotes: number;
  createdAt: string;
};

const categories = new Set(["questions", "video", "events", "dancers", "guide"]);

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
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    vary: "Origin"
  };
};

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const getDb = async (): Promise<D1DatabaseBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).COMMENTS_DB as D1DatabaseBinding | undefined) || null;
  } catch {
    return null;
  }
};

const rowToThread = (row: GuestThreadRow) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  category: row.category,
  linkUrl: row.linkUrl,
  guestId: row.guestId,
  ipPrefix: row.ipPrefix,
  score: Number(row.score || 0),
  downvotes: Number(row.downvotes || 0),
  createdAt: row.createdAt
});

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function GET(request: NextRequest) {
  const db = await getDb();
  if (!db) return respond(request, 503, { error: "글 저장소가 아직 연결되지 않았습니다." });

  const category = request.nextUrl.searchParams.get("category");
  const categoryFilter = category && categories.has(category) ? category : null;
  const rows = categoryFilter
    ? await db.prepare(
      `select id, title, body, category, link_url as linkUrl, guest_id as guestId, ip_prefix as ipPrefix,
        score, downvotes, created_at as createdAt
      from guest_threads
      where status = 'published' and category = ?
      order by created_at desc
      limit 40`
    ).bind(categoryFilter).all<GuestThreadRow>()
    : await db.prepare(
      `select id, title, body, category, link_url as linkUrl, guest_id as guestId, ip_prefix as ipPrefix,
        score, downvotes, created_at as createdAt
      from guest_threads
      where status = 'published'
      order by created_at desc
      limit 40`
    ).all<GuestThreadRow>();

  return respond(request, 200, { threads: (rows.results || []).map(rowToThread) });
}

export async function POST(request: NextRequest) {
  return respond(request, 403, { error: "게시글 작성은 회원 로그인 연동 후 활성화됩니다. 비회원은 댓글로 참여해주세요." });
}
