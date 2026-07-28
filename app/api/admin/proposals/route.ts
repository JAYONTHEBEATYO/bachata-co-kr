import type { NextRequest } from "next/server";
import {
  adminCategories,
  adminResponse,
  cleanAdminText,
  logAdminActivity,
  requireAdmin,
  requireTrustedAdmin,
  safeJsonArray
} from "@/lib/admin-server";
import type { AdminProposal } from "@/lib/admin-types";
import { sha256Hex } from "@/lib/community-server";
import {
  editorialFeedbackLabels,
  releaseEditorialContentClaims
} from "@/lib/editorial-automation";
import { queueThreadIndexUpdate } from "@/lib/indexnow";

const proposalStatuses = new Set(["pending", "approved", "denied", "published", "applied"]);
const priorities = new Set(["low", "normal", "high", "urgent"]);

type ProposalRow = Omit<AdminProposal, "tags" | "evidence" | "feedbackLabels"> & {
  tagsJson: string;
  evidenceJson: string;
  classificationJson?: string | null;
  feedbackLabelsJson?: string | null;
};

const mapProposal = (row: ProposalRow): AdminProposal => ({
  ...row,
  confidence: Number(row.confidence || 0),
  feedbackRating: row.feedbackRating ? Number(row.feedbackRating) : null,
  tags: safeJsonArray<string>(row.tagsJson),
  evidence: safeJsonArray<{ label?: string; url: string }>(row.evidenceJson),
  feedbackLabels: safeJsonArray<string>(row.feedbackLabelsJson)
});

