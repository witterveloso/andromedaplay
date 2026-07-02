import { useState } from "react";
import { ArrowRight, Bell, ExternalLink, MessageSquare, PlayCircle, Sparkles, Video, X } from "lucide-react";
import { toYouTubeEmbed, extractYouTubeId } from "@/lib/youtube";

type FeaturedKind = "post" | "video" | "lesson" | "notice";

export interface FeaturedMomentData {
  featured_enabled?: boolean | null;
  featured_kind?: string | null;
  featured_title?: string | null;
  featured_description?: string | null;
  featured_image_url?: string | null;
  featured_cta_label?: string | null;
  featured_cta_url?: string | null;
}

const KIND_META: Record<FeaturedKind, { label: string; Icon: typeof Sparkles }> = {
  post: { label: "Postagem", Icon: MessageSquare },
  video: { label: "Vídeo", Icon: Video },
  lesson: { label: "Aula", Icon: PlayCircle },
  notice: { label: "Aviso", Icon: Bell },
};

export function FeaturedMoment({ data, format }: { data: FeaturedMomentData | null | undefined; format?: string | null }) {
  const [open, setOpen] = useState(false);

  if (!data?.featured_enabled) return null;
  if (!data.featured_title && !data.featured_image_url) return null;

  const kind = (data.featured_kind ?? "post") as FeaturedKind;
  const meta = KIND_META[kind] ?? KIND_META.post;
  const Icon = meta.Icon;
  const ctaLabel = data.featured_cta_label?.trim() || "Acessar";
  const ctaUrl = data.featured_cta_url?.trim() || "";

  const isVideoUrl = !!ctaUrl && !!extractYouTubeId(ctaUrl);
  const videoEmbed = isVideoUrl ? toYouTubeEmbed(ctaUrl) : null;
  const hasMedia = !!data.featured_image_url || !!videoEmbed;
  const useModal = hasMedia;
  const isExternalLink = !useModal && /^https?:\/\//i.test(ctaUrl);

  const handleClick = (e: React.MouseEvent) => {
    if (useModal) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const fmt = (format ?? "banner").toLowerCase();
  const mediaAspectClass =
    fmt === "card-16-9" ? "aspect-video max-w-3xl mx-auto" :
    fmt === "card-9-16" ? "aspect-[9/16] max-w-sm mx-auto" :
    fmt === "hero-full" ? "aspect-[21/9]" :
    "aspect-[16/3] sm:aspect-[21/3] min-h-[75px]";

  return (
    <section className="relative w-full">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-6">
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-[0_20px_60px_-30px_rgba(108,77,255,0.5)]">
          <div
            className="pointer-events-none absolute -inset-px opacity-80 transition-opacity duration-700 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(60% 60% at 15% 50%, rgba(108,77,255,0.28), transparent 60%), radial-gradient(50% 60% at 95% 30%, rgba(0,184,255,0.18), transparent 60%)",
            }}
          />

          <div className={`relative w-full ${mediaAspectClass}`}>
            {data.featured_image_url ? (
              <img
                src={data.featured_image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.015]"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, #11102a, #0b0b18)" }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="relative h-full flex items-center">
              <div className="w-full sm:w-[62%] px-5 sm:px-8 lg:px-10 py-4 space-y-2 sm:space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/90">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Em destaque</span>
                  <span className="opacity-50">·</span>
                  <Icon className="h-3 w-3" />
                  <span>{meta.label}</span>
                </div>

                <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] leading-[1.1] line-clamp-2">
                  {data.featured_title}
                </h2>

                {data.featured_description && (
                  <p className="hidden sm:block text-sm text-white/80 max-w-xl leading-snug line-clamp-2">
                    {data.featured_description}
                  </p>
                )}

                <div className="pt-1">
                  <a
                    href={useModal ? "#" : (ctaUrl || "#")}
                    onClick={handleClick}
                    target={isExternalLink ? "_blank" : undefined}
                    rel={isExternalLink ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 rounded-full bg-white text-black px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold shadow-[0_10px_30px_-10px_rgba(255,255,255,0.5)] hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.99]"
                  >
                    {ctaLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative max-w-5xl w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {videoEmbed ? (
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
                <iframe
                  src={videoEmbed}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  title={data.featured_title ?? "Vídeo"}
                />
              </div>
            ) : data.featured_image_url ? (
              <img
                src={data.featured_image_url}
                alt={data.featured_title ?? ""}
                className="max-h-[85vh] w-auto mx-auto rounded-2xl shadow-2xl object-contain"
              />
            ) : null}

            {(data.featured_title || data.featured_description) && (
              <div className="mt-4 text-center text-white space-y-1">
                {data.featured_title && (
                  <h3 className="text-lg sm:text-xl font-semibold">{data.featured_title}</h3>
                )}
                {data.featured_description && (
                  <p className="text-sm text-white/70 max-w-2xl mx-auto">{data.featured_description}</p>
                )}
                {ctaUrl && !videoEmbed && /^https?:\/\//i.test(ctaUrl) && (
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-white/80 hover:text-white underline"
                  >
                    Abrir link original <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
