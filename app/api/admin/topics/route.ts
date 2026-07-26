import type { NextRequest } from "next/server";
import {
  adminCategories,
  adminResponse,
  cleanAdminText,
  cleanSlug,
  logAdminActivity,
  requireAdmin,
  requireTrustedAdmin
} from "@/lib/admin-server";
import type { AdminTopic } from "@/lib/admin-types";
import type { D1DatabaseBinding } from "@/lib/community-server";

const statuses = new Set(["active", "hidden", "archived"]);
const validColor = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : "#ff4f3f";
};

const loadTopics = async (db: D1DatabaseBinding) => {
  const rows = await db.prepare(
    `select id, slug, category, parent_id as parentId, topic_type as topicType,
            name, description, color, sort_order as sortOrder, status
     from topic_definitions
     order by case topic_type when 'board' then 0 else 1 end, sort_order, name`
  ).all<AdminTopic>();
  return (rows.results || []).map((row) => ({ ...row, sortOrder: Number(row.sortOrder || 0) }));
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  return adminResponse(request, 200, { topics: await loadTopics(auth.db) });
}

export async function POST(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "주제 정보를 읽지 못했습니다." });
  }

  const parentId = typeof payload.parentId === "string" ? payload.parentId.trim() : "";
  const parent = await auth.db.prepare(
    "select id, category, color from topic_definitions where id = ? and topic_type = 'board' limit 1"
  ).bind(parentId).first<{ id: string; category: string; color: string }>();
  if (!parent) return adminResponse(request, 400, { error: "상위 게시판을 선택해주세요." });

  const name = cleanAdminText(payload.name, 40);
  const slug = cleanSlug(payload.slug || name);
  if (name.length < 2 || slug.length < 2) {
    return adminResponse(request, 400, { error: "주제 이름과 주소를 입력해주세요." });
  }

  const id = crypto.randomUUID();
  try {
    await auth.db.prepare(
      `insert into topic_definitions
        (id, slug, category, parent_id, topic_type, name, description, color,
         sort_order, status, created_by, created_at, updated_at)
       values (?, ?, ?, ?, 'subtopic', ?, ?, ?, ?, 'active', ?, ?, ?)`
    ).bind(
      id,
      slug,
      parent.category,
      parent.id,
      name,
      cleanAdminText(payload.description, 140),
      validColor(payload.color || parent.color),
      Math.max(0, Math.min(999, Math.floor(Number(payload.sortOrder) || 100))),
      auth.user?.id || null,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
  } catch {
    return adminResponse(request, 409, { error: "같은 주소를 사용하는 주제가 이미 있습니다." });
  }

  await logAdminActivity(auth.db, auth.user?.id || null, "하위주제 추가", "topic", id, { name, slug });
  return adminResponse(request, 201, { ok: true, topics: await loadTopics(auth.db) });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrustedAdmin(request);
  if (!auth.ok) return auth.response;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return adminResponse(request, 400, { error: "주제 정보를 읽지 못했습니다." });
  }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const current = await auth.db.prepare(
    `select id, slug, category, parent_id as parentId, topic_type as topicType,
            name, description, color, sort_order as sortOrder, status
     from topic_definitions where id = ? limit 1`
  ).bind(id).first<AdminTopic>();
  if (!current) return adminResponse(request, 404, { error: "주제를 찾지 못했습니다." });

  const name = cleanAdminText(payload.name, 40) || current.name;
  const description = cleanAdminText(payload.description, 140);
  const status = typeof payload.status === "string" && statuses.has(payload.status)
    ? payload.status
    : current.status;
  const sortOrder = Math.max(0, Math.min(999, Math.floor(Number(payload.sortOrder) || 0)));
  const category = current.topicType === "board"
    && typeof payload.category === "string"
    && adminCategories.has(payload.category)
    ? payload.category
    : current.category;

  await auth.db.prepare(
    `update topic_definitions
     set name = ?, description = ?, category = ?, color = ?, sort_order = ?,
         status = ?, updated_at = ?
     where id = ?`
  ).bind(
    name,
    description,
    category,
    validColor(payload.color || current.color),
    sortOrder,
    status,
    new Date().toISOString(),
    id
  ).run();
  await logAdminActivity(auth.db, auth.user?.id || null, "주제 편집", "topic", id, { name, status });

  return adminResponse(request, 200, { ok: true, topics: await loadTopics(auth.db) });
}
