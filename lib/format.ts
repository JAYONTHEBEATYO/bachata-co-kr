export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bachata.co.kr";

export const absoluteUrl = (path = "/") => new URL(path, siteUrl).toString();

export const formatRelativeDate = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.round(hours / 24);
  return `${days}일 전`;
};
