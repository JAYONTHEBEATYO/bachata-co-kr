import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import { displayGuestNickname, randomKoreanNickname } from "@/lib/nicknames";

type D1Rows<T> = {
  results?: T[];
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T = unknown>() => Promise<D1Rows<T>>;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare: (query: string) => D1PreparedStatement;
};

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

const categories = new Set([
  "questions",
  "video",
  "events",
  "dancers",
  "guide",
  "free",
  "academyReview",
  "dancerReview",
  "socialReview",
  "gear",
  "poll",
  "ama"
]);

const allowedOrigins = new Set([
  "https://bachata.co.kr",
  "https://www.bachata.co.kr",
  "https://bachata-co-kr.bachata-korea.workers.dev",
  "http://localhost:3000",
  "http://localhost:3333",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3333"
]);

const jsonHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://bachata.co.kr";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    vary: "Origin"
  };
};

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const getDb = async (): Promise<D1DatabaseBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).COMMENTS_DB as D1DatabaseBinding | undefined) || null;
  } catch {
    return null;
  }
};

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

const getIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

const displayIpPrefix = (ip: string) => {
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\./);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.*.*`;
  const ipv6 = ip.split(":").filter(Boolean);
  if (ipv6.length >= 2) return `${ipv6[0]}:${ipv6[1]}:*`;
  return "비공개";
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const tagMap: Array<[RegExp, string]> = [
  [/센슈얼|sensual/i, "센슈얼"],
  [/도미니칸|dominican/i, "도미니칸"],
  [/베이직|기초|초보|입문|basic|beginner/i, "입문"],
  [/소셜|파티|social/i, "소셜"],
  [/페스티벌|행사|워크숍|festival|workshop/i, "행사"],
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

  tags.add("비회원");
  return [...tags].slice(0, 5);
};

const isBrokenText = (...values: Array<string | null | undefined>) =>
  values.some((value) => {
    const text = value || "";
    if (!text) return false;
    const questionCount = (text.match(/\?/g) || []).length;
    return /�/.test(text) || questionCount >= Math.max(6, Math.ceil(text.length * 0.25));
  });

const rowToThread = (row: GuestThreadRow) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  category: row.category,
  linkUrl: row.linkUrl,
  guestId: displayGuestNickname(row.guestId, row.id),
  ipPrefix: row.ipPrefix,
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
  const db = await getDb();
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
  const rows = categoryFilter
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
      order by g.created_at desc
      limit 40`
    ).bind(categoryFilter).all<GuestThreadRow>()
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
      order by g.created_at desc
      limit 40`
    ).all<GuestThreadRow>();

  return respond(request, 200, {
    threads: (rows.results || [])
      .filter((row) => !isBrokenText(row.title, row.body, row.guestId))
      .map(rowToThread)
  });
}

export async function POST(request: NextRequest) {
  const db = await getDb();
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

  if (title.length < 4) return respond(request, 400, { error: "제목을 네 글자 이상 적어주세요." });
  if (body.length < 2) return respond(request, 400, { error: "본문을 두 글자 이상 적어주세요." });
  if (!/^\d{4}$/.test(authorPassword)) return respond(request, 400, { error: "임시비밀번호 4자리를 숫자로 입력해주세요." });

  const ip = getIp(request);
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = (await sha256Hex(`${ip}|${day}|bachata-threads-v1`)).slice(0, 40);
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
  const editKeyHash = await sha256Hex(`${id}|${authorPassword}|bachata-thread-key-v1`);

  await db.prepare(
    `insert into guest_threads
      (id, title, body, category, link_url, guest_id, ip_prefix, ip_hash, edit_key_hash, score, downvotes, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
  ).bind(id, title, body, category, linkUrl, authorName, ipPrefix, ipHash, editKeyHash, now, now).run();

  return respond(request, 201, {
    thread: {
      id,
      title,
      body,
      category,
      linkUrl,
      guestId: authorName,
      ipPrefix,
      score: 0,
      downvotes: 0,
      commentCount: 0,
      tags: inferTags({ title, body, category, linkUrl }),
      createdAt: now
    }
  });
}
