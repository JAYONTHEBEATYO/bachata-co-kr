import type { NextRequest } from "next/server";
import {
  getCommunityContext,
  jsonHeaders as sharedJsonHeaders,
  requestFingerprint,
  type D1DatabaseBinding
} from "@/lib/community-server";

type VoteRow = {
  direction: number;
};

type TotalRow = {
  score: number;
  downvotes: number;
};

const jsonHeaders = (request: NextRequest) => sharedJsonHeaders(request, "GET,POST,OPTIONS");

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const normalizeId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,160}$/.test(text) ? text : "";
};

const normalizeTargetType = (_value: unknown) => "guestThread";

const targetExists = async (db: D1DatabaseBinding, targetType: string, targetId: string) => {
  const row = await db.prepare("select id from guest_threads where id = ? and status = 'published'")
    .bind(targetId)
    .first<{ id: string }>();
  return Boolean(row);
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
  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "투표 저장소가 아직 연결되지 않았습니다." });

  const targetType = normalizeTargetType(request.nextUrl.searchParams.get("targetType"));
  const targetId = normalizeId(request.nextUrl.searchParams.get("targetId"));
  if (!targetId) return respond(request, 400, { error: "토픽 정보가 올바르지 않습니다." });

  if (!(await targetExists(db, targetType, targetId))) return respond(request, 404, { error: "토픽을 찾을 수 없습니다." });
  const hash = await requestFingerprint(request, hashSalt, "thread-votes");
  const vote = await db.prepare(
    "select direction from thread_votes where target_type = ? and target_id = ? and ip_hash = ?"
  ).bind(targetType, targetId, hash).first<VoteRow>();
  const totals = await currentTotals(db, targetType, targetId, 0, 0);

  return respond(request, 200, { ...totals, userVote: Number(vote?.direction || 0) });
}

export async function POST(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
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
  if (!targetId) return respond(request, 400, { error: "토픽 정보가 올바르지 않습니다." });
  if (!direction) return respond(request, 400, { error: "추천 방향이 올바르지 않습니다." });
  if (!(await targetExists(db, targetType, targetId))) return respond(request, 404, { error: "토픽을 찾을 수 없습니다." });

  const now = new Date().toISOString();
  await db.prepare(
    `insert or ignore into thread_vote_totals (target_type, target_id, score, downvotes, updated_at)
    values (?, ?, 0, 0, ?)`
  ).bind(targetType, targetId, now).run();

  const hash = await requestFingerprint(request, hashSalt, "thread-votes");
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

  const totals = await currentTotals(db, targetType, targetId, 0, 0);
  return respond(request, 200, { targetId, targetType, ...totals, hasTotals: true, userVote });
}
