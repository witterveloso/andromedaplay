import { useEffect, useRef } from "react";
import { toYouTubeEmbed } from "@/lib/youtube";

export type VideoProvider =
  | "youtube"
  | "bunny"
  | "cloudflare"
  | "vimeo"
  | "mux"
  | "custom"
  | "external_link";

export const VIDEO_PROVIDERS: { value: VideoProvider; label: string; hint: string }[] = [
  { value: "youtube", label: "YouTube", hint: "Cole o link do vídeo do YouTube (watch, youtu.be, shorts ou /embed)." },
  { value: "bunny", label: "Bunny Stream", hint: "Use a URL de iframe (https://iframe.mediadelivery.net/embed/LIBRARY/VIDEO_ID) ou preencha o ID do vídeo." },
  { value: "cloudflare", label: "Cloudflare Stream", hint: "Use a URL de iframe (https://iframe.videodelivery.net/UID) ou preencha o ID do vídeo." },
  { value: "vimeo", label: "Vimeo", hint: "Cole o link do vídeo (https://vimeo.com/ID) ou o ID do vídeo." },
  { value: "mux", label: "Mux", hint: "Cole a URL do player (https://stream.mux.com/PLAYBACK_ID.m3u8) ou o Playback ID." },
  { value: "custom", label: "URL/embed personalizado", hint: "Cole a URL completa do player ou o código embed (<iframe …>)." },
  { value: "external_link", label: "Link externo (sem player)", hint: "O aluno verá um botão para acessar o link em uma nova aba (ex.: ChatGPT, Notion, Drive)." },
];

export type VideoConfig = {
  provider: VideoProvider | null;
  url?: string | null;
  externalId?: string | null;
  embed?: string | null;
  // Legacy fallback
  legacyYoutubeUrl?: string | null;
};

/** Resolve a playable iframe URL for the configured provider. */
export function resolveVideoEmbedUrl(cfg: VideoConfig): string | null {
  const provider = cfg.provider ?? "youtube";
  const url = (cfg.url ?? "").trim();
  const id = (cfg.externalId ?? "").trim();

  switch (provider) {
    case "youtube": {
      const src = url || cfg.legacyYoutubeUrl || "";
      if (!src && !id) return null;
      if (id && !src) return `https://www.youtube.com/embed/${id}`;
      return toYouTubeEmbed(src) ?? src;
    }
    case "bunny": {
      if (url) return url;
      if (id) {
        const parts = id.split("/");
        if (parts.length === 2) return `https://iframe.mediadelivery.net/embed/${parts[0]}/${parts[1]}`;
      }
      return null;
    }
    case "cloudflare": {
      if (url) return url;
      if (id) return `https://iframe.videodelivery.net/${id}`;
      return null;
    }
    case "vimeo": {
      if (id) return `https://player.vimeo.com/video/${id}`;
      if (url) {
        try {
          const u = new URL(url);
          if (u.hostname.includes("player.vimeo.com")) return url;
          const m = u.pathname.match(/(\d+)/);
          if (m) return `https://player.vimeo.com/video/${m[1]}`;
        } catch {}
        return url;
      }
      return null;
    }
    case "mux": {
      if (url) return url;
      if (id) return `https://stream.mux.com/${id}.m3u8`;
      return null;
    }
    case "custom": {
      return url || null;
    }
    case "external_link": {
      return null;
    }
  }
}

