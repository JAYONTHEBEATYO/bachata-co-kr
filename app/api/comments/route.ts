import type { NextRequest } from "next/server";
import {
  getCommunityContext,
  getRequestIp,
  jsonHeaders as sharedJsonHeaders,
  requestFingerprint,
  sha256Hex,
  type D1DatabaseBinding
} from "@/lib/community-server";
import { displayIpPrefix, normalizeStoredIpPrefix } from "@/lib/ip-display";
import { displayGuestNickname, randomKoreanNickname } from "@/lib/nicknames";
import { editorialTargetIds } from "@/lib/editorial-targets";

type CommentRow = {
  id: string;
  threadId: string;
  parentId: string | null;
  author: string;
  ipPrefix: string | null;
  body: string;
  score: number;
  createdAt: string;
};

type CountRow = {
  count: number;
};

type VoteRow = {
  direction: number;
};

const jsonHeaders = (request: NextRequest) => sharedJsonHeaders(request, "GET,POST,PATCH,DELETE,OPTIONS");

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const normalizeName = (value: unknown) => {
  const text = typeof value === "string" ? value : "";
  const cleaned = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 32);
};

const normalizeBody = (value: unknown) => {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1200);
};

const normalizeThreadId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,80}$/.test(text) ? text : "";
};

const normalizeParentId = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return /^[a-zA-Z0-9_-]{1,80}$/.test(text) ? text : null;
};

const threadExists = async (db: D1DatabaseBinding, threadId: string) => {
  if (editorialTargetIds.has(threadId)) return true;
  const row = await db.prepare("select id from guest_threads where id = ? and status = 'published'")
    .bind(threadId)
    .first<{ id: string }>();
  return Boolean(row);
};

const rowToComment = (row: CommentRow) => ({
  id: row.id,
  threadId: row.threadId,
  parentId: row.parentId,
  author: displayGuestNickname(row.author, row.id),
  ipPrefix: normalizeStoredIpPrefix(row.ipPrefix),
  body: row.body,
  score: Number(row.score || 0),
  createdAt: row.createdAt
});

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function GET(request: NextRequest) {
  const { db } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "댓글 저장소가 아직 연결되지 않았습니다." });

  const threadId = normalizeThreadId(request.nextUrl.searchParams.get("threadId"));
  if (!threadId) return respond(request, 400, { error: "쓰레드 정보가 올바르지 않습니다." });

  const rows = await db.prepare(
    `select
      id,
      thread_id as threadId,
      parent_id as parentId,
      author_name as author,
      ip_prefix as ipPrefix,
      body,
      score,
      created_at as createdAt
    from comments
    where thread_id = ? and status = 'published'
    order by created_at asc
    limit 200`
  ).bind(threadId).all<CommentRow>();

  return respond(request, 200, { comments: (rows.results || []).map(rowToComment) });
}

