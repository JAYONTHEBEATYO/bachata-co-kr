import { Play } from "lucide-react";
import { youtubeEmbed, youtubeThumb, youtubeWatch } from "@/lib/format";

type VideoEmbedProps = {
  videoId: string;
  title: string;
  compact?: boolean;
};

export function VideoEmbed({ videoId, title, compact = false }: VideoEmbedProps) {
  return (
    <figure className={compact ? "video-card compact" : "video-card"}>
      <iframe
        src={youtubeEmbed(videoId)}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <figcaption>
        <span><Play size={14} /> 영상</span>
        <a href={youtubeWatch(videoId)} target="_blank" rel="noreferrer">YouTube에서 열기</a>
      </figcaption>
      <img src={youtubeThumb(videoId)} alt="" aria-hidden="true" className="video-fallback" />
    </figure>
  );
}
