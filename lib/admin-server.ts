import type { NextRequest } from "next/server";
import { getSessionUserForRequest } from "@/lib/auth-server";
import {
  getCommunityContext,
  hasTrustedRequestOrigin,
  jsonHeaders,
  type D1DatabaseBinding
} from "@/lib/community-server";
import type { SessionUser } from "@/lib/types";

export const adminCategories = new Set([
  "questions",
  "video",
  "events",
  "promotion",
  "free",
  "academyReview",
  "dancerReview",
  "socialReview",
  "poll",
  "ama"
]);

export const adminResponse = (
  request: NextRequest,
  status: number,
  body: unknown,
  methods = "GET,POST,PATCH,DELETE,OPTIONS"
) => Response.json(body, {
  status,
  headers: {
    ...jsonHeaders(request, methods),
    "cache-control": "no-store"
  }
});

export const requireAdmin = async (
  request: NextRequest,
  options?: { allowAutomation?: boolean }
): Promise<{
  ok: true;
  db: D1DatabaseBinding;
  user: SessionUser | null;
  automated: boolean;
} | {
  ok: false;
  response: Response;
}> => {
  const context = await getCommunityContext();
  if (!context.db) {
    return {
      ok: false,
      response: adminResponse(request, 503, { error: "관리자 저장소가 연결되지 않았습니다." })
    };
  }

  const authorization = request.headers.get("authorization");
  const automated = Boolean(
    options?.allowAutomation
    && context.automationToken
    && authorization === `Bearer ${context.automationToken}`
  );
  if (automated) {
    return { ok: true, db: context.db, user: null, automated: true };
  }

  const user = await getSessionUserForRequest(request, context.db);
  if (!user || user.role !== "admin") {
    return {
      ok: false,
      response: adminResponse(request, 403, { error: "관리자 권한이 필요합니다." })
    };
  }
  return { ok: true, db: context.db, user, automated: false };
};

export const requireTrustedAdmin = async (
  request: NextRequest,
  options?: { allowAutomation?: boolean }
) => {
  if (!hasTrustedRequestOrigin(request) && !options?.allowAutomation) {
    return {
      ok: false as const,
      response: adminResponse(request, 403, { error: "허용되지 않은 요청입니다." })
    };
  }
  return requireAdmin(request, options);
};

export const logAdminActivity = async (
  db: D1DatabaseBinding,
  userId: string | null,
  action: string,
  targetType: string,
  targetId?: string | null,
  detail: Record<string, unknown> = {}
) => {
  await db.prepare(
    `insert into admin_activity_log
      (id, user_id, action, target_type, target_id, detail_json, created_at)
     values (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    userId,
    action.slice(0, 80),
    targetType.slice(0, 40),
    targetId || null,
    JSON.stringify(detail).slice(0, 2000),
    new Date().toISOString()
  ).run();
};

export const cleanAdminText = (value: unknown, max = 500) => {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, max);
};

export const cleanSlug = (value: unknown) => {
  const text = typeof value === "string" ? value : "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
};

export const safeJsonArray = <T>(value: string | null | undefined): T[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};
