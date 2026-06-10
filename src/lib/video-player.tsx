import { toYouTubeEmbed } from "@/lib/youtube";

export type VideoProvider =
  | "youtube"
  | "bunny"
  | "cloudflare"
  | "vimeo"
  | "mux"
  | "custom";

export const VIDEO_PROVIDERS: { value: VideoProvider; label: string; hint: string }[] = [
  { value: "youtube", label: "YouTube", hint: "Cole o link do vídeo do YouTube (watch, youtu.be, shorts ou /embed)." },
  { value: "bunny", label: "Bunny Stream", hint: "Use a URL de iframe (https://iframe.mediadelivery.net/embed/LIBRARY/VIDEO_ID) ou preencha o ID do vídeo." },
  { value: "cloudflare", label: "Cloudflare Stream", hint: "Use a URL de iframe (https://iframe.videodelivery.net/UID) ou preencha o ID do vídeo." },
  { value: "vimeo", label: "Vimeo", hint: "Cole o link do vídeo (https://vimeo.com/ID) ou o ID do vídeo." },
  { value: "mux", label: "Mux", hint: "Cole a URL do player (https://stream.mux.com/PLAYBACK_ID.m3u8) ou o Playback ID." },
  { value: "custom", label: "URL/embed personalizado", hint: "Cole a URL completa do player ou o código embed (<iframe …>)." },
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
        // ID format "library/video" OR just video id (won't play without library)
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
  }
}

/** Extract a usable iframe src from a raw embed snippet. */
function extractIframeSrc(html: string): string | null {
  const m = html.match(/src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

type VideoPlayerProps = {
  config: VideoConfig;
  title?: string;
  className?: string;
};

export function VideoPlayer({ config, title, className }: VideoPlayerProps) {
  const wrap = className ?? "aspect-video w-full rounded-lg overflow-hidden bg-black";

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
    // Raw HTML fallback
    return (
      <div
        className={wrap}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: embedRaw }}
      />
    );
  }

  // 2) Mux .m3u8 → use native <video> (HLS works on Safari; others need hls.js, future work)
  const provider = config.provider ?? "youtube";
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
