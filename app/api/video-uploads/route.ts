import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";
import {
  getCommunityContext,
  jsonHeaders as sharedJsonHeaders,
  requestFingerprint,
  sha256Hex
} from "@/lib/community-server";

type StreamDirectUpload = {
  id: string;
  uploadURL: string;
};

type StreamVideoDetails = {
  id: string;
  readyToStream: boolean;
  status?: {
    state?: string;
    pctComplete?: string;
    errorReasonText?: string;
  };
  thumbnail?: string;
  preview?: string;
  duration?: number;
  hlsPlaybackUrl?: string;
  dashPlaybackUrl?: string;
  input?: {
    width?: number;
    height?: number;
  };
};

type StreamBinding = {
  createDirectUpload: (params: {
    maxDurationSeconds: number;
    expiry?: string;
    creator?: string;
    meta?: Record<string, string>;
    thumbnailTimestampPct?: number;
    scheduledDeletion?: string | null;
  }) => Promise<StreamDirectUpload>;
  video: (id: string) => {
    details: () => Promise<StreamVideoDetails>;
    delete: () => Promise<void>;
    update: (params: {
      scheduledDeletion?: string | null;
      meta?: Record<string, string>;
    }) => Promise<unknown>;
  };
};

type CountRow = {
  count: number;
};

type RecoverableStreamVideoRow = {
  id: string;
  name: string;
  size: number;
  status: string;
  readyToStream: number;
  playerUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
};

const allowedVideoTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const maxFileSize = 200 * 1024 * 1024;
const maxDurationSeconds = 300;
const dailyUploaderLimit = 8;
const monthlySiteLimit = 120;
const idPattern = /^[a-zA-Z0-9_-]{16,80}$/;

const jsonHeaders = (request: NextRequest) => sharedJsonHeaders(request, "GET,POST,PATCH,DELETE,OPTIONS");
const respond = (request: NextRequest, status: number, body: unknown) =>
  Response.json(body, { status, headers: jsonHeaders(request) });

const getStream = async (): Promise<StreamBinding | null> => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as Record<string, unknown>).STREAM as StreamBinding | undefined) || null;
  } catch {
    return null;
  }
};

const normalizeFileName = (value: unknown) => {
  const text = typeof value === "string" ? value : "";
  return text.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 120) || "video";
};

const playerUrlFromDetails = (id: string, details?: StreamVideoDetails) => {
  if (details?.hlsPlaybackUrl) {
    try {
      const origin = new URL(details.hlsPlaybackUrl).origin;
      return `${origin}/${encodeURIComponent(id)}/iframe?primaryColor=%23ff4f3f`;
    } catch {
      // Fall through to Cloudflare's account-agnostic player endpoint.
    }
  }
  return `https://iframe.videodelivery.net/${encodeURIComponent(id)}?primaryColor=%23ff4f3f`;
};

const streamError = (error: unknown) => {
  const value = error as { statusCode?: number; code?: number; message?: string };
  const status = value?.statusCode && value.statusCode >= 400 && value.statusCode < 600
    ? value.statusCode
    : 500;

  if (status === 429) return { status, message: "지금은 영상 처리 한도가 가득 찼습니다. 잠시 후 다시 시도해주세요." };
  if (status === 413) return { status, message: "영상 용량이 너무 큽니다. 200MB 이하로 올려주세요." };
  if (status === 403) return { status: 503, message: "영상 업로드 기능을 준비하고 있습니다." };
  return { status, message: "영상을 준비하지 못했습니다. 잠시 후 다시 시도해주세요." };
};

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: jsonHeaders(request) });
}

