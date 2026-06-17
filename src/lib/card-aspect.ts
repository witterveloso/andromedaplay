export type CardAspect = "16:9" | "4:5" | "1:1" | "9:16" | "2:3" | "custom";

export const ASPECT_OPTIONS: { value: CardAspect; label: string; hint: string }[] = [
  { value: "16:9", label: "16:9", hint: "YouTube / horizontal" },
  { value: "4:5", label: "4:5", hint: "Feed Instagram" },
  { value: "1:1", label: "1:1", hint: "Quadrado" },
  { value: "9:16", label: "9:16", hint: "Story / Reels / TikTok" },
  { value: "2:3", label: "2:3", hint: "Pôster / Netflix" },
  { value: "custom", label: "Personalizado", hint: "Ex.: 3/4, 5/6, 21/9" },
];

export function aspectRatioStyle(
  aspect?: string | null,
  custom?: string | null,
): React.CSSProperties {
  const a = (aspect ?? "2:3").toLowerCase();
  if (a === "custom" && custom) {
    const norm = custom.replace(":", "/").trim();
    return { aspectRatio: norm };
  }
  switch (a) {
    case "16:9": return { aspectRatio: "16 / 9" };
    case "4:5": return { aspectRatio: "4 / 5" };
    case "1:1": return { aspectRatio: "1 / 1" };
    case "9:16": return { aspectRatio: "9 / 16" };
    case "2:3":
    default: return { aspectRatio: "2 / 3" };
  }
}

/**
 * Width tuned per aspect so rails feel balanced regardless of orientation.
 * Returns Tailwind classes (responsive).
 */
export function cardWidthClass(aspect?: string | null): string {
  const a = (aspect ?? "2:3").toLowerCase();
  switch (a) {
    case "16:9":
      return "w-[260px] sm:w-[290px] md:w-[320px] lg:w-[340px]";
    case "9:16":
      return "w-[150px] sm:w-[165px] md:w-[180px] lg:w-[195px]";
    case "1:1":
      return "w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]";
    case "4:5":
      return "w-[190px] sm:w-[210px] md:w-[230px] lg:w-[250px]";
    case "2:3":
    default:
      return "w-[170px] sm:w-[190px] md:w-[210px] lg:w-[225px]";
  }
}
