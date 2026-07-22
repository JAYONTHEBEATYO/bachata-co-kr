import type { ThreadMediaItem } from "@/lib/thread-media";
import { CloudflareStreamPlayer } from "./CloudflareStreamPlayer";

type ThreadMediaAttachmentsProps = {
  media: ThreadMediaItem[];
  compact?: boolean;
};

export function ThreadMediaAttachments({ media, compact = false }: ThreadMediaAttachmentsProps) {
  if (!media.length) return null;
  const hasVideo = media.some((item) => item.type === "stream" || item.type === "video");
  const layoutClass = hasVideo ? "has-video" : "image-gallery";
  const countClass = media.length === 1 ? "single" : "multiple";

  return (
    <div className={`thread-media-grid ${compact ? "compact" : ""} ${layoutClass} ${countClass}`.trim()}>
      {media.map((item) => (
        <figure key={item.url} className="thread-media-item">
          {item.type === "stream" && item.streamId ? (
            <CloudflareStreamPlayer videoId={item.streamId} compact={compact} />
          ) : item.type === "video" ? (
            <video src={item.url} controls preload="metadata" />
          ) : (
            <img src={item.url} alt="첨부 이미지" loading="lazy" />
          )}
        </figure>
      ))}
    </div>
  );
}