export async function POST(request: NextRequest) {
  const stream = await getStream();
  if (!stream) return respond(request, 503, { error: "영상 업로드 기능이 아직 연결되지 않았습니다." });

  const { db, hashSalt } = await getCommunityContext();
  if (!db) return respond(request, 503, { error: "영상 기록 저장소가 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "영상 정보를 읽을 수 없습니다." });
  }

  const fileName = normalizeFileName(payload.fileName);
  const contentType = typeof payload.contentType === "string" ? payload.contentType : "";
  const fileSize = Number(payload.fileSize || 0);

  if (!allowedVideoTypes.has(contentType)) {
    return respond(request, 400, { error: "MP4, WebM, MOV 영상만 올릴 수 있습니다." });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxFileSize) {
    return respond(request, 400, { error: "영상은 200MB 이하로 올려주세요." });
  }

  const uploaderHash = await requestFingerprint(request, hashSalt, "stream-uploads");
  const nowDate = new Date();
  const hourlySince = new Date(nowDate.getTime() - 60 * 60_000).toISOString();
  const dailySince = new Date(nowDate.getTime() - 24 * 60 * 60_000).toISOString();
  const monthlySince = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1)).toISOString();
  const hourlyUsage = await db.prepare(
    `select count(*) as count from stream_videos
     where uploader_hash = ? and created_at >= ? and status != 'deleted'`
  ).bind(uploaderHash, hourlySince).first<CountRow>();

  if (Number(hourlyUsage?.count || 0) >= 3) {
    return respond(request, 429, { error: "영상은 한 시간에 세 개까지 올릴 수 있습니다." });
  }

  const dailyUsage = await db.prepare(
    "select count(*) as count from stream_videos where uploader_hash = ? and created_at >= ?"
  ).bind(uploaderHash, dailySince).first<CountRow>();
  if (Number(dailyUsage?.count || 0) >= dailyUploaderLimit) {
    return respond(request, 429, { error: "오늘 올릴 수 있는 영상 수를 모두 사용했습니다. 내일 다시 올려주세요." });
  }

  const monthlyUsage = await db.prepare(
    "select count(*) as count from stream_videos where created_at >= ?"
  ).bind(monthlySince).first<CountRow>();
  if (Number(monthlyUsage?.count || 0) >= monthlySiteLimit) {
    return respond(request, 429, { error: "이번 달 영상 업로드 공간이 가득 찼습니다." });
  }

  try {
    const directUpload = await stream.createDirectUpload({
      maxDurationSeconds,
      expiry: new Date(Date.now() + 15 * 60_000).toISOString(),
      creator: uploaderHash,
      meta: {
        site: "bachata.co.kr",
        originalName: fileName
      },
      thumbnailTimestampPct: 0.15,
      scheduledDeletion: new Date(Date.now() + 31 * 24 * 60 * 60_000).toISOString()
    });
    const now = new Date().toISOString();

    await db.prepare(
      `insert into stream_videos
        (id, uploader_hash, original_name, byte_size, content_type, status, ready_to_stream, created_at, updated_at)
       values (?, ?, ?, ?, ?, 'pendingupload', 0, ?, ?)`
    ).bind(directUpload.id, uploaderHash, fileName, fileSize, contentType, now, now).run();

    return respond(request, 201, {
      upload: {
        id: directUpload.id,
        uploadURL: directUpload.uploadURL,
        maxDurationSeconds,
        playerUrl: playerUrlFromDetails(directUpload.id)
      }
    });
  } catch (error) {
    console.error("Stream direct upload creation failed", error);
    const mapped = streamError(error);
    return respond(request, mapped.status, { error: mapped.message });
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("recent") === "1") {
    const { db, hashSalt } = await getCommunityContext();
    if (!db) return respond(request, 503, { error: "영상 기록 저장소가 아직 연결되지 않았습니다." });

    const uploaderHash = await requestFingerprint(request, hashSalt, "stream-uploads");
    const since = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
    const rows = await db.prepare(
      `select
        id,
        original_name as name,
        byte_size as size,
        status,
        ready_to_stream as readyToStream,
        playback_url as playerUrl,
        thumbnail_url as thumbnailUrl,
        created_at as createdAt
      from stream_videos
      where uploader_hash = ?
        and thread_id is null
        and status != 'deleted'
        and created_at >= ?
      order by created_at desc
      limit 6`
    ).bind(uploaderHash, since).all<RecoverableStreamVideoRow>();

    return respond(request, 200, {
      videos: (rows.results || []).map((row) => ({
        streamId: row.id,
        url: row.playerUrl || playerUrlFromDetails(row.id),
        name: row.name,
        size: Number(row.size || 0),
        contentType: "video/cloudflare-stream",
        status: Number(row.readyToStream) ? "ready" : "processing",
        thumbnailUrl: row.thumbnailUrl || null,
        createdAt: row.createdAt
      }))
    });
  }

  const id = request.nextUrl.searchParams.get("id")?.trim() || "";
  if (!idPattern.test(id)) return respond(request, 400, { error: "영상 ID를 확인해주세요." });

  const stream = await getStream();
  if (!stream) return respond(request, 503, { error: "영상 재생 기능이 아직 연결되지 않았습니다." });
  const { db } = await getCommunityContext();

  try {
    const details = await stream.video(id).details();
    const status = details.status?.state || (details.readyToStream ? "ready" : "processing");
    const playerUrl = playerUrlFromDetails(id, details);
    const now = new Date().toISOString();

    if (db) {
      await db.prepare(
        `update stream_videos
         set status = ?, ready_to_stream = ?, duration_seconds = ?, playback_url = ?, thumbnail_url = ?, updated_at = ?
         where id = ?`
      ).bind(
        status,
        details.readyToStream ? 1 : 0,
        Number.isFinite(details.duration) ? details.duration : null,
        playerUrl,
        details.thumbnail || null,
        now,
        id
      ).run();
    }

    return respond(request, 200, {
      video: {
        id,
        status,
        readyToStream: Boolean(details.readyToStream),
        progress: details.status?.pctComplete || "0",
        playerUrl,
        thumbnailUrl: details.thumbnail || null,
        duration: Number.isFinite(details.duration) ? details.duration : null,
        width: Number.isFinite(details.input?.width) ? details.input?.width : null,
        height: Number.isFinite(details.input?.height) ? details.input?.height : null,
        hlsUrl: details.hlsPlaybackUrl || null,
        dashUrl: details.dashPlaybackUrl || null
      }
    });
  } catch (error) {
    console.error("Stream video lookup failed", { id, error });
    const mapped = streamError(error);
    return respond(request, mapped.status, { error: mapped.message });
  }
}

