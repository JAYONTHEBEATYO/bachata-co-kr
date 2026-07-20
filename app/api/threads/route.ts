import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import {
  getCommunityContext,
  getRequestIp,
  jsonHeaders as sharedJsonHeaders,
  requestFingerprint,
  sha256Hex
} from "@/lib/community-server";
import { displayIpPrefix, normalizeStoredIpPrefix } from "@/lib/ip-display";
import { displayGuestNickname, randomKoreanNickname } from "@/lib/nicknames";

type GuestThreadRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  linkUrl: string | null;
  guestId: string;
  ipPrefix: string;
  score: number;
  downvotes: number;
  commentCount?: number;
  createdAt: string;
};

type CountRow = {
  count: number;
};

type StreamBinding = {
  video: (id: string) => {
    update: (params: {
      scheduledDeletion?: string | null;
      meta?: Record<string, string>;
    }) => Promise<unknown>;
  };
};

const getStream = async (): Promise<StreamBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).STREAM as StreamBinding | undefined) || null;
  } catch {
    return null;
  }
};

const categories = new Set([
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

const jsonHeaders = (request: NextRequest) => sharedJsonHeaders(request, "GET,POST,DELETE,OPTIONS");

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const normalizeText = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, max);
};

const normalizeName = (value: unknown) => {
  const text = typeof value === "string" ? value : "";
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 32);
};

const normalizeCategory = (value: unknown) => {
  const category = typeof value === "string" ? value : "questions";
  return categories.has(category) ? category : "questions";
};

const normalizeId = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9_-]{1,80}$/.test(text) ? text : "";
};

const normalizeStreamIds = (value: unknown) => Array.isArray(value)
  ? value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => /^[a-zA-Z0-9_-]{16,80}$/.test(item))
    .slice(0, 6)
  : [];

const normalizeSort = (value: unknown) => {
  const sort = typeof value === "string" ? value : "hot";
  return sort === "new" || sort === "top" ? sort : "hot";
};

const orderByForSort = (sort: string) => {
  if (sort === "new") return "g.created_at desc";
  if (sort === "top") return "g.score desc, g.downvotes asc, commentCount desc, g.created_at desc";
  return "(g.score + commentCount * 3 - g.downvotes) desc, g.created_at desc";
};

const normalizeLink = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
};

const tagMap: Array<[RegExp, string]> = [
  [/센슈얼|sensual/i, "센슈얼"],
  [/도미니칸|dominican/i, "도미니칸"],
  [/베이직|기초|초보|입문|basic|beginner/i, "입문"],
  [/소셜|파티|social/i, "소셜"],
  [/페스티벌|행사|워크숍|festival|workshop/i, "행사"],
  [/홍보|모집|오픈|수강|클래스|공연|promotion/i, "홍보"],
  [/영상|유튜브|youtube|youtu\.be/i, "영상"],
  [/댄서|강사|멜빈|가티카|코르케|주디스|로렌|그레이|dancer/i, "댄서"],
  [/서울|강남|홍대/i, "서울"],
  [/부산/i, "부산"],
  [/대구/i, "대구"],
  [/제주/i, "제주"],
  [/후기|리뷰|느낌/i, "후기"],
  [/양도|티켓|패스/i, "양도"],
  [/구인|모집|스태프|dj/i, "모집"],
  [/라틴씨엘로|라스트댄스|센슈얼랩|엔수에뇨|에버라틴|바차타인플루언스코리아|학원|아카데미|동호회/i, "아카데미 리뷰"],
  [/부트캠프|마스터클래스|워크샵|워크숍|소셜댄스|해외수업|홀딩/i, "댄서 리뷰"],
  [/무물보|ama|ask me anything/i, "무물보"],
  [/설문|투표|poll/i, "설문"]
];

const categoryTags: Record<string, string> = {
  questions: "질문",
  video: "영상",
  events: "행사",
  promotion: "홍보",
  dancers: "댄서",
  guide: "가이드",
  free: "자유",
  academyReview: "아카데미 리뷰",
  dancerReview: "댄서 리뷰",
  socialReview: "소셜 후기",
  gear: "장비",
  poll: "설문조사",
  ama: "무물보"
};

const inferTags = (thread: Pick<GuestThreadRow, "title" | "body" | "category" | "linkUrl">) => {
  const text = `${thread.title} ${thread.body} ${thread.linkUrl || ""}`;
  const tags = new Set<string>();
  tags.add(categoryTags[thread.category] || "자유");

  for (const [pattern, tag] of tagMap) {
    if (pattern.test(text)) tags.add(tag);
    if (tags.size >= 5) break;
  }

  return [...tags].slice(0, 5);
};

