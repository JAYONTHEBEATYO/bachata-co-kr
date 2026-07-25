import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  getCommunityContext,
  sha256Hex,
  type D1DatabaseBinding
} from "@/lib/community-server";
import type { PublicProfile, SessionUser } from "@/lib/types";

export const sessionCookieName = "bachata_session";
export const sessionTtlSeconds = 60 * 60 * 24 * 30;

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  avatarPreset: string;
  bio: string;
  location: string;
  danceYears: number | null;
  preferredStyles: string;
  role: SessionUser["role"];
  joinedAt: string;
};

const userSelect = `
  select
    u.id,
    u.email,
    u.display_name as displayName,
    u.handle,
    u.avatar_url as avatarUrl,
    u.avatar_preset as avatarPreset,
    u.bio,
    u.location,
    u.dance_years as danceYears,
    u.preferred_styles as preferredStyles,
    u.role,
    u.created_at as joinedAt
  from users u
`;

const safeStyles = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [];
  } catch {
    return [];
  }
};

export const userRowToSession = (row: UserRow): SessionUser => ({
  id: row.id,
  email: row.email,
  displayName: row.displayName,
  handle: row.handle,
  avatarUrl: row.avatarUrl,
  avatarPreset: row.avatarPreset || "bachata-step",
  bio: row.bio || "",
  location: row.location || "",
  danceYears: row.danceYears === null ? null : Number(row.danceYears),
  preferredStyles: safeStyles(row.preferredStyles),
  role: row.role,
  joinedAt: row.joinedAt
});

export const toPublicProfile = (user: SessionUser): PublicProfile => ({
  id: user.id,
  displayName: user.displayName,
  handle: user.handle,
  avatarUrl: user.avatarUrl,
  avatarPreset: user.avatarPreset,
  bio: user.bio,
  location: user.location,
  danceYears: user.danceYears,
  preferredStyles: user.preferredStyles,
  joinedAt: user.joinedAt
});

export const randomUrlSafe = (byteLength = 32) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const getSessionUser = async (
  db: D1DatabaseBinding,
  token: string | null | undefined
): Promise<SessionUser | null> => {
  if (!token || token.length < 32) return null;
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const row = await db.prepare(
    `${userSelect}
     join auth_sessions s on s.user_id = u.id
     where s.token_hash = ? and s.expires_at > ? and u.status = 'active'
     limit 1`
  ).bind(tokenHash, now).first<UserRow>();
  return row ? userRowToSession(row) : null;
};

export const getSessionUserForRequest = async (
  request: NextRequest,
  db?: D1DatabaseBinding | null
) => {
  const activeDb = db || (await getCommunityContext()).db;
  if (!activeDb) return null;
  return getSessionUser(activeDb, request.cookies.get(sessionCookieName)?.value);
};

export const getCurrentSessionUser = async () => {
  const { db } = await getCommunityContext();
  if (!db) return null;
  const cookieStore = await cookies();
  return getSessionUser(db, cookieStore.get(sessionCookieName)?.value);
};

export const createSession = async (db: D1DatabaseBinding, userId: string) => {
  const token = randomUrlSafe(40);
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionTtlSeconds * 1000).toISOString();

  await db.prepare("delete from auth_sessions where expires_at <= ?")
    .bind(now.toISOString())
    .run();
  await db.prepare(
    `insert into auth_sessions
      (token_hash, user_id, expires_at, created_at, last_seen_at)
     values (?, ?, ?, ?, ?)`
  ).bind(tokenHash, userId, expiresAt, now.toISOString(), now.toISOString()).run();

  return { token, expiresAt };
};

export const deleteSession = async (db: D1DatabaseBinding, token: string | null | undefined) => {
  if (!token) return;
  await db.prepare("delete from auth_sessions where token_hash = ?")
    .bind(await sha256Hex(token))
    .run();
};

export const normalizeReturnTo = (value: string | null | undefined, fallback = "/") => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value.slice(0, 500);
};

export const normalizeHandle = (value: unknown) => {
  const text = typeof value === "string" ? value : "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
};

export const defaultHandleForSubject = async (subject: string) => {
  const digest = await sha256Hex(`bachata-member|${subject}`);
  return `dancer_${digest.slice(0, 8)}`;
};

export const findUniqueHandle = async (
  db: D1DatabaseBinding,
  desired: string,
  excludeUserId?: string
) => {
  const base = normalizeHandle(desired) || `dancer_${randomUrlSafe(6).toLowerCase()}`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    const row = await db.prepare(
      "select id from users where handle = ? and (? is null or id != ?) limit 1"
    ).bind(candidate, excludeUserId || null, excludeUserId || null).first<{ id: string }>();
    if (!row) return candidate;
  }
  return `dancer_${randomUrlSafe(8).toLowerCase()}`.slice(0, 24);
};

export const loadPublicProfile = async (
  db: D1DatabaseBinding,
  handle: string
): Promise<PublicProfile | null> => {
  const row = await db.prepare(
    `${userSelect}
     where u.handle = ? and u.status = 'active'
     limit 1`
  ).bind(normalizeHandle(handle)).first<UserRow>();
  return row ? toPublicProfile(userRowToSession(row)) : null;
};
