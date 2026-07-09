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

type AwardRow = {
  awardType: string;
  count: number;
};

type CountRow = {
  count: number;
};

const allowedAwards = new Set(["footwork", "flow", "music", "manners"]);

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

const normalizeId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,120}$/.test(text) ? text : "";
};

const normalizeGuestId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,120}$/.test(text) ? text : crypto.randomUUID();
};

const getIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getAwardCounts = async (db: D1DatabaseBinding, threadId: string) => {
  const rows = await db.prepare(
    `select award_type as awardType, count(*) as count
    from thread_awards
    where thread_id = ?
    group by award_type`
  ).bind(threadId).all<AwardRow>();
  return (rows.results || []).map((row) => ({
    awardType: row.awardType,
    count: Number(row.count || 0)
  }));
};

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function GET(request: NextRequest) {
  const db = await getDb();
  if (!db) return respond(request, 503, { error: "어워드 저장소가 아직 연결되지 않았습니다." });

  const threadId = normalizeId(request.nextUrl.searchParams.get("threadId"));
  if (!threadId) return respond(request, 400, { error: "쓰레드 정보가 올바르지 않습니다." });

  return respond(request, 200, { awards: await getAwardCounts(db, threadId) });
}

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) return respond(request, 503, { error: "어워드 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "어워드 내용을 읽을 수 없습니다." });
  }

  const threadId = normalizeId(payload.threadId);
  const awardType = typeof payload.awardType === "string" ? payload.awardType.trim() : "";
  const guestId = normalizeGuestId(payload.guestId);

  if (!threadId) return respond(request, 400, { error: "쓰레드 정보가 올바르지 않습니다." });
  if (!allowedAwards.has(awardType)) return respond(request, 400, { error: "어워드 종류가 올바르지 않습니다." });

  const ip = getIp(request);
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = (await sha256Hex(`${ip}|${day}|bachata-awards-v1`)).slice(0, 40);
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const recent = await db.prepare(
    "select count(*) as count from thread_awards where ip_hash = ? and created_at >= ?"
  ).bind(ipHash, since).first<CountRow>();

  if (Number(recent?.count || 0) >= 20) {
    return respond(request, 429, { error: "어워드를 너무 빠르게 남기고 있습니다. 잠시 후 다시 시도해주세요." });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    `insert into thread_awards
      (id, thread_id, award_type, guest_id, ip_hash, created_at)
    values (?, ?, ?, ?, ?, ?)`
  ).bind(id, threadId, awardType, guestId, ipHash, now).run();

  return respond(request, 201, { awards: await getAwardCounts(db, threadId) });
}
