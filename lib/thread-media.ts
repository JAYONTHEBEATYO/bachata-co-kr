export type ThreadMediaItem = {
  url: string;
  type: "image" | "video" | "stream";
  streamId?: string;
};

const mediaUrlPattern = /^(.+?):\s*(https?:\/\/\S+\/api\/media\/uploads\/\S+)$/i;
const directMediaUrlPattern = /(https?:\/\/\S+\/api\/media\/uploads\/\S+)/i;
const streamMarkerPattern = /^Cloudflare Stream:\s*cfstream:([a-zA-Z0-9_-]{16,80})$/i;

const inferMediaType = (labelOrUrl: string): ThreadMediaItem["type"] => {
  const text = labelOrUrl.toLowerCase();
  if (/video|동영상|mp4|webm|mov|quicktime/.test(text)) return "video";
  return "image";
};

export const extractThreadMedia = (body: string, linkUrl?: string | null) => {
  const media = new Map<string, ThreadMediaItem>();
  const textLines: string[] = [];

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "[첨부]") continue;

    const streamMarker = trimmed.match(streamMarkerPattern);
    if (streamMarker) {
      const streamId = streamMarker[1];
      media.set(`cfstream:${streamId}`, {
        url: `cfstream:${streamId}`,
        type: "stream",
        streamId
      });
      continue;
    }

    const mediaLine = trimmed.match(mediaUrlPattern);
    if (mediaLine) {
      const [, label, url] = mediaLine;
      media.set(url, { url, type: inferMediaType(`${label} ${url}`) });
      continue;
    }

    const directMedia = trimmed.match(directMediaUrlPattern);
    if (directMedia && trimmed === directMedia[1]) {
      const url = directMedia[1];
      media.set(url, { url, type: inferMediaType(url) });
      continue;
    }

    textLines.push(line);
  }

  if (linkUrl && /\/api\/media\/uploads\//.test(linkUrl)) {
    media.set(linkUrl, { url: linkUrl, type: inferMediaType(linkUrl) });
  }

  return {
    text: textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    media: [...media.values()]
  };
};
