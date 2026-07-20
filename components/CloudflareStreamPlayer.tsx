"use client";

import { useEffect, useState } from "react";
import { Clapperboard, RefreshCw } from "lucide-react";
import { communityApiUrl } from "@/lib/community-api";

type StreamVideo = {
  id: string;
  status: string;
  readyToStream: boolean;
  progress?: string;
  playerUrl: string;
  thumbnailUrl?: string | null;
};

type CloudflareStreamPlayerProps = {
  videoId: string;
  compact?: boolean;
};

export function CloudflareStreamPlayer({ videoId, compact = false }: CloudflareStreamPlayerProps) {
  const [video, setVideo] = useState<StreamVideo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const load = async () => {
      attempts += 1;
      try {
        const response = await fetch(communityApiUrl(`/api/video-uploads/?id=${encodeURIComponent(videoId)}`), {
          cache: "no-store"
        });
        const data = await response.json() as { video?: StreamVideo };
        if (!response.ok || !data.video) throw new Error("stream-status");
        if (cancelled) return;
        setVideo(data.video);
        setFailed(false);
        if (!data.video.readyToStream && attempts < 40) timer = setTimeout(load, 3000);
      } catch {
        if (cancelled) return;
        if (attempts < 5) timer = setTimeout(load, 3000);
        else setFailed(true);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [videoId]);

  if (video?.readyToStream) {
    return (
      <div className={compact ? "stream-player compact" : "stream-player"}>
        <iframe
          src={video.playerUrl}
          title="바차타 영상"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={compact ? "stream-processing compact" : "stream-processing"}>
      {failed ? <Clapperboard size={compact ? 22 : 28} /> : <RefreshCw className="stream-spinner" size={compact ? 22 : 28} />}
      <strong>{failed ? "영상을 불러오지 못했습니다." : "영상을 재생할 수 있게 준비하고 있어요."}</strong>
      <span>{failed ? "잠시 후 페이지를 새로고침해주세요." : `${video?.progress || "0"}% 처리 중`}</span>
    </div>
  );
}