/** Extract a usable iframe src from a raw embed snippet. */
function extractIframeSrc(html: string): string | null {
  const m = html.match(/src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractYouTubeIdFromEmbed(embedUrl: string | null): string | null {
  if (!embedUrl) return null;
  const m = embedUrl.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

// ---- YouTube IFrame API loader (singleton) ----
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      try { prev?.(); } catch {}
      resolve(w.YT);
    };
    if (!document.querySelector('script[data-yt-iframe-api]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.setAttribute("data-yt-iframe-api", "true");
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

export type VideoProgressData = { seconds: number; duration: number; percent: number };

type YouTubePlayerProps = {
  videoId: string;
  title?: string;
  className?: string;
  onProgress?: (d: VideoProgressData) => void;
  onEnded?: () => void;
};

function YouTubePlayer({ videoId, title, className, onProgress, onEnded }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const endedFiredRef = useRef(false);
  // Keep the latest callbacks accessible without re-instantiating the player.
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  useEffect(() => {
    let interval: number | null = null;
    let disposed = false;
    endedFiredRef.current = false;

    const tick = () => {
      try {
        const p = playerRef.current;
        if (!p?.getCurrentTime || !p?.getDuration) return;
        const seconds = p.getCurrentTime();
        const duration = p.getDuration();
        if (!duration || !isFinite(duration)) return;
        const percent = Math.max(0, Math.min(100, Math.round((seconds / duration) * 100)));
        onProgressRef.current?.({ seconds, duration, percent });
        if (percent >= 90 && !endedFiredRef.current) {
          endedFiredRef.current = true;
          onEndedRef.current?.();
        }
      } catch {}
    };

    loadYouTubeIframeApi().then((YT) => {
      if (disposed || !containerRef.current || !YT?.Player) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onStateChange: (e: any) => {
            const state = e.data;
            if (state === YT.PlayerState.PLAYING) {
              tick();
              if (interval) window.clearInterval(interval);
              interval = window.setInterval(tick, 5000);
            } else if (state === YT.PlayerState.ENDED) {
              if (interval) { window.clearInterval(interval); interval = null; }
              tick();
              if (!endedFiredRef.current) {
                endedFiredRef.current = true;
                onEndedRef.current?.();
              }
            } else {
              // PAUSED / BUFFERING / CUED
              if (interval) { window.clearInterval(interval); interval = null; }
            }
          },
        },
      });
    }).catch(() => {});

    return () => {
      disposed = true;
      if (interval) window.clearInterval(interval);
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className={className ?? "aspect-video w-full rounded-lg overflow-hidden bg-black"}>
      <div ref={containerRef} className="w-full h-full" title={title} />
    </div>
  );
}

type VideoPlayerProps = {
  config: VideoConfig;
  title?: string;
  className?: string;
  onProgress?: (d: VideoProgressData) => void;
  onEnded?: () => void;
};

export function VideoPlayer({ config, title, className, onProgress, onEnded }: VideoPlayerProps) {
  const wrap = className ?? "aspect-video w-full rounded-lg overflow-hidden bg-black";
  const provider = config.provider ?? "youtube";

  // YouTube: use IFrame API so we can track real progress.
  if (provider === "youtube") {
    const embedUrl = resolveVideoEmbedUrl(config);
    const videoId = extractYouTubeIdFromEmbed(embedUrl) || (config.externalId ?? "").trim() || null;
    if (videoId) {
      return (
        <YouTubePlayer
          videoId={videoId}
          title={title}
          className={wrap}
          onProgress={onProgress}
          onEnded={onEnded}
        />
      );
    }
    // fall through to generic iframe if we couldn't parse an id
  }

  // 1) explicit embed snippet wins (custom or any provider)
  const embedRaw = (config.embed ?? "").trim();
  if (embedRaw) {
    const src = extractIframeSrc(embedRaw);
    if (src) {
      return (
        <div className={wrap}>
          <iframe
            src={src}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title={title}
          />
        </div>
      );
    }
    return (
      <div
        className={wrap}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: embedRaw }}
      />
    );
  }

  // 2) Mux .m3u8 → use native <video>
  if (provider === "mux") {
    const src = resolveVideoEmbedUrl(config);
    if (!src) return null;
    return (
      <div className={wrap}>
        <video src={src} controls className="w-full h-full" title={title} />
      </div>
    );
  }

  const src = resolveVideoEmbedUrl(config);
  if (!src) return null;
  return (
    <div className={wrap}>
      <iframe
        src={src}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title={title}
      />
    </div>
  );
}
