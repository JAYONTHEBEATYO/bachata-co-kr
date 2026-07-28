import type { D1DatabaseBinding } from "@/lib/community-server";
import { sha256Hex } from "@/lib/community-server";

export const editorialCadenceOptions = [6, 12, 24, 48, 72, 168] as const;
export const editorialFeedbackLabels = [
  "좋은 주제",
  "자연스러운 문장",
  "중복 콘텐츠",
  "주제가 약함",
  "한국어가 어색함",
  "분류가 틀림",
  "태그가 부정확함",
  "출처가 부족함",
  "사실 확인 필요"
] as const;

export type EditorialAutomationSettings = {
  enabled: boolean;
  cadenceHours: number;
  preferredHourKst: number;
  candidateLimit: number;
  duplicateWindowDays: number;
  feedbackLookback: number;
  nextRunAt?: string | null;
  lastStartedAt?: string | null;
  lastCompletedAt?: string | null;
  updatedAt?: string | null;
};

type EditorialAutomationSettingsRow = {
  enabled: number;
  cadenceHours: number;
  preferredHourKst: number;
  candidateLimit: number;
  duplicateWindowDays: number;
  feedbackLookback: number;
  nextRunAt?: string | null;
  lastStartedAt?: string | null;
  lastCompletedAt?: string | null;
  updatedAt?: string | null;
};

export const defaultEditorialAutomationSettings: EditorialAutomationSettings = {
  enabled: true,
  cadenceHours: 24,
  preferredHourKst: 9,
  candidateLimit: 2,
  duplicateWindowDays: 90,
  feedbackLookback: 30,
  nextRunAt: null,
  lastStartedAt: null,
  lastCompletedAt: null,
  updatedAt: null
};

const toBoundedInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export const normalizeEditorialSettings = (
  value: Partial<EditorialAutomationSettings>,
  fallback = defaultEditorialAutomationSettings
): EditorialAutomationSettings => ({
  enabled: typeof value.enabled === "boolean" ? value.enabled : fallback.enabled,
  cadenceHours: editorialCadenceOptions.includes(Number(value.cadenceHours) as typeof editorialCadenceOptions[number])
    ? Number(value.cadenceHours)
    : fallback.cadenceHours,
  preferredHourKst: toBoundedInteger(value.preferredHourKst, fallback.preferredHourKst, 0, 23),
  candidateLimit: toBoundedInteger(value.candidateLimit, fallback.candidateLimit, 1, 4),
  duplicateWindowDays: toBoundedInteger(value.duplicateWindowDays, fallback.duplicateWindowDays, 7, 365),
  feedbackLookback: toBoundedInteger(value.feedbackLookback, fallback.feedbackLookback, 5, 100),
  nextRunAt: value.nextRunAt ?? fallback.nextRunAt,
  lastStartedAt: value.lastStartedAt ?? fallback.lastStartedAt,
  lastCompletedAt: value.lastCompletedAt ?? fallback.lastCompletedAt,
  updatedAt: value.updatedAt ?? fallback.updatedAt
});

export const calculateNextEditorialRun = (
  now: Date,
  cadenceHours: number,
  preferredHourKst: number
) => {
  if (cadenceHours < 24) {
    return new Date(now.getTime() + cadenceHours * 60 * 60_000).toISOString();
  }

  const kstOffset = 9 * 60 * 60_000;
  const kstNow = new Date(now.getTime() + kstOffset);
  let next = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
    preferredHourKst - 9,
    0,
    0,
    0
  );
  const cycleDays = Math.max(1, Math.round(cadenceHours / 24));
  if (next <= now.getTime() + 60_000) next += cycleDays * 24 * 60 * 60_000;
  return new Date(next).toISOString();
};

export const readEditorialAutomationSettings = async (db: D1DatabaseBinding) => {
  const row = await db.prepare(
    `select enabled, cadence_hours as cadenceHours,
            preferred_hour_kst as preferredHourKst,
            candidate_limit as candidateLimit,
            duplicate_window_days as duplicateWindowDays,
            feedback_lookback as feedbackLookback,
            next_run_at as nextRunAt,
            last_started_at as lastStartedAt,
            last_completed_at as lastCompletedAt,
            updated_at as updatedAt
     from editorial_automation_settings
     where id = 'ai_content'
     limit 1`
  ).first<EditorialAutomationSettingsRow>();
  if (!row) return defaultEditorialAutomationSettings;
  return normalizeEditorialSettings({
    ...row,
    enabled: Boolean(row.enabled)
  });
};

