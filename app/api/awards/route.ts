import type { NextRequest } from "next/server";
import { getCommunityContext, requestFingerprint, type D1DatabaseBinding } from "@/lib/community-server";
import { editorialTargetIds } from "@/lib/editorial-targets";

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

const normalizeId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,120}$/.test(text) ? text : "";
};

const normalizeGuestId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,120}$/.test(text) ? text : crypto.randomUUID();
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

const threadExists = async (db: D1DatabaseBinding, threadId: string) => {
  if (editorialTargetIds.has(threadId)) return true;
  const row = await db.prepare("select id from guest_threads where id = ? and status = 'published' limit 1")
    .bind(threadId)
    .first<{ id: string }>();
  return Boolean(row);
};

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function GET(request: NextRequest) {
  const { db } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "어워드 저장소가 아직 연결되지 않았습니다." });

  const threadId = normalizeId(request.nextUrl.searchParams.get("threadId"));
  if (!threadId) return respond(request, 400, { error: "쓰레드 정보가 올바르지 않습니다." });
  if (!(await threadExists(db, threadId))) return respond(request, 404, { error: "쓰레드를 찾을 수 없습니다." });

  return respond(request, 200, { awards: await getAwardCounts(db, threadId) });
}

export async function POST(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
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
  if (!(await threadExists(db, threadId))) return respond(request, 404, { error: "쓰레드를 찾을 수 없습니다." });

  const ipHash = await requestFingerprint(request, hashSalt, "awards");
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const recent = await db.prepare(
    "select count(*) as count from thread_awards where ip_hash = ? and created_at >= ?"
  ).bind(ipHash, since).first<CountRow>();

  if (Number(recent?.count || 0) >= 20) {
    return respond(request, 429, { error: "어워드를 너무 빠르게 남기고 있습니다. 잠시 후 다시 시도해주세요." });
  }

  const duplicate = await db.prepare(
    "select id from thread_awards where thread_id = ? and award_type = ? and ip_hash = ? limit 1"
  ).bind(threadId, awardType, ipHash).first<{ id: string }>();
  if (duplicate) return respond(request, 409, { error: "이 글에는 같은 어워드를 이미 보냈습니다." });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    `insert into thread_awards
      (id, thread_id, award_type, guest_id, ip_hash, created_at)
    values (?, ?, ?, ?, ?, ?)`
  ).bind(id, threadId, awardType, guestId, ipHash, now).run();

  return respond(request, 201, { awards: await getAwardCounts(db, threadId) });
}
