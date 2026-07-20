import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

export type D1Rows<T> = {
  results?: T[];
};

export type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T = unknown>() => Promise<D1Rows<T>>;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

export type D1DatabaseBinding = {
  prepare: (query: string) => D1PreparedStatement;
};

type CommunityBindings = Record<string, unknown> & {
  COMMENTS_DB?: D1DatabaseBinding;
  COMMUNITY_HASH_SALT?: string;
};

export const getCommunityContext = async () => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as CommunityBindings;
    return {
      db: bindings.COMMENTS_DB || null,
      hashSalt: bindings.COMMUNITY_HASH_SALT || "bachata-local-development"
    };
  } catch {
    return { db: null, hashSalt: "bachata-local-development" };
  }
};

export const getRequestIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip")
  || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  || "unknown";

export const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const requestFingerprint = async (
  request: NextRequest,
  salt: string,
  scope: string
) => {
  const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 240);
  return (await sha256Hex(`${getRequestIp(request)}|${userAgent}|${scope}|${salt}`)).slice(0, 40);
};

export const allowedOrigins = new Set([
  "https://bachata.co.kr",
  "https://www.bachata.co.kr",
  "https://bachata-co-kr.bachata-korea.workers.dev",
  "http://localhost:3000",
  "http://localhost:3333",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3333"
]);

export const jsonHeaders = (request: NextRequest, methods: string) => {
  const origin = request.headers.get("origin");
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://bachata.co.kr";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": methods,
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    vary: "Origin"
  };
};

