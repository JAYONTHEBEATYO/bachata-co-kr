import type { NextRequest } from "next/server";
import { getSessionUserForRequest } from "@/lib/auth-server";
import {
  getCommunityContext,
  hasTrustedRequestOrigin,
  jsonHeaders,
  sha256Hex
} from "@/lib/community-server";

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, {
    status,
    headers: {
      ...jsonHeaders(request, "POST,OPTIONS"),
      "cache-control": "no-store"
    }
  });

const validClientId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{12,100}$/.test(text) ? text : "";
};

const validEventId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{12,100}$/.test(text) ? text : "";
};

const cleanPath = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "/";
  if (!text.startsWith("/") || text.startsWith("//")) return "/";
  return text.split("?")[0].slice(0, 300) || "/";
};

const cleanReferrer = (value: unknown) => {
  if (typeof value !== "string" || !value) return "";
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return ["bachata.co.kr", "www.bachata.co.kr"].includes(hostname) ? "" : hostname.slice(0, 120);
  } catch {
    return "";
  }
};

const deviceType = (userAgent: string) => {
  if (/bot|crawler|spider|slurp|preview/i.test(userAgent)) return "bot";
  if (/ipad|tablet|kindle/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
};

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(request, "POST,OPTIONS")
  });
}

export async function POST(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return respond(request, 403, { error: "허용되지 않은 요청입니다." });
  }

  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 202, { ok: true });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "분석 이벤트를 읽지 못했습니다." });
  }

  const action = payload.action === "end" ? "end" : "start";
  const eventId = validEventId(payload.eventId);
  if (!eventId) return respond(request, 400, { error: "이벤트 식별자가 올바르지 않습니다." });

  if (action === "end") {
    const duration = Math.max(0, Math.min(14_400, Math.floor(Number(payload.duration) || 0)));
    const maxScroll = Math.max(0, Math.min(100, Math.floor(Number(payload.maxScroll) || 0)));
    await db.prepare(
      `update analytics_pageviews
       set duration_seconds = max(duration_seconds, ?),
           max_scroll = max(max_scroll, ?),
           ended_at = ?,
           updated_at = ?
       where id = ?`
    ).bind(duration, maxScroll, new Date().toISOString(), new Date().toISOString(), eventId).run();
    return respond(request, 200, { ok: true });
  }

  const visitorId = validClientId(payload.visitorId);
  const sessionId = validClientId(payload.sessionId);
  if (!visitorId || !sessionId) {
    return respond(request, 400, { error: "방문 세션 정보가 올바르지 않습니다." });
  }

  const visitorHash = await sha256Hex(`${hashSalt}|analytics-visitor|${visitorId}`);
  const sessionHash = await sha256Hex(`${hashSalt}|analytics-session|${sessionId}`);
  const path = cleanPath(payload.path);
  if (path.startsWith("/admin") || path.startsWith("/api")) {
    return respond(request, 202, { ok: true });
  }

  const user = await getSessionUserForRequest(request, db);
  const now = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") || "";
  const country = (request.headers.get("cf-ipcountry") || "").toUpperCase().slice(0, 2);

  await db.prepare(
    `insert or ignore into analytics_pageviews
      (id, visitor_hash, session_hash, user_id, path, referrer_host, device_type,
       country_code, duration_seconds, max_scroll, started_at, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
  ).bind(
    eventId,
    visitorHash,
    sessionHash,
    user?.id || null,
    path,
    cleanReferrer(payload.referrer),
    deviceType(userAgent),
    country,
    now,
    now,
    now
  ).run();

  return respond(request, 201, { ok: true });
}
