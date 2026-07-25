import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteSession, sessionCookieName } from "@/lib/auth-server";
import { getCommunityContext } from "@/lib/community-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { db } = await getCommunityContext();
  if (db) {
    await deleteSession(db, request.cookies.get(sessionCookieName)?.value);
  }
  const response = NextResponse.json({ ok: true });
  response.headers.set("cache-control", "no-store");
  response.cookies.delete(sessionCookieName);
  return response;
}
