const fallbackApiOrigin = "https://bachata-co-kr.bachata-korea.workers.dev";
const fallbackSiteOrigin = "https://bachata.co.kr";

export const compactThreadId = (id: string) => {
  const normalized = id.trim();
  return normalized.length > 12 ? normalized.slice(0, 8) : normalized;
};

export const communityApiOrigin = () => {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_COMMUNITY_API_ORIGIN || "";
  const host = window.location.hostname;
  if (
    host === "localhost"
    || host === "127.0.0.1"
    || host === "bachata.co.kr"
    || host === "www.bachata.co.kr"
    || host.endsWith(".workers.dev")
  ) return "";
  return process.env.NEXT_PUBLIC_COMMUNITY_API_ORIGIN || fallbackApiOrigin;
};

export const communityApiUrl = (path: string) => `${communityApiOrigin()}${path}`;

export const publicSiteOrigin = () =>
  process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteOrigin;

export const publicUrl = (path: string) => new URL(path, publicSiteOrigin()).toString();

export const communityThreadPath = (id: string) => {
  return `/g/${encodeURIComponent(compactThreadId(id))}`;
};

export const communityThreadShareUrl = (id: string) => {
  return publicUrl(`/g/${encodeURIComponent(compactThreadId(id))}`);
};
