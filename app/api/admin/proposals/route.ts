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
import { queueThreadIndexUpdate } from "@/lib/indexnow";

const proposalStatuses = new Set(["pending", "approved", "denied", "published", "applied"]);
const priorities = new Set(["low", "normal", "high", "urgent"]);

type ProposalRow = Omit<AdminProposal, "tags" | "evidence"> & {
  tagsJson: string;
  evidenceJson: string;
};

const mapProposal = (row: ProposalRow): AdminProposal => ({
  ...row,
  confidence: Number(row.confidence || 0),
  tags: safeJsonArray<string>(row.tagsJson),
  evidence: safeJsonArray<{ label?: string; url: string }>(row.evidenceJson)
});

const proposalSelect = `
  select id, proposal_type as proposalType, title, summary, body, category,
         tags_json as tagsJson, source_url as sourceUrl, source_name as sourceName,
         source_published_at as sourcePublishedAt, evidence_json as evidenceJson,
         rationale, priority, confidence, status, thread_id as threadId,
         created_at as createdAt, reviewed_at as reviewedAt
  from admin_proposals
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
    conditions.push("status = ?");
    bindings.push(requestedStatus);
  }
  if (type === "content" || type === "site_improvement") {
    conditions.push("proposal_type = ?");
    bindings.push(type);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const rows = await auth.db.prepare(
    `${proposalSelect} ${where}
     order by case status when 'pending' then 0 when 'approved' then 1 else 2 end,
              case priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
              created_at desc
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
  const row = await auth.db.prepare(`${proposalSelect} where id = ? limit 1`)
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

  if (action === "deny") {
    await auth.db.prepare(
      "update admin_proposals set status = 'denied', reviewed_by = ?, reviewed_at = ?, updated_at = ? where id = ?"
    ).bind(auth.user?.id || null, now, now, id).run();
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
    await logAdminActivity(auth.db, auth.user?.id || null, "콘텐츠 승인 게시", "thread", threadId, { proposalId: id, title });
    await queueThreadIndexUpdate(threadId);
    return adminResponse(request, 200, {
      ok: true,
      status: "published",
      threadId,
      threadPath: `/g/${threadId}`
    });
  }

  await logAdminActivity(auth.db, auth.user?.id || null, "제안서 편집", "proposal", id, { title });
  return adminResponse(request, 200, { ok: true, status: current.status });
}
