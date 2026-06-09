import { cn } from "@/lib/utils";

export function AndromedaLogo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="ap-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6C4DFF" />
            <stop offset="100%" stopColor="#00B8FF" />
          </linearGradient>
          <radialGradient id="ap-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#6C4DFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6C4DFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#ap-glow)" />
        <ellipse cx="32" cy="32" rx="26" ry="9" fill="none" stroke="url(#ap-grad)" strokeWidth="1.5" transform="rotate(-20 32 32)" />
        <path d="M22 46 L32 18 L42 46 M26 38 L38 38" stroke="url(#ap-grad)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <polygon points="34,30 42,34 34,38 36,34" fill="#F2F4F8" />
      </svg>
      {showWordmark && (
        <div className="leading-none">
          <div className="font-display text-base font-bold tracking-[0.18em] text-soft-white">ANDROMEDA</div>
          <div className="font-display text-[10px] tracking-[0.5em] text-electric-blue">PLAY</div>
        </div>
      )}
    </div>
  );
}