import type { NextRequest } from "next/server";
import {
  getSessionUserForRequest,
  loadPublicProfile,
  normalizeHandle,
  toPublicProfile
} from "@/lib/auth-server";
import { avatarPresets } from "@/lib/avatars";
import {
  getCommunityContext,
  hasTrustedRequestOrigin,
  jsonHeaders
} from "@/lib/community-server";

const styleOptions = new Set([
  "센슈얼",
  "도미니칸",
  "트레디셔널",
  "인플루언스",
  "풋워크",
  "레이디 스타일",
  "맨즈 스타일",
  "뮤지컬리티",
  "소셜댄스"
]);

const presetIds = new Set(avatarPresets.map((preset) => preset.id));

const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, {
    status,
    headers: jsonHeaders(request, "GET,PATCH,OPTIONS")
  });

const normalizePlainText = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
};

const normalizeAvatarUrl = (value: unknown, request: NextRequest) => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, request.nextUrl.origin);
    const isOwnedMedia = (
      ["bachata.co.kr", "www.bachata.co.kr", request.nextUrl.hostname].includes(url.hostname)
      && url.pathname.startsWith("/api/media/uploads/")
    );
    const isGoogleAvatar = url.protocol === "https:" && url.hostname.endsWith(".googleusercontent.com");
    return isOwnedMedia || isGoogleAvatar ? url.toString().slice(0, 700) : null;
  } catch {
    return null;
  }
};

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(request, "GET,PATCH,OPTIONS")
  });
}

export async function GET(request: NextRequest) {
  const { db } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "회원 저장소가 아직 연결되지 않았습니다." });

  const handle = normalizeHandle(request.nextUrl.searchParams.get("handle"));
  if (handle) {
    const profile = await loadPublicProfile(db, handle);
    return profile
      ? respond(request, 200, { profile })
      : respond(request, 404, { error: "프로필을 찾을 수 없습니다." });
  }

  const user = await getSessionUserForRequest(request, db);
  return user
    ? respond(request, 200, { user })
    : respond(request, 401, { user: null, error: "로그인이 필요합니다." });
}

export async function PATCH(request: NextRequest) {
  if (!hasTrustedRequestOrigin(request)) {
    return respond(request, 403, { error: "올바르지 않은 요청입니다." });
  }

  const { db } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "회원 저장소가 아직 연결되지 않았습니다." });
  const user = await getSessionUserForRequest(request, db);
  if (!user) return respond(request, 401, { error: "로그인이 필요합니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "프로필 내용을 읽을 수 없습니다." });
  }

  if (payload.mode === "avatar") {
    const avatarPreset = typeof payload.avatarPreset === "string" && presetIds.has(payload.avatarPreset)
      ? payload.avatarPreset
      : "bachata-step";
    const avatarUrl = normalizeAvatarUrl(payload.avatarUrl, request);

    await db.prepare(
      `update users
       set avatar_url = ?, avatar_preset = ?, updated_at = ?
       where id = ? and status = 'active'`
    ).bind(
      avatarUrl,
      avatarPreset,
      new Date().toISOString(),
      user.id
    ).run();

    const updated = await getSessionUserForRequest(request, db);
    return updated
      ? respond(request, 200, {
          user: updated,
          profile: toPublicProfile(updated)
        })
      : respond(request, 500, { error: "프로필 사진을 다시 불러오지 못했습니다." });
  }

  const displayName = normalizePlainText(payload.displayName, 24);
  const handle = normalizeHandle(payload.handle);
  const bio = normalizePlainText(payload.bio, 160);
  const location = normalizePlainText(payload.location, 24);
  const avatarPreset = typeof payload.avatarPreset === "string" && presetIds.has(payload.avatarPreset)
    ? payload.avatarPreset
    : "bachata-step";
  const avatarUrl = normalizeAvatarUrl(payload.avatarUrl, request);
  const danceYearsValue = payload.danceYears === "" || payload.danceYears === null
    ? null
    : Number(payload.danceYears);
  const danceYears = danceYearsValue === null
    ? null
    : Math.max(0, Math.min(50, Math.floor(danceYearsValue)));
  const preferredStyles = Array.isArray(payload.preferredStyles)
    ? payload.preferredStyles
      .filter((item): item is string => typeof item === "string" && styleOptions.has(item))
      .slice(0, 8)
    : [];

  if (displayName.length < 2) {
    return respond(request, 400, { error: "닉네임을 두 글자 이상 적어주세요." });
  }
  if (handle.length < 3) {
    return respond(request, 400, { error: "아이디는 영문 소문자, 숫자, 밑줄로 세 글자 이상 적어주세요." });
  }
  if (danceYearsValue !== null && !Number.isFinite(danceYearsValue)) {
    return respond(request, 400, { error: "바차타 경력을 숫자로 입력해주세요." });
  }

  const duplicate = await db.prepare(
    "select id from users where handle = ? and id != ? limit 1"
  ).bind(handle, user.id).first<{ id: string }>();
  if (duplicate) return respond(request, 409, { error: "이미 사용 중인 아이디입니다." });

  await db.prepare(
    `update users
     set display_name = ?, handle = ?, avatar_url = ?, avatar_preset = ?,
         bio = ?, location = ?, dance_years = ?, preferred_styles = ?, updated_at = ?
     where id = ? and status = 'active'`
  ).bind(
    displayName,
    handle,
    avatarUrl,
    avatarPreset,
    bio,
    location,
    danceYears,
    JSON.stringify(preferredStyles),
    new Date().toISOString(),
    user.id
  ).run();

  const updated = await getSessionUserForRequest(request, db);
  return updated
    ? respond(request, 200, { user: updated, profile: toPublicProfile(updated) })
    : respond(request, 500, { error: "프로필을 다시 불러오지 못했습니다." });
}
