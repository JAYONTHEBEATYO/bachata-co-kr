import type { NextRequest } from "next/server";
import {
  adminResponse,
  cleanAdminText,
  logAdminActivity,
  requireAdmin,
  requireTrustedAdmin
} from "@/lib/admin-server";
import type { AdminThread } from "@/lib/admin-types";

const statuses = new Set(["published", "hidden", "removed"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const status = request.nextUrl.searchParams.get("status") || "all";
  const search = cleanAdminText(request.nextUrl.searchParams.get("q"), 80);
  const conditions = ["1 = 1"];
  const bindings: unknown[] = [];
  if (statuses.has(status)) {
    conditions.push("g.status = ?");
    bindings.push(status);
  }
  if (search) {
    conditions.push("(g.title like ? or g.body like ? or g.guest_id like ?)");
    const pattern = `%${search}%`;
    bindings.push(pattern, pattern, pattern);
  }

  const rows = await auth.db.prepare(
    `select g.id, g.title, g.category,
            coalesce(u.display_name, g.guest_id) as author,
            g.status, g.score, g.downvotes,
            g.is_pinned as isPinned, g.is_featured as isFeatured,
            g.created_at as createdAt,
            (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
     from guest_threads g
     left join users u on u.id = g.user_id
     where ${conditions.join(" and ")}
     order by g.is_pinned desc, g.created_at desc
     limit 60`
  ).bind(...bindings).all<{
    id: string;
    title: string;
    category: string;
    author: string;
    status: AdminThread["status"];
    score: number;
    downvotes: number;
    commentCount: number;
    isPinned: number;
    isFeatured: number;
    createdAt: string;
  }>();

  const threads: AdminThread[] = (rows.results || []).map((row) => ({
    ...row,
    score: Number(row.score || 0),
    downvotes: Number(row.downvotes || 0),
    commentCount: Number(row.commentCount || 0),
    isPinned: Boolean(row.isPinned),
    isFeatured: Boolean(row.isFeatured)
  }));
  return adminResponse(request, 200, { threads });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "변경 내용을 읽지 못했습니다." });
  }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return adminResponse(request, 400, { error: "게시물 정보가 올바르지 않습니다." });
  }

  const current = await auth.db.prepare(
    "select id, status, is_pinned as isPinned, is_featured as isFeatured from guest_threads where id = ? limit 1"
  ).bind(id).first<{ id: string; status: string; isPinned: number; isFeatured: number }>();
  if (!current) return adminResponse(request, 404, { error: "게시물을 찾지 못했습니다." });

  const status = typeof payload.status === "string" && statuses.has(payload.status)
    ? payload.status
    : current.status;
  const isPinned = typeof payload.isPinned === "boolean"
    ? Number(payload.isPinned)
    : Number(current.isPinned);
  const isFeatured = typeof payload.isFeatured === "boolean"
    ? Number(payload.isFeatured)
    : Number(current.isFeatured);
  const moderationNote = cleanAdminText(payload.moderationNote, 300);

  await auth.db.prepare(
    `update guest_threads
     set status = ?, is_pinned = ?, is_featured = ?, moderation_note = ?, updated_at = ?
     where id = ?`
  ).bind(status, isPinned, isFeatured, moderationNote, new Date().toISOString(), id).run();
  await logAdminActivity(
    auth.db,
    auth.user?.id || null,
    "게시물 설정 변경",
    "thread",
    id,
    { status, isPinned: Boolean(isPinned), isFeatured: Boolean(isFeatured) }
  );

  return adminResponse(request, 200, { ok: true });
}