const isBrokenText = (...values: Array<string | null | undefined>) =>
  values.some((value) => {
    const text = value || "";
    if (!text) return false;
    const questionCount = (text.match(/\?/g) || []).length;
    return new RegExp("\\uFFFD").test(text)
      || questionCount >= Math.max(6, Math.ceil(text.length * 0.25));
  });

const rowToThread = (row: GuestThreadRow) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  category: row.category,
  linkUrl: row.linkUrl,
  guestId: displayGuestNickname(row.guestId, row.id),
  ipPrefix: normalizeStoredIpPrefix(row.ipPrefix) || "비공개",
  score: Number(row.score || 0),
  downvotes: Number(row.downvotes || 0),
  commentCount: Number(row.commentCount || 0),
  tags: inferTags(row),
  createdAt: row.createdAt
});

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function GET(request: NextRequest) {
  const { db } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "글 저장소가 아직 연결되지 않았습니다." });

  const id = normalizeId(request.nextUrl.searchParams.get("id"));
  if (id) {
    const row = await db.prepare(
      `select
        g.id,
        g.title,
        g.body,
        g.category,
        g.link_url as linkUrl,
        g.guest_id as guestId,
        g.ip_prefix as ipPrefix,
        g.score,
        g.downvotes,
        g.created_at as createdAt,
        (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
      from guest_threads g
      where g.status = 'published' and g.id = ?
      limit 1`
    ).bind(id).first<GuestThreadRow>();

    if (!row || isBrokenText(row.title, row.body, row.guestId)) return respond(request, 404, { error: "글을 찾을 수 없습니다." });
    return respond(request, 200, { thread: rowToThread(row) });
  }

  const category = request.nextUrl.searchParams.get("category");
  const categoryFilter = category && categories.has(category) ? category : null;
  const query = normalizeText(request.nextUrl.searchParams.get("q"), 80);
  const sort = normalizeSort(request.nextUrl.searchParams.get("sort"));
  const orderBy = orderByForSort(sort);
  const rows = categoryFilter && query
    ? await db.prepare(
      `select
        g.id, g.title, g.body, g.category, g.link_url as linkUrl,
        g.guest_id as guestId, g.ip_prefix as ipPrefix, g.score, g.downvotes,
        g.created_at as createdAt,
        (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
      from guest_threads g
      where g.status = 'published' and g.category = ? and (g.title like ? or g.body like ?)
      order by ${orderBy}
      limit 40`
    ).bind(categoryFilter, `%${query}%`, `%${query}%`).all<GuestThreadRow>()
    : categoryFilter
    ? await db.prepare(
      `select
        g.id,
        g.title,
        g.body,
        g.category,
        g.link_url as linkUrl,
        g.guest_id as guestId,
        g.ip_prefix as ipPrefix,
        g.score,
        g.downvotes,
        g.created_at as createdAt,
        (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
      from guest_threads g
      where g.status = 'published' and g.category = ?
      order by ${orderBy}
      limit 40`
    ).bind(categoryFilter).all<GuestThreadRow>()
    : query
    ? await db.prepare(
      `select
        g.id, g.title, g.body, g.category, g.link_url as linkUrl,
        g.guest_id as guestId, g.ip_prefix as ipPrefix, g.score, g.downvotes,
        g.created_at as createdAt,
        (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
      from guest_threads g
      where g.status = 'published' and (g.title like ? or g.body like ?)
      order by ${orderBy}
      limit 40`
    ).bind(`%${query}%`, `%${query}%`).all<GuestThreadRow>()
    : await db.prepare(
      `select
        g.id,
        g.title,
        g.body,
        g.category,
        g.link_url as linkUrl,
        g.guest_id as guestId,
        g.ip_prefix as ipPrefix,
        g.score,
        g.downvotes,
        g.created_at as createdAt,
        (select count(*) from comments c where c.thread_id = g.id and c.status = 'published') as commentCount
      from guest_threads g
      where g.status = 'published'
      order by ${orderBy}
      limit 40`
    ).all<GuestThreadRow>();

  return respond(request, 200, {
    threads: (rows.results || [])
      .filter((row) => !isBrokenText(row.title, row.body, row.guestId))
      .map(rowToThread)
  });
}