const proposalSelect = `
  select p.id, p.proposal_type as proposalType, p.title, p.summary, p.body, p.category,
         p.tags_json as tagsJson, p.source_url as sourceUrl, p.source_name as sourceName,
         p.source_published_at as sourcePublishedAt, p.evidence_json as evidenceJson,
         p.rationale, p.priority, p.confidence, p.status,
         p.classification_json as classificationJson, p.review_note as reviewNote,
         p.thread_id as threadId, p.created_at as createdAt, p.reviewed_at as reviewedAt,
         f.rating as feedbackRating, f.labels_json as feedbackLabelsJson
  from admin_proposals p
  left join editorial_feedback f on f.proposal_id = p.id
`;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const requestedStatus = request.nextUrl.searchParams.get("status") || "all";
  const type = request.nextUrl.searchParams.get("type") || "all";
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (proposalStatuses.has(requestedStatus)) {
    conditions.push("p.status = ?");
    bindings.push(requestedStatus);
  }
  if (type === "content" || type === "site_improvement") {
    conditions.push("p.proposal_type = ?");
    bindings.push(type);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const rows = await auth.db.prepare(
    `${proposalSelect} ${where}
     order by case p.status when 'pending' then 0 when 'approved' then 1 else 2 end,
              case p.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
              p.created_at desc
     limit 100`
  ).bind(...bindings).all<ProposalRow>();
  return adminResponse(request, 200, { proposals: (rows.results || []).map(mapProposal) });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "검토 내용을 읽지 못했습니다." });
  }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const action = typeof payload.action === "string" ? payload.action : "save";
  const row = await auth.db.prepare(`${proposalSelect} where p.id = ? limit 1`)
    .bind(id)
    .first<ProposalRow>();
  if (!row) return adminResponse(request, 404, { error: "제안서를 찾지 못했습니다." });
  const current = mapProposal(row);

  const title = cleanAdminText(payload.title, 120) || current.title;
  const summary = cleanAdminText(payload.summary, 240);
  const body = cleanAdminText(payload.body, 8000);
  const category = typeof payload.category === "string" && adminCategories.has(payload.category)
    ? payload.category
    : current.category;
  const tags = Array.isArray(payload.tags)
    ? payload.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => cleanAdminText(tag, 24))
      .filter(Boolean)
      .slice(0, 8)
    : current.tags;
  const priority = typeof payload.priority === "string" && priorities.has(payload.priority)
    ? payload.priority
    : current.priority;
  const reviewNote = cleanAdminText(payload.reviewNote, 400);
  const requestedFeedbackRating = payload.feedbackRating;
  const feedbackRating = requestedFeedbackRating !== null
    && requestedFeedbackRating !== undefined
    && requestedFeedbackRating !== ""
    && Number.isInteger(Number(requestedFeedbackRating))
      ? Math.min(5, Math.max(1, Number(requestedFeedbackRating)))
      : current.feedbackRating || null;
  const feedbackLabels = Array.isArray(payload.feedbackLabels)
    ? payload.feedbackLabels
      .filter((label): label is string => typeof label === "string")
      .filter((label) => editorialFeedbackLabels.includes(label as typeof editorialFeedbackLabels[number]))
      .slice(0, 6)
    : current.feedbackLabels;
  const now = new Date().toISOString();

  await auth.db.prepare(
    `update admin_proposals
     set title = ?, summary = ?, body = ?, category = ?, tags_json = ?,
         priority = ?, review_note = ?, updated_at = ?
     where id = ?`
  ).bind(
    title,
    summary,
    body,
    category,
    JSON.stringify(tags),
    priority,
    reviewNote,
    now,
    id
  ).run();

  const saveEditorialFeedback = async (
    decision: "saved" | "denied" | "published" | "approved" | "applied"
  ) => {
    if (current.proposalType !== "content") return;
    await auth.db.prepare(
      `insert into editorial_feedback
        (proposal_id, decision, rating, labels_json, note,
         original_title, final_title, original_category, final_category,
         original_tags_json, final_tags_json, updated_by, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(proposal_id) do update set
         decision = excluded.decision,
         rating = excluded.rating,
         labels_json = excluded.labels_json,
         note = excluded.note,
         final_title = excluded.final_title,
         final_category = excluded.final_category,
         final_tags_json = excluded.final_tags_json,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    ).bind(
      id,
      decision,
      feedbackRating,
      JSON.stringify(feedbackLabels),
      reviewNote,
      current.title,
      title,
      current.category,
      category,
      JSON.stringify(current.tags),
      JSON.stringify(tags),
      auth.user?.id || null,
      now
    ).run();
  };

  if (action === "deny") {
    await auth.db.prepare(
      "update admin_proposals set status = 'denied', reviewed_by = ?, reviewed_at = ?, updated_at = ? where id = ?"
    ).bind(auth.user?.id || null, now, now, id).run();
    await saveEditorialFeedback("denied");
    await releaseEditorialContentClaims(auth.db, id);
    await logAdminActivity(auth.db, auth.user?.id || null, "AI 제안 거절", "proposal", id, { title });
    return adminResponse(request, 200, { ok: true, status: "denied" });
  }

  if (action === "approve" && current.proposalType === "site_improvement") {
    await auth.db.prepare(
      "update admin_proposals set status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? where id = ?"
    ).bind(auth.user?.id || null, now, now, id).run();
    await logAdminActivity(auth.db, auth.user?.id || null, "개선안 승인", "proposal", id, { title });
    return adminResponse(request, 200, { ok: true, status: "approved" });
  }

  if (action === "apply" && current.proposalType === "site_improvement") {
    await auth.db.prepare(
      "update admin_proposals set status = 'applied', reviewed_by = ?, reviewed_at = coalesce(reviewed_at, ?), updated_at = ? where id = ?"
    ).bind(auth.user?.id || null, now, now, id).run();
    await logAdminActivity(auth.db, auth.user?.id || null, "개선 적용 완료", "proposal", id, { title });
    return adminResponse(request, 200, { ok: true, status: "applied" });
  }

  if (action === "publish" && current.proposalType === "content") {
    if (current.threadId) {
      return adminResponse(request, 409, { error: "이미 게시된 콘텐츠입니다." });
    }
    if (title.length < 4 || body.length < 120) {
      return adminResponse(request, 400, { error: "제목과 본문을 충분히 다듬은 뒤 게시해주세요." });
    }

    const threadId = crypto.randomUUID();
    const tagLine = tags.length ? `\n\n${tags.map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ")}` : "";
    const editKey = await sha256Hex(`admin-proposal|${threadId}|${crypto.randomUUID()}`);
    await auth.db.prepare(
      `insert into guest_threads
        (id, title, body, category, link_url, guest_id, ip_prefix, ip_hash,
         edit_key_hash, user_id, status, score, downvotes, is_featured,
         created_at, updated_at)
       values (?, ?, ?, ?, ?, '바차타 코리아 편집부', '관리자', null, ?, ?,
               'published', 0, 0, 1, ?, ?)`
    ).bind(
      threadId,
      title,
      `${body}${tagLine}`.slice(0, 8000),
      category,
      current.sourceUrl || null,
      editKey,
      auth.user?.id || null,
      now,
      now
    ).run();
    await auth.db.prepare(
      `update admin_proposals
       set status = 'published', reviewed_by = ?, reviewed_at = ?, published_at = ?,
           thread_id = ?, updated_at = ?
       where id = ?`
    ).bind(auth.user?.id || null, now, now, threadId, now, id).run();
    await auth.db.prepare(
      `insert into thread_editorial_metadata
        (thread_id, proposal_id, tags_json, classification_json, created_at)
       values (?, ?, ?, ?, ?)`
    ).bind(
      threadId,
      id,
      JSON.stringify(tags),
      current.classificationJson || "{}",
      now
    ).run();
    for (const tag of tags) {
      await auth.db.prepare(
        `insert or ignore into thread_tags (thread_id, tag, source, created_at)
         values (?, ?, 'editorial', ?)`
      ).bind(threadId, tag, now).run();
    }
    await saveEditorialFeedback("published");
    await logAdminActivity(auth.db, auth.user?.id || null, "콘텐츠 승인 게시", "thread", threadId, { proposalId: id, title });
    await queueThreadIndexUpdate(threadId);
    return adminResponse(request, 200, {
      ok: true,
      status: "published",
      threadId,
      threadPath: `/g/${threadId}`
    });
  }

  await saveEditorialFeedback("saved");
  await logAdminActivity(auth.db, auth.user?.id || null, "제안서 편집", "proposal", id, { title });
  return adminResponse(request, 200, { ok: true, status: current.status });
}
