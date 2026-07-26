import type { NextRequest } from "next/server";
import {
  adminResponse,
  logAdminActivity,
  requireAdmin,
  requireTrustedAdmin
} from "@/lib/admin-server";
import type { AdminRun, AdminSource } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const [sourceRows, runRows] = await Promise.all([
    auth.db.prepare(
      `select id, name, source_type as sourceType, url, enabled,
              last_status as lastStatus, last_run_at as lastRunAt,
              last_success_at as lastSuccessAt, error_count as errorCount
       from content_sources order by enabled desc, name`
    ).all<Omit<AdminSource, "enabled"> & { enabled: number }>(),
    auth.db.prepare(
      `select id, run_type as runType, status, signals_count as signalsCount,
              proposals_count as proposalsCount, started_at as startedAt,
              completed_at as completedAt
       from admin_automation_runs order by started_at desc limit 20`
    ).all<AdminRun>()
  ]);
  return adminResponse(request, 200, {
    sources: (sourceRows.results || []).map((row) => ({
      ...row,
      enabled: Boolean(row.enabled),
      errorCount: Number(row.errorCount || 0)
    })),
    runs: (runRows.results || []).map((row) => ({
      ...row,
      signalsCount: Number(row.signalsCount || 0),
      proposalsCount: Number(row.proposalsCount || 0)
    }))
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "수집기 설정을 읽지 못했습니다." });
  }
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!id || typeof payload.enabled !== "boolean") {
    return adminResponse(request, 400, { error: "수집기 설정을 확인해주세요." });
  }
  const enabled = Number(payload.enabled);
  await auth.db.prepare(
    `update content_sources
     set enabled = ?, last_status = ?, updated_at = ?
     where id = ?`
  ).bind(enabled, enabled ? "waiting" : "disabled", new Date().toISOString(), id).run();
  await logAdminActivity(auth.db, auth.user?.id || null, "수집기 설정 변경", "source", id, { enabled: Boolean(enabled) });
  return adminResponse(request, 200, { ok: true });
}
