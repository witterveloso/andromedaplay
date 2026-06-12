import { extractYouTubeId, isYouTubeLiveUrl, toYouTubeEmbed } from "@/lib/youtube";

type Props = {
  url: string;
  title?: string;
};

/**
 * Renders a YouTube player that supports active LIVE streams, including
 * unlisted videos. We do not gate rendering on the oEmbed endpoint because
 * oEmbed returns 401/404 for unlisted videos — but the iframe embed works
 * perfectly fine for them.
 *
 * Accepts /live/, /watch?v=, youtu.be/, /embed/, /shorts/ URLs.
 * Shows "AO VIVO" badge for /live/ links.
 * Shows a placeholder only when the URL is missing or unparseable.
 */
export function YouTubeLivePlayer({ url, title }: Props) {
  const id = extractYouTubeId(url);
  const isLive = isYouTubeLiveUrl(url);
  const embed = toYouTubeEmbed(url);

  const hasValid = Boolean(url && id && embed);

  if (!hasValid) {
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
        src={embed!}
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
