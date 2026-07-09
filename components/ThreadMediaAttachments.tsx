import type { ThreadMediaItem } from "@/lib/thread-media";

type ThreadMediaAttachmentsProps = {
  media: ThreadMediaItem[];
  compact?: boolean;
};

export function ThreadMediaAttachments({ media, compact = false }: ThreadMediaAttachmentsProps) {
  if (!media.length) return null;

  return (
    <div className={compact ? "thread-media-grid compact" : "thread-media-grid"}>
      {media.map((item) => (
        <figure key={item.url} className="thread-media-item">
          {item.type === "video" ? (
            <video src={item.url} controls preload="metadata" />
          ) : (
            <img src={item.url} alt="첨부 이미지" loading="lazy" />
          )}
        </figure>
      ))}
    </div>
  );
}
