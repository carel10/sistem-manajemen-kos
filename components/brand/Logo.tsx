/**
 * Logo
 * Renders the light AND the white version; CSS (.th-l / .th-d in globals.css) shows one per theme,
 * so the right logo is there on first paint without waiting for JavaScript.
 * Never stretch, rotate or recolor it. Files live in public/brand/ (UI uses the -trim variants only).
 *
 * Sizes in the design: navbar height 32 · dashboard top bar <1024: 24 · sidebar width 180 (≈ height 40)
 * · Masuk/Daftar (stacked) height 120, 96 below 768 · footer 32.
 */
import Image from "next/image";

const H_RATIO = 364.3 / 80; // horizontal: width / height (viewBox of the -trim files)
const S_RATIO = 180.2 / 138; // stacked

type Props = {
  variant?: "horizontal" | "stacked";
  height: number;
  className?: string;
  alt?: string;
  /** Force one version (e.g. always white on a forest/ink band, always ink on lime). */
  on?: "auto" | "dark-surface" | "lime";
};

export function Logo({ variant = "horizontal", height, className = "", alt = "manaKos", on = "auto" }: Props) {
  const ratio = variant === "horizontal" ? H_RATIO : S_RATIO;
  const width = Math.round(height * ratio);
  const light = `/brand/manakos-logo-${variant}-trim.svg`;
  const white = `/brand/manakos-logo-${variant}-putih-trim.svg`;
  const ink = "/brand/manakos-logo-horizontal-ink-trim.svg";
  // Static SVG, so no image optimizer. Eager: above the fold and tiny (~3.6 KB).
  const size = { width, height, style: { height, width: "auto" } } as const;

  if (on === "dark-surface") return <Image src={white} alt={alt} className={className} unoptimized loading="eager" {...size} />;
  if (on === "lime") return <Image src={ink} alt={alt} className={className} unoptimized loading="eager" {...size} />;
  return (
    <>
      <Image src={light} alt={alt} className={`th-l ${className}`} unoptimized loading="eager" {...size} />
      <Image src={white} alt={alt} className={`th-d ${className}`} unoptimized loading="eager" {...size} />
    </>
  );
}
