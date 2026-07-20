import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/format";

export const SHARE_PREVIEW_VERSION = "20260720";
export const DEFAULT_SHARE_IMAGE_PATH = "/assets/bachata-share-card.jpg";
export const DEFAULT_SHARE_IMAGE = absoluteUrl(DEFAULT_SHARE_IMAGE_PATH);

export const cleanShareText = (value = "", maxLength = 140) => {
  const text = value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
};

export const buildShareDescription = ({
  excerpt,
  body,
  bestComment,
  suffix = "바차타 코리아에서 댓글과 반응을 이어보세요."
}: {
  excerpt?: string;
  body?: string;
  bestComment?: string | null;
  suffix?: string;
}) => {
  const lead = cleanShareText(excerpt || body || "", bestComment ? 92 : 118);
  const comment = bestComment ? cleanShareText(bestComment, 52) : "";
  const parts = [lead, comment ? `베댓: ${comment}` : "", suffix].filter(Boolean);
  return cleanShareText(parts.join(" · "), 180);
};

export const shareImageSize = (imageUrl: string) =>
  imageUrl === DEFAULT_SHARE_IMAGE
    ? { width: 1200, height: 630 }
    : { width: 480, height: 360 };

export const articleShareMetadata = ({
  title,
  description,
  url,
  imageUrl = DEFAULT_SHARE_IMAGE,
  imageAlt = title
}: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  imageAlt?: string;
}): Metadata => {
  const imageSize = shareImageSize(imageUrl);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: imageUrl, ...imageSize, alt: imageAlt }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
};

export const sharePreviewUrl = (url: string) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("share", SHARE_PREVIEW_VERSION);
  return nextUrl.toString();
};