export async function POST(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "댓글 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "댓글 내용을 읽을 수 없습니다." });
  }

  if (payload.website) {
    return respond(request, 200, { ok: true });
  }

  const threadId = normalizeThreadId(payload.threadId);
  const parentId = normalizeParentId(payload.parentId);
  const authorName = normalizeName(payload.authorName) || randomKoreanNickname();
  const authorPassword = typeof payload.authorPassword === "string" ? payload.authorPassword.trim() : "";
  const body = normalizeBody(payload.body);

  if (!threadId) return respond(request, 400, { error: "쓰레드 정보가 올바르지 않습니다." });
  if (!/^\d{4}$/.test(authorPassword)) return respond(request, 400, { error: "임시비밀번호 4자리를 숫자로 입력해주세요." });
  if (body.length < 2) return respond(request, 400, { error: "댓글을 두 글자 이상 적어주세요." });
  if (body.length > 1000) return respond(request, 400, { error: "댓글은 1000자 이하로 남겨주세요." });
  if (!(await threadExists(db, threadId))) return respond(request, 404, { error: "댓글을 남길 글을 찾을 수 없습니다." });

  if (parentId) {
    const parent = await db.prepare("select id from comments where id = ? and thread_id = ? and status = 'published'")
      .bind(parentId, threadId)
      .first<{ id: string }>();
    if (!parent) return respond(request, 400, { error: "답글을 남길 댓글을 찾을 수 없습니다." });
  }

  const ip = getRequestIp(request);
  const hash = await requestFingerprint(request, hashSalt, "comments");
  const ipPrefix = displayIpPrefix(ip);
  const since = new Date(Date.now() - 60_000).toISOString();
  const recent = await db.prepare(
    "select count(*) as count from comments where ip_hash = ? and created_at >= ?"
  ).bind(hash, since).first<CountRow>();

  if (Number(recent?.count || 0) >= 3) {
    return respond(request, 429, { error: "댓글을 너무 빠르게 남기고 있습니다. 잠시 후 다시 시도해주세요." });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 240);
  const passwordHash = await sha256Hex(`${id}|${authorPassword}|${hashSalt}|comment-edit`);

  await db.prepare(
    `insert into comments
      (id, thread_id, parent_id, author_name, body, score, ip_hash, ip_prefix, author_password_hash, user_agent, created_at, updated_at)
    values (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
  ).bind(id, threadId, parentId, authorName, body, hash, ipPrefix, passwordHash, userAgent, now, now).run();

  return respond(request, 201, {
    comment: {
      id,
      threadId,
      parentId,
      author: displayGuestNickname(authorName, id),
      ipPrefix: normalizeStoredIpPrefix(ipPrefix),
      body,
      score: 0,
      createdAt: now
    }
  });
}

export async function PATCH(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "댓글 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "요청을 읽을 수 없습니다." });
  }

  const commentId = normalizeParentId(payload.commentId);
  const direction = payload.direction === "up" ? 1 : payload.direction === "down" ? -1 : 0;
  if (!commentId) return respond(request, 400, { error: "댓글 정보가 올바르지 않습니다." });
  if (!direction) return respond(request, 400, { error: "추천 방향이 올바르지 않습니다." });

  const target = await db.prepare("select id from comments where id = ? and status = 'published' limit 1")
    .bind(commentId)
    .first<{ id: string }>();
  if (!target) return respond(request, 404, { error: "댓글을 찾을 수 없습니다." });

  const hash = await requestFingerprint(request, hashSalt, "comment-votes");
  const existing = await db.prepare(
    "select direction from comment_votes where comment_id = ? and ip_hash = ?"
  ).bind(commentId, hash).first<VoteRow>();

  let delta = direction;
  let userVote = direction;
  const now = new Date().toISOString();

  if (existing?.direction === direction) {
    await db.prepare("delete from comment_votes where comment_id = ? and ip_hash = ?").bind(commentId, hash).run();
    delta = -direction;
    userVote = 0;
  } else if (existing?.direction) {
    await db.prepare(
      "update comment_votes set direction = ?, updated_at = ? where comment_id = ? and ip_hash = ?"
    ).bind(direction, now, commentId, hash).run();
    delta = direction - Number(existing.direction);
  } else {
    await db.prepare(
      "insert into comment_votes (comment_id, ip_hash, direction, created_at, updated_at) values (?, ?, ?, ?, ?)"
    ).bind(commentId, hash, direction, now, now).run();
  }

  await db.prepare("update comments set score = score + ?, updated_at = ? where id = ?").bind(delta, now, commentId).run();
  const row = await db.prepare("select score from comments where id = ?").bind(commentId).first<{ score: number }>();

  return respond(request, 200, {
    commentId,
    score: Number(row?.score || 0),
    userVote
  });
}

export async function DELETE(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "댓글 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "요청을 읽을 수 없습니다." });
  }

  const commentId = normalizeParentId(payload.commentId);
  const password = typeof payload.password === "string" ? payload.password.trim() : "";
  if (!commentId || !/^\d{4}$/.test(password)) {
    return respond(request, 400, { error: "댓글과 임시비밀번호를 확인해주세요." });
  }

  const requesterHash = await requestFingerprint(request, hashSalt, "comment-delete");
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const attempts = await db.prepare(
    "select count(*) as count from guest_auth_attempts where requester_hash = ? and created_at >= ?"
  ).bind(requesterHash, since).first<CountRow>();
  if (Number(attempts?.count || 0) >= 8) {
    return respond(request, 429, { error: "삭제 확인을 여러 번 시도했습니다. 잠시 후 다시 시도해주세요." });
  }

  const expected = await sha256Hex(`${commentId}|${password}|${hashSalt}|comment-edit`);
  const row = await db.prepare("select author_password_hash as passwordHash from comments where id = ? and status = 'published'")
    .bind(commentId)
    .first<{ passwordHash: string | null }>();
  const succeeded = Boolean(row && row.passwordHash === expected);
  await db.prepare(
    "insert into guest_auth_attempts (id, target_type, target_id, requester_hash, succeeded, created_at) values (?, 'comment', ?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), commentId, requesterHash, succeeded ? 1 : 0, new Date().toISOString()).run();
  if (!succeeded) {
    return respond(request, 403, { error: "임시비밀번호가 맞지 않습니다." });
  }

  const now = new Date().toISOString();
  await db.prepare("update comments set status = 'removed', body = '작성자가 삭제한 댓글입니다.', updated_at = ? where id = ?")
    .bind(now, commentId)
    .run();
  return respond(request, 200, { ok: true });
}