export const isEditorialScheduleDue = (
  settings: EditorialAutomationSettings,
  now = new Date()
) => settings.enabled && (!settings.nextRunAt || Date.parse(settings.nextRunAt) <= now.getTime());

export const claimEditorialSchedule = async (
  db: D1DatabaseBinding,
  settings: EditorialAutomationSettings,
  now = new Date()
) => {
  if (!isEditorialScheduleDue(settings, now)) return false;
  const startedAt = now.toISOString();
  const nextRunAt = calculateNextEditorialRun(now, settings.cadenceHours, settings.preferredHourKst);
  const result = await db.prepare(
    `update editorial_automation_settings
     set last_started_at = ?, next_run_at = ?, updated_at = ?
     where id = 'ai_content'
       and enabled = 1
       and (next_run_at is null or next_run_at <= ?)`
  ).bind(startedAt, nextRunAt, startedAt, startedAt).run() as {
    meta?: { changes?: number };
  };
  return Number(result?.meta?.changes || 0) > 0;
};

export const markEditorialScheduleCompleted = async (
  db: D1DatabaseBinding,
  completedAt = new Date().toISOString()
) => {
  await db.prepare(
    `update editorial_automation_settings
     set last_completed_at = ?, updated_at = ?
     where id = 'ai_content'`
  ).bind(completedAt, completedAt).run();
};

export const markEditorialScheduleFailed = async (
  db: D1DatabaseBinding,
  now = new Date()
) => {
  const retryAt = new Date(now.getTime() + 60 * 60_000).toISOString();
  await db.prepare(
    `update editorial_automation_settings
     set next_run_at = ?, updated_at = ?
     where id = 'ai_content' and enabled = 1`
  ).bind(retryAt, now.toISOString()).run();
};

const resultChanges = (result: unknown) => Number(
  (result as { meta?: { changes?: number } } | null)?.meta?.changes || 0
);

export const claimEditorialRunLock = async (
  db: D1DatabaseBinding,
  ownerId: string,
  now = new Date()
) => {
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 12 * 60_000).toISOString();
  const result = await db.prepare(
    `insert into editorial_run_locks (lock_key, owner_id, expires_at, updated_at)
     values ('ai_content', ?, ?, ?)
     on conflict(lock_key) do update set
       owner_id = excluded.owner_id,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at
     where editorial_run_locks.expires_at <= ?`
  ).bind(ownerId, expiresAt, startedAt, startedAt).run();
  return resultChanges(result) > 0;
};

export const releaseEditorialRunLock = async (
  db: D1DatabaseBinding,
  ownerId: string
) => {
  await db.prepare(
    "delete from editorial_run_locks where lock_key = 'ai_content' and owner_id = ?"
  ).bind(ownerId).run();
};

export const claimEditorialContentKeys = async (
  db: D1DatabaseBinding,
  proposalId: string,
  canonicalUrl: string,
  fingerprint: string,
  duplicateWindowDays: number,
  now = new Date()
) => {
  const createdAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + duplicateWindowDays * 24 * 60 * 60_000
  ).toISOString();
  const cutoff = new Date(
    now.getTime() - duplicateWindowDays * 24 * 60 * 60_000
  ).toISOString();
  const keys = [
    isSpecificEditorialUrl(canonicalUrl) ? `url:${canonicalUrl}` : "",
    fingerprint ? `fingerprint:${fingerprint}` : ""
  ].filter(Boolean);
  if (!keys.length) return false;
  const values = keys.map(() => "(?, ?, ?, ?)").join(", ");
  const bindings = keys.flatMap((key) => [key, proposalId, createdAt, expiresAt]);
  const result = await db.prepare(
    `insert into editorial_dedupe_claims
       (claim_key, proposal_id, created_at, expires_at)
     values ${values}
     on conflict(claim_key) do update set
       proposal_id = excluded.proposal_id,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at
     where editorial_dedupe_claims.expires_at <= ?
        or editorial_dedupe_claims.created_at <= ?`
  ).bind(...bindings, createdAt, cutoff).run();
  if (resultChanges(result) === keys.length) return true;
  await releaseEditorialContentClaims(db, proposalId);
  return false;
};

export const releaseEditorialContentClaims = async (
  db: D1DatabaseBinding,
  proposalId: string
) => {
  await db.prepare(
    "delete from editorial_dedupe_claims where proposal_id = ?"
  ).bind(proposalId).run();
};