export async function PATCH(request: NextRequest) {
  const stream = await getStream();
  const { db, hashSalt } = await getCommunityContext();
  if (!stream || !db) return respond(request, 503, { error: "영상 복구 기능이 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "요청을 읽을 수 없습니다." });
  }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const threadId = typeof payload.threadId === "string" ? payload.threadId.trim() : "";
  const authorPassword = typeof payload.authorPassword === "string" ? payload.authorPassword.trim() : "";

  if (!idPattern.test(id)) return respond(request, 400, { error: "영상 ID를 확인해주세요." });
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return respond(request, 400, { error: "게시글 ID를 확인해주세요." });
  if (!/^\d{4}$/.test(authorPassword)) return respond(request, 400, { error: "임시비밀번호 4자리를 확인해주세요." });

  const thread = await db.prepare(
    `select body, edit_key_hash as editKeyHash
     from guest_threads
     where id = ? and status = 'published'`
  ).bind(threadId).first<{ body: string; editKeyHash: string }>();
  if (!thread) return respond(request, 404, { error: "게시글을 찾을 수 없습니다." });

  const expectedEditKey = await sha256Hex(`${threadId}|${authorPassword}|${hashSalt}|thread-edit`);
  if (thread.editKeyHash !== expectedEditKey) {
    return respond(request, 403, { error: "임시비밀번호가 일치하지 않습니다." });
  }
  if (!thread.body.includes(`cfstream:${id}`)) {
    return respond(request, 400, { error: "게시글에 연결할 영상 정보가 없습니다." });
  }

  const video = await db.prepare(
    "select thread_id as threadId from stream_videos where id = ? and status != 'deleted'"
  ).bind(id).first<{ threadId: string | null }>();
  if (!video) return respond(request, 404, { error: "영상을 찾을 수 없습니다." });
  if (video.threadId && video.threadId !== threadId) {
    return respond(request, 409, { error: "이미 다른 게시글에 연결된 영상입니다." });
  }

  try {
    await stream.video(id).update({
      scheduledDeletion: null,
      meta: {
        site: "bachata.co.kr",
        threadId
      }
    });
    await db.prepare("update stream_videos set thread_id = ?, updated_at = ? where id = ?")
      .bind(threadId, new Date().toISOString(), id)
      .run();
    return respond(request, 200, { ok: true, threadId, streamId: id });
  } catch (error) {
    console.error("Stream video recovery failed", { id, threadId, error });
    const mapped = streamError(error);
    return respond(request, mapped.status, { error: mapped.message });
  }
}

export async function DELETE(request: NextRequest) {
  const stream = await getStream();
  const { db, hashSalt } = await getCommunityContext();
  if (!stream || !db) return respond(request, 503, { error: "영상 삭제 기능이 아직 연결되지 않았습니다." });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, 400, { error: "요청을 읽을 수 없습니다." });
  }

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!idPattern.test(id)) return respond(request, 400, { error: "영상 ID를 확인해주세요." });

  const uploaderHash = await requestFingerprint(request, hashSalt, "stream-uploads");
  const row = await db.prepare(
    "select uploader_hash as uploaderHash from stream_videos where id = ? and status != 'deleted'"
  ).bind(id).first<{ uploaderHash: string }>();
  if (!row || row.uploaderHash !== uploaderHash) {
    return respond(request, 403, { error: "이 영상은 삭제할 수 없습니다." });
  }

  try {
    await stream.video(id).delete();
    await db.prepare("update stream_videos set status = 'deleted', updated_at = ? where id = ?")
      .bind(new Date().toISOString(), id)
      .run();
    return respond(request, 200, { ok: true });
  } catch (error) {
    console.error("Stream video deletion failed", { id, error });
    const mapped = streamError(error);
    return respond(request, mapped.status, { error: mapped.message });
  }
}
