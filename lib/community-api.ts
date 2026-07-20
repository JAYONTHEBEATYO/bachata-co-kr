const fallbackApiOrigin = "https://bachata-co-kr.bachata-korea.workers.dev";
const fallbackSiteOrigin = "https://bachata.co.kr";

export const communityApiOrigin = () => {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_COMMUNITY_API_ORIGIN || "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev")) return "";
  return process.env.NEXT_PUBLIC_COMMUNITY_API_ORIGIN || fallbackApiOrigin;
};

export const communityApiUrl = (path: string) => `${communityApiOrigin()}${path}`;

export const publicSiteOrigin = () =>
  process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteOrigin;

export const publicUrl = (path: string) => new URL(path, publicSiteOrigin()).toString();

export const communityThreadPath = (id: string) => {
  const encodedId = encodeURIComponent(id);
  if (typeof window === "undefined" || window.location.hostname.endsWith(".workers.dev")) {
    return `/g/${encodedId}`;
  }
  return `/guest/?id=${encodedId}`;
};

export const communityThreadShareUrl = (id: string) => {
  const origin = process.env.NEXT_PUBLIC_COMMUNITY_THREAD_ORIGIN || fallbackApiOrigin;
  return new URL(`/g/${encodeURIComponent(id)}`, origin).toString();
};