export async function POST(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "글 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "글 내용을 읽을 수 없습니다." });
  }

  if (payload.website) {
    return respond(request, 200, { ok: true });
  }

  const title = normalizeText(payload.title, 120);
  const body = normalizeText(payload.body, 4000);
  const category = normalizeCategory(payload.category);
  const linkUrl = normalizeLink(payload.linkUrl);
  const authorName = normalizeName(payload.authorName) || randomKoreanNickname();
  const authorPassword = typeof payload.authorPassword === "string" ? payload.authorPassword.trim() : "";
  const streamIds = normalizeStreamIds(payload.streamIds);

  if (title.length < 4) return respond(request, 400, { error: "제목을 네 글자 이상 적어주세요." });
  if (body.length < 2) return respond(request, 400, { error: "본문을 두 글자 이상 적어주세요." });
  if (!/^\d{4}$/.test(authorPassword)) return respond(request, 400, { error: "임시비밀번호 4자리를 숫자로 입력해주세요." });

  const ip = getRequestIp(request);
  const ipHash = await requestFingerprint(request, hashSalt, "threads");
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const recent = await db.prepare(
    "select count(*) as count from guest_threads where ip_hash = ? and created_at >= ?"
  ).bind(ipHash, since).first<CountRow>();

  if (Number(recent?.count || 0) >= 5) {
    return respond(request, 429, { error: "글을 너무 빠르게 올리고 있습니다. 잠시 후 다시 시도해주세요." });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const ipPrefix = displayIpPrefix(ip);
  const editKeyHash = await sha256Hex(`${id}|${authorPassword}|${hashSalt}|thread-edit`);

  await db.prepare(
    `insert into guest_threads
      (id, title, body, category, link_url, guest_id, ip_prefix, ip_hash, edit_key_hash, score, downvotes, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
  ).bind(id, title, body, category, linkUrl, authorName, ipPrefix, ipHash, editKeyHash, now, now).run();

  if (streamIds.length) {
    const stream = await getStream();
    const uploaderHash = await requestFingerprint(request, hashSalt, "stream-uploads");

    for (const streamId of streamIds) {
      const media = await db.prepare(
        "select uploader_hash as uploaderHash from stream_videos where id = ? and status != 'deleted'"
      ).bind(streamId).first<{ uploaderHash: string }>();
      if (!media || media.uploaderHash !== uploaderHash) continue;

      await db.prepare("update stream_videos set thread_id = ?, updated_at = ? where id = ?")
        .bind(id, now, streamId)
        .run();

      if (stream) {
        try {
          await stream.video(streamId).update({
            scheduledDeletion: null,
            meta: {
              site: "bachata.co.kr",
              threadId: id
            }
          });
        } catch {
          // The video stays playable and the database claim can be reconciled later.
        }
      }
    }
  }

  return respond(request, 201, {
    thread: {
      id,
      title,
      body,
      category,
      linkUrl,
      guestId: authorName,
      ipPrefix: normalizeStoredIpPrefix(ipPrefix) || "비공개",
      score: 0,
      downvotes: 0,
      commentCount: 0,
      tags: inferTags({ title, body, category, linkUrl }),
      createdAt: now
    }
  });
}

export async function DELETE(request: NextRequest) {
  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "글 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "요청을 읽을 수 없습니다." });
  }

  const id = normalizeId(payload.id);
  const password = typeof payload.password === "string" ? payload.password.trim() : "";
  if (!id || !/^\d{4}$/.test(password)) {
    return respond(request, 400, { error: "글과 임시비밀번호를 확인해주세요." });
  }

  const requesterHash = await requestFingerprint(request, hashSalt, "thread-delete");
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const attempts = await db.prepare(
    "select count(*) as count from guest_auth_attempts where requester_hash = ? and created_at >= ?"
  ).bind(requesterHash, since).first<CountRow>();
  if (Number(attempts?.count || 0) >= 8) {
    return respond(request, 429, { error: "삭제 확인을 여러 번 시도했습니다. 잠시 후 다시 시도해주세요." });
  }

  const expected = await sha256Hex(`${id}|${password}|${hashSalt}|thread-edit`);
  const row = await db.prepare("select edit_key_hash as editKeyHash from guest_threads where id = ? and status = 'published'")
    .bind(id)
    .first<{ editKeyHash: string }>();
  const succeeded = Boolean(row && row.editKeyHash === expected);
  await db.prepare(
    "insert into guest_auth_attempts (id, target_type, target_id, requester_hash, succeeded, created_at) values (?, 'thread', ?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), id, requesterHash, succeeded ? 1 : 0, new Date().toISOString()).run();
  if (!succeeded) {
    return respond(request, 403, { error: "임시비밀번호가 맞지 않습니다." });
  }

  const now = new Date().toISOString();
  await db.prepare("update guest_threads set status = 'removed', updated_at = ? where id = ?")
    .bind(now, id)
    .run();
  return respond(request, 200, { ok: true });
}
