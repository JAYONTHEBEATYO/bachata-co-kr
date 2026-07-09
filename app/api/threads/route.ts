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

type CountRow = {
  count: number;
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

const normalizeText = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, max);
};

const normalizeCategory = (value: unknown) => {
  const category = typeof value === "string" ? value : "questions";
  return categories.has(category) ? category : "questions";
};

const normalizeLink = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
};

const getIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

const ipPrefix = (ip: string) => {
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\./);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.*.*`;
  const ipv6 = ip.split(":").filter(Boolean);
  if (ipv6.length >= 2) return `${ipv6[0]}:${ipv6[1]}:*`;
  return "비공개";
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const randomToken = (length: number) => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
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
  const db = await getDb();
  if (!db) return respond(request, 503, { error: "글 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "글 내용을 읽을 수 없습니다." });
  }

  if (payload.website) {
    return respond(request, 200, { ok: true });
  }

  const title = normalizeText(payload.title, 120);
  const body = normalizeText(payload.body, 4000);
  const category = normalizeCategory(payload.category);
  const linkUrl = normalizeLink(payload.linkUrl);

  if (title.length < 4) return respond(request, 400, { error: "제목을 네 글자 이상 적어주세요." });
  if (body.length < 2) return respond(request, 400, { error: "본문을 두 글자 이상 적어주세요." });

  const ip = getIp(request);
  const day = new Date().toISOString().slice(0, 10);
  const hashedIp = (await sha256Hex(`${ip}|${day}|bachata-threads-v1`)).slice(0, 40);
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const recent = await db.prepare(
    "select count(*) as count from guest_threads where ip_hash = ? and created_at >= ?"
  ).bind(hashedIp, since).first<CountRow>();

  if (Number(recent?.count || 0) >= 5) {
    return respond(request, 429, { error: "글을 너무 빠르게 올리고 있습니다. 잠시 후 다시 시도해주세요." });
  }

  const id = crypto.randomUUID();
  const guestId = `guest_${randomToken(6).toLowerCase()}`;
  const oneTimePassword = `${randomToken(4)}-${randomToken(4)}`;
  const editKeyHash = await sha256Hex(`${id}|${oneTimePassword}|bachata-thread-key-v1`);
  const now = new Date().toISOString();
  const displayIp = ipPrefix(ip);

  await db.prepare(
    `insert into guest_threads
      (id, title, body, category, link_url, guest_id, ip_prefix, ip_hash, edit_key_hash, score, downvotes, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
  ).bind(id, title, body, category, linkUrl, guestId, displayIp, hashedIp, editKeyHash, now, now).run();

  return respond(request, 201, {
    thread: {
      id,
      title,
      body,
      category,
      linkUrl,
      guestId,
      ipPrefix: displayIp,
      score: 0,
      downvotes: 0,
      createdAt: now
    },
    oneTimePassword
  });
}
