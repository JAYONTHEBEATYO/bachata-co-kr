import type { NextRequest } from "next/server";
import {
  getCommunityContext,
  jsonHeaders as sharedJsonHeaders,
  requestFingerprint,
  type D1DatabaseBinding
} from "@/lib/community-server";

const targetTypes = new Set(["guestThread", "comment"]);
const reasons = new Set(["spam", "abuse", "privacy", "copyright", "other"]);

const headers = (request: NextRequest) => sharedJsonHeaders(request, "POST,OPTIONS");
const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: headers(request) });

const normalizeId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,160}$/.test(text) ? text : "";
};

const targetExists = async (db: D1DatabaseBinding, targetType: string, targetId: string) => {
  const table = targetType === "comment" ? "comments" : "guest_threads";
  const row = await db.prepare(`select id from ${table} where id = ? and status = 'published' limit 1`)
    .bind(targetId)
    .first<{ id: string }>();
  return Boolean(row);
};

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: headers(request) });
}

export async function POST(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "신고함이 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "신고 내용을 읽을 수 없습니다." });
  }

  const targetType = typeof payload.targetType === "string" ? payload.targetType : "";
  const targetId = normalizeId(payload.targetId);
  const reason = typeof payload.reason === "string" ? payload.reason : "";
  const detail = typeof payload.detail === "string" ? payload.detail.replace(/<[^>]*>/g, "").trim().slice(0, 500) : "";
  if (!targetTypes.has(targetType) || !targetId || !reasons.has(reason)) {
    return respond(request, 400, { error: "신고 항목을 확인해주세요." });
  }
  if (!(await targetExists(db, targetType, targetId))) {
    return respond(request, 404, { error: "신고할 항목을 찾을 수 없습니다." });
  }

  const reporterHash = await requestFingerprint(request, hashSalt, "reports");
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const usage = await db.prepare("select count(*) as count from reports where reporter_hash = ? and created_at >= ?")
    .bind(reporterHash, since)
    .first<{ count: number }>();
  if (Number(usage?.count || 0) >= 5) {
    return respond(request, 429, { error: "신고 접수 한도를 넘었습니다. 잠시 후 다시 시도해주세요." });
  }

  await db.prepare(
    "insert into reports (id, target_type, target_id, reason, detail, reporter_hash, status, created_at) values (?, ?, ?, ?, ?, ?, 'open', ?)"
  ).bind(crypto.randomUUID(), targetType, targetId, reason, detail || null, reporterHash, new Date().toISOString()).run();

  return respond(request, 201, { ok: true });
}
