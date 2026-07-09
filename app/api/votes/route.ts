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

type VoteRow = {
  direction: number;
};

type TotalRow = {
  score: number;
  downvotes: number;
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
  return /^[a-zA-Z0-9_-]{1,160}$/.test(text) ? text : "";
};

const normalizeTargetType = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "thread";
  return text === "guestThread" ? "guestThread" : "thread";
};

const normalizeCount = (value: unknown) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1_000_000, Math.round(number)));
};

const getIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const voteHash = async (request: NextRequest) => {
  const day = new Date().toISOString().slice(0, 10);
  return (await sha256Hex(`${getIp(request)}|${day}|bachata-thread-votes-v1`)).slice(0, 40);
};

const ensureTables = async (db: D1DatabaseBinding) => {
  await db.prepare(
    `create table if not exists thread_vote_totals (
      target_type text not null,
      target_id text not null,
      score integer not null default 0,
      downvotes integer not null default 0,
      updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      primary key (target_type, target_id)
    )`
  ).run();
  await db.prepare(
    `create table if not exists thread_votes (
      target_type text not null,
      target_id text not null,
      ip_hash text not null,
      direction integer not null check(direction in (-1, 1)),
      created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      primary key (target_type, target_id, ip_hash)
    )`
  ).run();
  await db.prepare("create index if not exists thread_votes_target_idx on thread_votes(target_type, target_id)").run();
};

const currentTotals = async (
  db: D1DatabaseBinding,
  targetType: string,
  targetId: string,
  fallbackScore: number,
  fallbackDownvotes: number
) => {
  const row = await db.prepare(
    "select score, downvotes from thread_vote_totals where target_type = ? and target_id = ?"
  ).bind(targetType, targetId).first<TotalRow>();

  return {
    score: Number(row?.score ?? fallbackScore),
    downvotes: Number(row?.downvotes ?? fallbackDownvotes),
    hasTotals: Boolean(row)
  };
};

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function GET(request: NextRequest) {
  const db = await getDb();
  if (!db) return respond(request, 503, { error: "투표 저장소가 아직 연결되지 않았습니다." });

  const targetType = normalizeTargetType(request.nextUrl.searchParams.get("targetType"));
  const targetId = normalizeId(request.nextUrl.searchParams.get("targetId"));
  if (!targetId) return respond(request, 400, { error: "토픽 정보가 올바르지 않습니다." });

  await ensureTables(db);
  const hash = await voteHash(request);
  const vote = await db.prepare(
    "select direction from thread_votes where target_type = ? and target_id = ? and ip_hash = ?"
  ).bind(targetType, targetId, hash).first<VoteRow>();
  const totals = await currentTotals(db, targetType, targetId, 0, 0);

  return respond(request, 200, { ...totals, userVote: Number(vote?.direction || 0) });
}

export async function POST(request: NextRequest) {
  const db = await getDb();
  if (!db) return respond(request, 503, { error: "투표 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "요청을 읽을 수 없습니다." });
  }

  const targetType = normalizeTargetType(payload.targetType);
  const targetId = normalizeId(payload.targetId);
  const direction = payload.direction === "up" ? 1 : payload.direction === "down" ? -1 : 0;
  const initialScore = normalizeCount(payload.initialScore);
  const initialDownvotes = normalizeCount(payload.initialDownvotes);

  if (!targetId) return respond(request, 400, { error: "토픽 정보가 올바르지 않습니다." });
  if (!direction) return respond(request, 400, { error: "추천 방향이 올바르지 않습니다." });

  await ensureTables(db);

  const now = new Date().toISOString();
  await db.prepare(
    `insert or ignore into thread_vote_totals (target_type, target_id, score, downvotes, updated_at)
    values (?, ?, ?, ?, ?)`
  ).bind(targetType, targetId, initialScore, initialDownvotes, now).run();

  const hash = await voteHash(request);
  const existing = await db.prepare(
    "select direction from thread_votes where target_type = ? and target_id = ? and ip_hash = ?"
  ).bind(targetType, targetId, hash).first<VoteRow>();

  let upDelta = direction === 1 ? 1 : 0;
  let downDelta = direction === -1 ? 1 : 0;
  let userVote = direction;

  if (existing?.direction === direction) {
    await db.prepare(
      "delete from thread_votes where target_type = ? and target_id = ? and ip_hash = ?"
    ).bind(targetType, targetId, hash).run();
    upDelta = direction === 1 ? -1 : 0;
    downDelta = direction === -1 ? -1 : 0;
    userVote = 0;
  } else if (existing?.direction) {
    await db.prepare(
      "update thread_votes set direction = ?, updated_at = ? where target_type = ? and target_id = ? and ip_hash = ?"
    ).bind(direction, now, targetType, targetId, hash).run();
    upDelta = direction === 1 ? 1 : -1;
    downDelta = direction === -1 ? 1 : -1;
  } else {
    await db.prepare(
      "insert into thread_votes (target_type, target_id, ip_hash, direction, created_at, updated_at) values (?, ?, ?, ?, ?, ?)"
    ).bind(targetType, targetId, hash, direction, now, now).run();
  }

  await db.prepare(
    `update thread_vote_totals
    set score = case when score + ? < 0 then 0 else score + ? end,
        downvotes = case when downvotes + ? < 0 then 0 else downvotes + ? end,
        updated_at = ?
    where target_type = ? and target_id = ?`
  ).bind(upDelta, upDelta, downDelta, downDelta, now, targetType, targetId).run();

  if (targetType === "guestThread") {
    await db.prepare(
      `update guest_threads
      set score = case when score + ? < 0 then 0 else score + ? end,
          downvotes = case when downvotes + ? < 0 then 0 else downvotes + ? end,
          updated_at = ?
      where id = ?`
    ).bind(upDelta, upDelta, downDelta, downDelta, now, targetId).run();
  }

  const totals = await currentTotals(db, targetType, targetId, initialScore, initialDownvotes);
  return respond(request, 200, { targetId, targetType, ...totals, hasTotals: true, userVote });
}
