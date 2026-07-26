import type { NextRequest } from "next/server";
import {
  adminResponse,
  logAdminActivity,
  requireAdmin,
  requireTrustedAdmin
} from "@/lib/admin-server";
import type { AdminReport } from "@/lib/admin-types";

const statuses = new Set(["open", "reviewed", "dismissed", "actioned"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const rows = await auth.db.prepare(
    `select r.id, r.target_type as targetType, r.target_id as targetId,
            case when r.target_type = 'comment' then c.thread_id else r.target_id end as threadId,
            r.reason, r.detail, r.status, r.created_at as createdAt
     from reports r
     left join comments c on r.target_type = 'comment' and c.id = r.target_id
     order by case r.status when 'open' then 0 else 1 end, r.created_at desc
     limit 80`
  ).all<AdminReport>();

  return adminResponse(request, 200, { reports: rows.results });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "처리 내용을 읽지 못했습니다." });
  }
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const status = typeof payload.status === "string" ? payload.status : "";
  if (!id || !statuses.has(status)) {
    return adminResponse(request, 400, { error: "신고 처리 상태를 확인해주세요." });
  }

  await auth.db.prepare("update reports set status = ? where id = ?").bind(status, id).run();
  await logAdminActivity(
    auth.db,
    auth.user?.id || null,
    "신고 상태 변경",
    "report",
    id,
    { status }
  );
  return adminResponse(request, 200, { ok: true });
}
