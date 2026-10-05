import type { ReactNode } from "react";

/** Page container: max 1200px, side padding 16 / 24 (md) / 32 (xl) — docs/design/01-design-system.md §4. */
export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-300 px-4 md:px-6 xl:px-8 ${className}`}>{children}</div>;
}

/** Eyebrow + title + optional subtitle at the top of a landing section. */
export function SectionHead({
  eyebrow,
  title,
  titleId,
  sub,
  center = false,
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  titleId: string;
  sub?: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex max-w-160 flex-col gap-3 ${center ? "mx-auto items-center text-center" : ""} ${className}`}
    >
      <span className="text-label tracking-eyebrow text-primary uppercase">{eyebrow}</span>
      <h2 id={titleId} className="text-h1 md:text-display">
        {title}
      </h2>
      {sub && <p className="max-w-[60ch] text-lead text-text-secondary">{sub}</p>}
    </div>
  );
}

/** 48×48 icon tile (40 in the segment rows, 32 in notification mocks). */
export function IconBox({
  tone,
  size = "lg",
  children,
}: {
  tone: "brand" | "neutral" | "locked";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const TONE = {
    brand: "bg-primary-subtle text-primary",
    neutral: "border border-border bg-background text-text-primary",
    locked: "bg-locked-bg text-text-secondary",
  } as const;
  const SIZE = { sm: "size-8", md: "size-10", lg: "size-12" } as const;
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg ${SIZE[size]} ${TONE[tone]}`}>{children}</span>
  );
}

export const CARD = "rounded-lg border border-border bg-surface shadow-sm";
export const CARD_HOVER = "transition-[border-color] duration-150 ease-out hover:border-text-secondary";