const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "igsh",
  "si",
  "source",
  "ref",
  "feature"
]);

export const canonicalizeEditorialUrl = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || trackingParameters.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.hostname === "m.youtube.com" || url.hostname === "music.youtube.com") {
      url.hostname = "youtube.com";
    }

    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      if (videoId) {
        url.hostname = "youtube.com";
        url.pathname = "/watch";
        url.search = "";
        url.searchParams.set("v", videoId);
      }
    } else if (url.hostname.endsWith("youtube.com") && url.pathname.startsWith("/shorts/")) {
      const videoId = url.pathname.split("/").filter(Boolean)[1];
      if (videoId) {
        url.pathname = "/watch";
        url.search = "";
        url.searchParams.set("v", videoId);
      }
    }

    if (url.hostname === "youtube.com") {
      for (const key of ["t", "start", "list", "index", "pp", "ab_channel"]) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return "";
  }
};

export const isSpecificEditorialUrl = (value: unknown) => {
  const canonical = canonicalizeEditorialUrl(value);
  if (!canonical) return false;
  try {
    const url = new URL(canonical);
    if (url.pathname !== "/") return true;
    return [...url.searchParams.keys()].some((key) => ["v", "id", "articleid", "no"].includes(key.toLowerCase()));
  } catch {
    return false;
  }
};

export const normalizeEditorialText = (value: unknown) => (
  typeof value === "string" ? value : ""
)
  .normalize("NFKC")
  .toLowerCase()
  .replace(/https?:\/\/\S+/g, " ")
  .replace(/[^0-9a-z가-힣\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const editorialTokens = (value: unknown) => new Set(
  normalizeEditorialText(value)
    .split(" ")
    .filter((token) => token.length >= 2)
);

export const editorialTextSimilarity = (left: unknown, right: unknown) => {
  const a = editorialTokens(left);
  const b = editorialTokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / Math.max(1, a.size + b.size - intersection);
};

export const createEditorialFingerprint = async (
  title: unknown,
  summary: unknown
) => sha256Hex(`${normalizeEditorialText(title)}|${normalizeEditorialText(summary)}`);

const tagRules: Array<[RegExp, string]> = [
  [/센슈얼|sensual/i, "센슈얼"],
  [/도미니칸|dominican/i, "도미니칸"],
  [/트레디셔널|traditional/i, "트레디셔널"],
  [/인플루언스|influence/i, "인플루언스"],
  [/풋워크|footwork/i, "풋워크"],
  [/레이디\s*스타일|lady\s*style/i, "레이디 스타일"],
  [/맨즈?\s*스타일|men'?s?\s*style/i, "맨즈 스타일"],
  [/소셜|social/i, "소셜"],
  [/페스티벌|festival/i, "페스티벌"],
  [/워크숍|워크샵|workshop/i, "워크숍"],
  [/공연|퍼포먼스|performance/i, "공연"],
  [/강습|수업|클래스|class/i, "강습"],
  [/음악|노래|music|song/i, "바차타 음악"],
  [/안전|부상|매너/i, "안전·매너"]
];

export const inferEditorialTags = (...values: unknown[]) => {
  const text = values.map((value) => typeof value === "string" ? value : "").join(" ");
  return tagRules.filter(([pattern]) => pattern.test(text)).map(([, tag]) => tag);
};

export const mergeEditorialTags = (...groups: string[][]) => {
  const tags = groups.flatMap((group) => group)
    .map((tag) => tag.normalize("NFKC").replace(/^#+/, "").trim())
    .filter((tag) => tag.length >= 2 && tag.length <= 16);
  return [...new Set(["바차타", ...tags])].slice(0, 8);
};

export const inferEditorialCategory = (
  requested: unknown,
  title: unknown,
  body: unknown,
  sourceType: unknown,
  validCategories: Set<string>
) => {
  const text = `${title || ""} ${body || ""}`;
  if (/페스티벌|행사|워크숍|워크샵|내한|일정/i.test(text)) return "events";
  if (/강습|수업|모집|신청|홍보/i.test(text)) return "promotion";
  if (/질문|궁금|어떻게|무엇/i.test(text)) return "questions";
  if (String(sourceType || "").includes("video") || /영상|릴스|쇼츠/i.test(text)) return "video";
  if (typeof requested === "string" && validCategories.has(requested)) return requested;
  return "free";
};
