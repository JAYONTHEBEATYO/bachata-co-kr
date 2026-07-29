import type { AdminUrlContentJob } from "@/lib/admin-types";
import { canonicalizeEditorialUrl } from "@/lib/editorial-automation";

export type UrlSourcePlatform = AdminUrlContentJob["sourcePlatform"];
export type UrlContentKind = AdminUrlContentJob["contentKind"];

export type UrlSourceMetadata = {
  url: string;
  platform: UrlSourcePlatform;
  title: string;
  author: string;
  handle: string;
  description: string;
  thumbnailUrl: string;
  articleText: string;
  originalLanguage: string;
};

export type EditorialUrlJobRow = {
  id: string;
  sourceUrl: string;
  sourcePlatform: AdminUrlContentJob["sourcePlatform"];
  contentKind: AdminUrlContentJob["contentKind"];
  sourceTitle: string;
  sourceAuthor: string;
  sourceHandle: string;
  sourceThumbnailUrl?: string | null;
  sourceAssetUrl?: string | null;
  reuseStatus: AdminUrlContentJob["reuseStatus"];
  status: AdminUrlContentJob["status"];
  generatedImageUrl?: string | null;
  outputAssetUrl?: string | null;
  outputStreamId?: string | null;
  proposalId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

const privateIpv4Patterns = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^224\./,
  /^255\./
];

const isPrivateIpv4 = (hostname: string) => {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  if (privateIpv4Patterns.some((pattern) => pattern.test(hostname))) return true;
  const parts = hostname.split(".").map(Number);
  return (
    parts.some((part) => part < 0 || part > 255)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
  );
};

export const validateEditorialSourceUrl = (value: unknown) => {
  const canonical = canonicalizeEditorialUrl(value);
  if (!canonical) throw new Error("공개된 HTTP 또는 HTTPS 주소를 입력해주세요.");
  const url = new URL(canonical);
  const hostname = url.hostname.toLowerCase();
  if (
    url.username
    || url.password
    || !["", "80", "443"].includes(url.port)
    || hostname === "localhost"
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || hostname === "metadata.google.internal"
    || hostname === "host.docker.internal"
    || hostname === "::1"
    || hostname.startsWith("[")
    || isPrivateIpv4(hostname)
  ) {
    throw new Error("외부에서 공개된 주소만 사용할 수 있습니다.");
  }
  return canonical;
};

export const inferUrlSourcePlatform = (value: string): UrlSourcePlatform => {
  const hostname = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return "youtube";
  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "instagram";
  if (hostname === "reddit.com" || hostname.endsWith(".reddit.com") || hostname === "redd.it") return "reddit";
  return "web";
};

export const inferUrlContentKind = (
  requested: unknown,
  platform: UrlSourcePlatform
): UrlContentKind => {
  if (requested === "video") return "video";
  if (requested === "article") return "article";
  return platform === "youtube" || platform === "instagram" ? "video" : "article";
};

const htmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  lt: "<",
  nbsp: " ",
  quot: "\""
};

export const decodeHtmlText = (value: string) => value
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&([a-z]+);/gi, (match, name: string) => htmlEntities[name.toLowerCase()] ?? match)
  .replace(/\s+/g, " ")
  .trim();

const metaValue = (html: string, keys: string[]) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2/g)) {
      attributes.set(match[1].toLowerCase(), match[3]);
    }
    const key = (attributes.get("property") || attributes.get("name") || "").toLowerCase();
    if (keys.includes(key)) return decodeHtmlText(attributes.get("content") || "");
  }
  return "";
};

const stripHtml = (value: string) => decodeHtmlText(value
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<(script|style|svg|noscript|nav|footer|header|form)\b[\s\S]*?<\/\1>/gi, " ")
  .replace(/<(br|\/p|\/li|\/h[1-6]|\/blockquote)>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/\n[ \t]+/g, "\n")
  .replace(/\n{3,}/g, "\n\n"));

const instagramHandleFrom = (value: string) => {
  const path = new URL(value).pathname.split("/").filter(Boolean);
  if (!path.length || ["p", "reel", "reels", "tv"].includes(path[0])) return "";
  return `@${path[0].replace(/^@/, "")}`;
};

export const metadataFromHtml = (
  sourceUrl: string,
  html: string,
  platform = inferUrlSourcePlatform(sourceUrl)
): UrlSourceMetadata => {
  const title = metaValue(html, ["og:title", "twitter:title"])
    || decodeHtmlText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = metaValue(html, ["og:description", "twitter:description", "description"]);
  const thumbnailUrl = metaValue(html, ["og:image", "twitter:image", "twitter:image:src"]);
  const author = metaValue(html, ["author", "article:author"]);
  const articleText = stripHtml(
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || html
  ).slice(0, 18_000);
  return {
    url: sourceUrl,
    platform,
    title: title.slice(0, 240),
    author: author.slice(0, 100),
    handle: platform === "instagram" ? instagramHandleFrom(sourceUrl) : "",
    description: description.slice(0, 1200),
    thumbnailUrl: thumbnailUrl.slice(0, 900),
    articleText,
    originalLanguage: ""
  };
};

export const buildReelLocalizationProject = (input: {
  jobId: string;
  sourceUrl: string;
  sourcePlatform: UrlSourcePlatform;
  sourceHandle: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceAssetUrl: string;
  permissionReference: string;
}) => ({
  schemaVersion: 1,
  projectId: `reel_${input.jobId.replaceAll("-", "")}`,
  sourceType: "platform_url",
  sourcePlatform: input.sourcePlatform,
  sourceUrl: input.sourceUrl,
  sourceHandle: input.sourceHandle,
  sourceCaption: input.sourceDescription,
  sourceTitle: input.sourceTitle,
  sourceVideoAsset: input.sourceAssetUrl,
  permissionReference: input.permissionReference,
  transcriptSource: "official_caption_then_asr",
  originalCaptions: [],
  koreanCaptions: [],
  layout: {
    width: 720,
    height: 1280,
    fps: 30,
    captionPlacement: "avoid_original",
    sourceWatermark: {
      enabled: true,
      position: "top_left",
      text: input.sourceHandle
    },
    brandWatermark: {
      enabled: true,
      position: "top_right",
      text: "bachata.co.kr"
    },
    safeArea: {
      top: 88,
      right: 28,
      bottom: 130,
      left: 28
    }
  },
  renderSettings: {
    codec: "h264",
    audioCodec: "aac",
    format: "mp4",
    pixelFormat: "yuv420p",
    fastStart: true
  },
  validation: {
    requireAudio: true,
    requireAttribution: true,
    maxCaptionLines: 2,
    inspectRepresentativeFrames: true
  },
  social: {
    title: "",
    body: "",
    attributionLine: `오리지널 영상 👉 ${input.sourceHandle || input.sourceUrl}`
  },
  status: input.sourceAssetUrl ? "queued" : "awaiting_source",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export const mapEditorialUrlJob = (row: EditorialUrlJobRow): AdminUrlContentJob => ({
  ...row,
  sourceThumbnailUrl: row.sourceThumbnailUrl || null,
  sourceAssetUrl: row.sourceAssetUrl || null,
  generatedImageUrl: row.generatedImageUrl || null,
  outputAssetUrl: row.outputAssetUrl || null,
  outputStreamId: row.outputStreamId || null,
  proposalId: row.proposalId || null,
  errorMessage: row.errorMessage || null
});
