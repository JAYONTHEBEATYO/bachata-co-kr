import type { NextRequest } from "next/server";
import { getSessionUserForRequest, toPublicProfile } from "@/lib/auth-server";
import { getCommunityContext, jsonHeaders } from "@/lib/community-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { db } = await getCommunityContext();
  if (!db) {
    return Response.json(
      { user: null },
      { status: 200, headers: jsonHeaders(request, "GET,OPTIONS") }
    );
  }
  const user = await getSessionUserForRequest(request, db);
  return Response.json(
    { user: user ? { ...toPublicProfile(user), email: user.email, role: user.role } : null },
    { status: 200, headers: jsonHeaders(request, "GET,OPTIONS") }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders(request, "GET,OPTIONS")
  });
}
