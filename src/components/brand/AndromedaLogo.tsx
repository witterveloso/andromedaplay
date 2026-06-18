import { cn } from "@/lib/utils";

/**
 * Andromeda Play — official identity.
 * Stylized "A" with orbital ring + cosmic gradient wordmark.
 */
export function AndromedaLogo({
  className,
  showWordmark = true,
  size = 36,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AndromedaMark size={size} />
      {showWordmark && (
        <div className="leading-none">
          <div
            className="font-semibold tracking-[0.14em] text-soft-white"
            style={{
              fontFamily: "Sora, system-ui, sans-serif",
              fontSize: Math.round(size * 0.46),
            }}
          >
            ANDROMEDA
          </div>
          <div
            className="mt-1 font-medium tracking-[0.6em]"
            style={{
              fontFamily: "Manrope, system-ui, sans-serif",
              fontSize: Math.round(size * 0.26),
              color: "#E879F9",
            }}
          >
            PLAY
          </div>
        </div>
      )}
    </div>
  );
}

export function AndromedaMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient id="ap-mark-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#E879F9" />
          <stop offset="55%" stopColor="#6C4DFF" />
          <stop offset="100%" stopColor="#00B8FF" />
        </linearGradient>
        <linearGradient id="ap-orbit-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E879F9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00B8FF" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Orbital ring */}
      <ellipse
        cx="32"
        cy="22"
        rx="22"
        ry="7"
        fill="none"
        stroke="url(#ap-orbit-grad)"
        strokeWidth="1.4"
        transform="rotate(-18 32 22)"
      />

      {/* Stylized A */}
      <path
        d="M32 10 L52 54 L44 54 L40.2 45 L23.8 45 L20 54 L12 54 Z M27 38 L37 38 L32 25 Z"
        fill="url(#ap-mark-grad)"
      />

      {/* Center play accent */}
      <path
        d="M30.4 30 L36 33 L30.4 36 Z"
        fill="#F5F3FF"
        opacity="0.95"
      />
    </svg>
  );
}
