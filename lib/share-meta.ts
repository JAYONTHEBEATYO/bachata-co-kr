import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/format";

export const SHARE_PREVIEW_VERSION = "2";
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

const firstSentence = (value = "") => {
  const clean = value
    .replace(/^\d{4}년\s+\d{1,2}월\s+\d{1,2}일\s+(?:공개|발매|업로드|개최)(?:된|한)?\s*/u, "")
    .replace(/^〈[^〉]+〉(?:은|는)\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = clean.match(/^.*?[.!?](?:\s|$)/u);
  const sentence = (match?.[0] || clean).trim();
  const musicLead = sentence.match(/^(.+?의\s+.+?보컬)에\s+.+?의\s+프로덕션이\s+더해진\s+(.+)$/u);
  return musicLead ? `${musicLead[1]}이 돋보이는 ${musicLead[2]}` : sentence;
};

export const buildShareTitle = (value = "") => {
  const title = cleanShareText(value, 90);
  const labeled = title.match(/^\[([^\]]+)\]\s*(.+)$/u);

  if (labeled) {
    const [, label, headline] = labeled;
    const segments = headline.split(/\s+[–—-]\s+/u).map((part) => part.trim()).filter(Boolean);
    const subject = segments.at(-1) || headline;
    if (subject.length <= 48) return cleanShareText(`${subject} | ${label}`, 64);
  }

  return cleanShareText(title, 64);
};

export const buildShareDescription = ({
  excerpt,
  body,
  bestComment,
  hasVideo = false
}: {
  excerpt?: string;
  body?: string;
  bestComment?: string | null;
  hasVideo?: boolean;
}) => {
  const source = firstSentence(excerpt || body || "");
  const lead = cleanShareText(source, bestComment ? 72 : hasVideo ? 88 : 108);
  const comment = bestComment ? cleanShareText(bestComment, 34) : "";
  const tail = comment ? `인기 댓글: ${comment}` : hasVideo ? "영상으로 확인해보세요." : "";
  return cleanShareText([lead, tail].filter(Boolean).join(" · "), 126);
};

export const shareImageSize = (imageUrl: string) => {
  if (imageUrl === DEFAULT_SHARE_IMAGE || /cloudflarestream\.com|videodelivery\.net/i.test(imageUrl)) {
    return { width: 1200, height: 630 };
  }
  return { width: 480, height: 360 };
};

export const articleShareMetadata = ({
  title,
  description,
  url,
  imageUrl = DEFAULT_SHARE_IMAGE,
  imageAlt = title,
  publishedTime,
  modifiedTime,
  section,
  authors
}: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  imageAlt?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  authors?: string[];
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
      publishedTime,
      modifiedTime,
      section,
      authors,
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
  nextUrl.searchParams.set("s", SHARE_PREVIEW_VERSION);
  return nextUrl.toString();
};
