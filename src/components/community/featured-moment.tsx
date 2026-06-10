import { ArrowRight, Bell, MessageSquare, PlayCircle, Sparkles, Video } from "lucide-react";

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

export function FeaturedMoment({ data }: { data: FeaturedMomentData | null | undefined }) {
  if (!data?.featured_enabled) return null;
  if (!data.featured_title && !data.featured_image_url) return null;

  const kind = (data.featured_kind ?? "post") as FeaturedKind;
  const meta = KIND_META[kind] ?? KIND_META.post;
  const Icon = meta.Icon;
  const ctaLabel = data.featured_cta_label?.trim() || "Acessar";
  const ctaUrl = data.featured_cta_url?.trim() || "#";
  const isExternal = /^https?:\/\//i.test(ctaUrl);

  return (
    <section className="relative w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] shadow-[0_30px_80px_-30px_rgba(108,77,255,0.55)]">
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute -inset-px opacity-80 transition-opacity duration-700 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(60% 60% at 15% 50%, rgba(108,77,255,0.35), transparent 60%), radial-gradient(50% 60% at 95% 30%, rgba(0,184,255,0.22), transparent 60%)",
            }}
          />

          {/* Background image */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/7]">
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

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Top highlight */}
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Content */}
            <div className="relative h-full flex items-end sm:items-center">
              <div className="w-full sm:w-[68%] p-5 sm:p-10 lg:p-12 space-y-4 sm:space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs uppercase tracking-[0.18em] text-white/90">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Momento em destaque</span>
                  <span className="opacity-50">·</span>
                  <Icon className="h-3 w-3" />
                  <span>{meta.label}</span>
                </div>

                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] leading-[1.05]">
                  {data.featured_title}
                </h2>

                {data.featured_description && (
                  <p className="text-sm sm:text-base text-white/80 max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {data.featured_description}
                  </p>
                )}

                <div className="pt-1 sm:pt-2">
                  <a
                    href={ctaUrl}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)] hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.99]"
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
