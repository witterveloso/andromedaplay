import { useEffect, useState } from "react";
import { extractYouTubeId, isYouTubeLiveUrl, toYouTubeEmbed } from "@/lib/youtube";

type Props = {
  url: string;
  title?: string;
};

/**
 * Renders a YouTube player that supports active LIVE streams.
 * - Accepts /live/, /watch?v=, youtu.be/ URLs
 * - Shows "AO VIVO" badge for /live/ links
 * - Falls back to an elegant placeholder if the stream is offline
 */
export function YouTubeLivePlayer({ url, title }: Props) {
  const id = extractYouTubeId(url);
  const isLive = isYouTubeLiveUrl(url);
  const embed = toYouTubeEmbed(url) ?? url;
  const [offline, setOffline] = useState(false);

  // Poll the YouTube oEmbed endpoint for live URLs — if the video is not
  // available (private / not yet started), oEmbed returns 401/404.
  useEffect(() => {
    if (!isLive || !id) return;
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
          { method: "GET" },
        );
        if (!cancelled) setOffline(!r.ok);
      } catch {
        if (!cancelled) setOffline(true);
      }
    };
    void check();
    const t = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [id, isLive]);

  if (isLive && offline) {
    return (
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.4),transparent_60%)]" />
        <div className="relative text-center px-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs uppercase tracking-wider mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Aguardando
          </div>
          <p className="text-white/90 text-lg font-medium">A live começará em breve</p>
          <p className="text-white/50 text-sm mt-1">Fique por aqui — a transmissão aparece automaticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
      <iframe
        src={embed}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title={title ?? "YouTube"}
      />
      {isLive && (
        <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-red-600 text-white px-2 py-1 text-[11px] font-bold tracking-wider shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          AO VIVO
        </div>
      )}
    </div>
  );
}
