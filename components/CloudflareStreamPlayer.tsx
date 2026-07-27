"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { communityApiUrl } from "@/lib/community-api";

type StreamVideo = {
  id: string;
  status: string;
  readyToStream: boolean;
  progress?: string;
  playerUrl: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

type StreamPlayerApi = {
  volume: number;
  muted: boolean;
  addEventListener: (event: string, listener: () => void) => void;
  removeEventListener: (event: string, listener: () => void) => void;
};

declare global {
  interface Window {
    Stream?: (iframe: HTMLIFrameElement) => StreamPlayerApi;
  }
}

type CloudflareStreamPlayerProps = {
  videoId: string;
  compact?: boolean;
};

const streamSdkUrl = "https://embed.cloudflarestream.com/embed/sdk.latest.js";
const storedVolumeKey = "bachata-stream-volume";
let streamSdkPromise: Promise<void> | null = null;

const loadStreamSdk = () => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Stream) return Promise.resolve();
  if (streamSdkPromise) return streamSdkPromise;

  streamSdkPromise = new Promise<void>((resolve, reject) => {
    document.querySelector<HTMLScriptElement>(`script[src="${streamSdkUrl}"]`)?.remove();
    const script = document.createElement("script");
    const fail = () => {
      script.remove();
      reject(new Error("stream-sdk"));
    };
    const done = () => window.Stream ? resolve() : fail();
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", fail, { once: true });
    script.src = streamSdkUrl;
    script.async = true;
    document.head.appendChild(script);
  }).catch((error) => {
    streamSdkPromise = null;
    throw error;
  });
  return streamSdkPromise;
};

const readStoredVolume = () => {
  try {
    const value = Number(window.localStorage.getItem(storedVolumeKey));
    return Number.isFinite(value) && value > 0 && value <= 1 ? value : 0.8;
  } catch {
    return 0.8;
  }
};

export function CloudflareStreamPlayer({ videoId, compact = false }: CloudflareStreamPlayerProps) {
  const [video, setVideo] = useState<StreamVideo | null>(null);
  const [failed, setFailed] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<StreamPlayerApi | null>(null);

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

  useEffect(() => {
    if (!video?.readyToStream || !iframeRef.current) return;
    let disposed = false;
    let player: StreamPlayerApi | null = null;

    const syncVolume = () => {
      if (!player) return;
      setVolume(player.volume);
      setMuted(player.muted);
    };

    void loadStreamSdk()
      .then(() => {
        if (disposed || !iframeRef.current || !window.Stream) return;
        player = window.Stream(iframeRef.current);
        playerRef.current = player;
        const savedVolume = readStoredVolume();
        player.volume = savedVolume;
        setVolume(savedVolume);
        setMuted(player.muted);
        player.addEventListener("volumechange", syncVolume);
        setApiReady(true);
      })
      .catch(() => setApiReady(false));

    return () => {
      disposed = true;
      if (player) player.removeEventListener("volumechange", syncVolume);
      if (playerRef.current === player) playerRef.current = null;
      setApiReady(false);
    };
  }, [video?.playerUrl, video?.readyToStream]);

  const changeVolume = (nextVolume: number) => {
    const normalized = Math.max(0, Math.min(1, nextVolume));
    setVolume(normalized);
    setMuted(normalized === 0);
    const player = playerRef.current;
    if (player) {
      player.volume = normalized;
      player.muted = normalized === 0;
    }
    try {
      if (normalized > 0) window.localStorage.setItem(storedVolumeKey, String(normalized));
    } catch {
      // Storage can be unavailable in privacy mode; volume still works for this view.
    }
  };

  const toggleMute = () => {
    if (muted || volume === 0) {
      const restoredVolume = volume > 0 ? volume : readStoredVolume();
      setVolume(restoredVolume);
      setMuted(false);
      if (playerRef.current) {
        playerRef.current.volume = restoredVolume;
        playerRef.current.muted = false;
      }
      return;
    }
    setMuted(true);
    if (playerRef.current) playerRef.current.muted = true;
  };

  if (video?.readyToStream) {
    const isPortrait = Number(video.height) > Number(video.width);
    const aspectRatio = isPortrait
      ? "1 / 1"
      : Number(video.width) > 0 && Number(video.height) > 0
        ? `${video.width} / ${video.height}`
        : "16 / 9";

    return (
      <div
        className={compact ? "stream-player compact" : "stream-player"}
        data-orientation={isPortrait ? "portrait" : "landscape"}
        style={{ aspectRatio }}
      >
        <iframe
          ref={iframeRef}
          src={video.playerUrl}
          title="바차타 영상"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
        <div className="stream-volume-control" data-ready={apiReady}>
          <button
            type="button"
            onClick={toggleMute}
            disabled={!apiReady}
            aria-label={muted ? "소리 켜기" : "음소거"}
            title={muted ? "소리 켜기" : "음소거"}
          >
            {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            disabled={!apiReady}
            aria-label="영상 음량"
            aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
          />
        </div>
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
