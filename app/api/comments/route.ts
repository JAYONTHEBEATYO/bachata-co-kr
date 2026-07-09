import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { displayIpPrefix, normalizeStoredIpPrefix } from "@/lib/ip-display";
import { displayGuestNickname, randomKoreanNickname } from "@/lib/nicknames";

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
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    vary: "Origin"
  };
};

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const getCommentsDb = async (): Promise<D1DatabaseBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).COMMENTS_DB as D1DatabaseBinding | undefined) || null;
  } catch {
    return null;
  }
};

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

const ipHash = async (request: NextRequest) => {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip}|${day}|bachata-comments-v1`)
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 40);
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

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
  const db = await getCommentsDb();
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
  const db = await getCommentsDb();
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

  const ip = getIp(request);
  const hash = await ipHash(request);
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
  const passwordHash = await sha256Hex(`${id}|${authorPassword}|bachata-comment-key-v1`);

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
  const db = await getCommentsDb();
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

  await db.prepare(
    `create table if not exists comment_votes (
      comment_id text not null,
      ip_hash text not null,
      direction integer not null check(direction in (-1, 1)),
      created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      primary key (comment_id, ip_hash)
    )`
  ).run();
  await db.prepare("create index if not exists comment_votes_comment_idx on comment_votes(comment_id)").run();

  const hash = await ipHash(request);
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
