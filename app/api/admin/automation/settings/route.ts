import type { NextRequest } from "next/server";
import {
  adminResponse,
  logAdminActivity,
  requireAdmin,
  requireTrustedAdmin
} from "@/lib/admin-server";
import {
  calculateNextEditorialRun,
  editorialCadenceOptions,
  editorialFeedbackLabels,
  isEditorialScheduleDue,
  normalizeEditorialSettings,
  readEditorialAutomationSettings
} from "@/lib/editorial-automation";

type FeedbackStatsRow = {
  total: number;
  averageRating: number;
  positive: number;
  negative: number;
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, { allowAutomation: true });
  if (!auth.ok) return auth.response;

  const settings = await readEditorialAutomationSettings(auth.db);
  if (auth.automated) {
    return adminResponse(request, 200, {
      enabled: settings.enabled,
      due: isEditorialScheduleDue(settings),
      nextRunAt: settings.nextRunAt
    });
  }

  const feedback = await auth.db.prepare(
    `select count(*) as total,
            round(coalesce(avg(rating), 0), 1) as averageRating,
            sum(case when rating >= 4 then 1 else 0 end) as positive,
            sum(case when rating <= 2 then 1 else 0 end) as negative
     from editorial_feedback`
  ).first<FeedbackStatsRow>();

  return adminResponse(request, 200, {
    settings,
    options: {
      cadenceHours: editorialCadenceOptions,
      feedbackLabels: editorialFeedbackLabels
    },
    feedback: {
      total: Number(feedback?.total || 0),
      averageRating: Number(feedback?.averageRating || 0),
      positive: Number(feedback?.positive || 0),
      negative: Number(feedback?.negative || 0)
    }
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "AI 콘텐츠 실행 설정을 읽지 못했습니다." });
  }

  const current = await readEditorialAutomationSettings(auth.db);
  const requestedCadence = Number(payload.cadenceHours);
  if (!editorialCadenceOptions.includes(requestedCadence as typeof editorialCadenceOptions[number])) {
    return adminResponse(request, 400, { error: "지원하지 않는 실행 주기입니다." });
  }
  if (typeof payload.enabled !== "boolean") {
    return adminResponse(request, 400, { error: "실행 여부를 확인해주세요." });
  }

  const settings = normalizeEditorialSettings({
    enabled: payload.enabled,
    cadenceHours: requestedCadence,
    preferredHourKst: Number(payload.preferredHourKst),
    candidateLimit: Number(payload.candidateLimit),
    duplicateWindowDays: Number(payload.duplicateWindowDays),
    feedbackLookback: Number(payload.feedbackLookback)
  }, current);
  const now = new Date();
  const nextRunAt = settings.enabled
    ? calculateNextEditorialRun(now, settings.cadenceHours, settings.preferredHourKst)
    : current.nextRunAt;

  await auth.db.prepare(
    `update editorial_automation_settings
     set enabled = ?, cadence_hours = ?, preferred_hour_kst = ?,
         candidate_limit = ?, duplicate_window_days = ?,
         feedback_lookback = ?, next_run_at = ?, updated_by = ?, updated_at = ?
     where id = 'ai_content'`
  ).bind(
    Number(settings.enabled),
    settings.cadenceHours,
    settings.preferredHourKst,
    settings.candidateLimit,
    settings.duplicateWindowDays,
    settings.feedbackLookback,
    nextRunAt,
    auth.user?.id || null,
    now.toISOString()
  ).run();

  await logAdminActivity(
    auth.db,
    auth.user?.id || null,
    "AI 콘텐츠 실행 주기 변경",
    "automation_settings",
    "ai_content",
    {
      enabled: settings.enabled,
      cadenceHours: settings.cadenceHours,
      preferredHourKst: settings.preferredHourKst,
      candidateLimit: settings.candidateLimit,
      duplicateWindowDays: settings.duplicateWindowDays,
      feedbackLookback: settings.feedbackLookback
    }
  );

  return adminResponse(request, 200, {
    ok: true,
    settings: {
      ...settings,
      nextRunAt,
      updatedAt: now.toISOString()
    }
  });
}
