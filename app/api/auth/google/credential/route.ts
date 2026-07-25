import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  createSession,
  defaultHandleForSubject,
  findUniqueHandle,
  normalizeReturnTo,
  sessionCookieName,
  sessionTtlSeconds
} from "@/lib/auth-server";
import {
  getCommunityContext,
  hasTrustedRequestOrigin,
  jsonHeaders
} from "@/lib/community-server";
import { randomKoreanNickname } from "@/lib/nicknames";

type ExistingUserRow = {
  id: string;
  role: "member" | "moderator" | "admin";
};

type GoogleCredentialBody = {
  credential?: unknown;
  returnTo?: unknown;
};

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const {
    db,
    googleClientId,
    adminEmails,
    siteUrl
  } = await getCommunityContext();
  const headers = jsonHeaders(request, "POST, OPTIONS");

  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json(
      { error: "허용되지 않은 요청입니다." },
      { status: 403, headers }
    );
  }
  if (!db || !googleClientId) {
    return NextResponse.json(
      { error: "Google 로그인 설정을 마무리하는 중입니다." },
      { status: 503, headers }
    );
  }

  let body: GoogleCredentialBody;
  try {
    body = await request.json() as GoogleCredentialBody;
  } catch {
    return NextResponse.json(
      { error: "로그인 정보를 읽지 못했습니다." },
      { status: 400, headers }
    );
  }

  const credential = typeof body.credential === "string" ? body.credential : "";
  const returnTo = normalizeReturnTo(
    typeof body.returnTo === "string" ? body.returnTo : null,
    "/profile"
  );
  if (!credential) {
    return NextResponse.json(
      { error: "Google 계정 정보가 없습니다." },
      { status: 400, headers }
    );
  }

  let claims: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  try {
    const verified = await jwtVerify(credential, googleJwks, {
      audience: googleClientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"]
    });
    claims = verified.payload;
  } catch {
    return NextResponse.json(
      { error: "Google 계정 정보를 확인하지 못했습니다." },
      { status: 401, headers }
    );
  }

  if (!claims.sub || !claims.email || claims.email_verified !== true) {
    return NextResponse.json(
      { error: "확인된 Google 계정으로 다시 시도해주세요." },
      { status: 401, headers }
    );
  }

  const email = claims.email.trim().toLowerCase();
  const existing = await db.prepare(
    "select id, role from users where google_sub = ? or email = ? limit 1"
  ).bind(claims.sub, email).first<ExistingUserRow>();
  const now = new Date().toISOString();
  let userId = existing?.id;

  const configuredAdmins = new Set(
    adminEmails.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
  );
  const role = configuredAdmins.has(email) ? "admin" : existing?.role || "member";

  if (userId) {
    await db.prepare(
      `update users
       set google_sub = ?, email = ?, email_verified = 1, role = ?,
           avatar_url = coalesce(avatar_url, ?), last_login_at = ?, updated_at = ?
       where id = ?`
    ).bind(claims.sub, email, role, claims.picture || null, now, now, userId).run();
  } else {
    userId = crypto.randomUUID();
    const handle = await findUniqueHandle(
      db,
      await defaultHandleForSubject(claims.sub)
    );
    const googleName = claims.name?.trim().slice(0, 24);
    await db.prepare(
      `insert into users
        (id, google_sub, email, email_verified, display_name, handle, avatar_url,
         avatar_preset, bio, location, preferred_styles, role, status,
         created_at, updated_at, last_login_at)
       values (?, ?, ?, 1, ?, ?, ?, 'bachata-step', '', '', '[]', ?, 'active', ?, ?, ?)`
    ).bind(
      userId,
      claims.sub,
      email,
      googleName || randomKoreanNickname(),
      handle,
      claims.picture || null,
      role,
      now,
      now,
      now
    ).run();
  }

  const session = await createSession(db, userId);
  const redirectTo = normalizeReturnTo(returnTo, "/profile");
  const response = NextResponse.json(
    {
      ok: true,
      redirectTo: !existing && redirectTo === "/profile"
        ? "/profile?welcome=1"
        : redirectTo
    },
    { headers }
  );
  response.cookies.set(sessionCookieName, session.token, {
    httpOnly: true,
    secure: siteUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlSeconds
  });
  return response;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: jsonHeaders(request, "POST, OPTIONS")
  });
}
