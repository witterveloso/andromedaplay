import { cn } from "@/lib/utils";

/**
 * Andromeda Play — refined wordmark.
 * Premium, editorial, Sora-based. Discreet cosmic mark on the side.
 */
export function AndromedaLogo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="ap-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6C4DFF" />
            <stop offset="100%" stopColor="#00B8FF" />
          </linearGradient>
        </defs>
        {/* Orbital ring */}
        <ellipse
          cx="20" cy="20" rx="17" ry="6"
          fill="none"
          stroke="url(#ap-ring)"
          strokeWidth="1.2"
          transform="rotate(-22 20 20)"
        />
        {/* Star point */}
        <circle cx="20" cy="20" r="2.4" fill="#F2F4F8" />
        <circle cx="20" cy="20" r="5" fill="none" stroke="url(#ap-ring)" strokeWidth="0.6" opacity="0.5" />
      </svg>
      {showWordmark && (
        <div className="leading-none">
          <div
            className="text-[15px] font-medium tracking-[0.22em] text-soft-white"
            style={{ fontFamily: "Sora, system-ui, sans-serif" }}
          >
            ANDROMEDA
          </div>
          <div
            className="mt-1 text-[9px] tracking-[0.55em] text-stellar-silver/80"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            PLAY
          </div>
        </div>
      )}
    </div>
  );
}
