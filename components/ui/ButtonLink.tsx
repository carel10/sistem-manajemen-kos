import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRight } from "@/components/icons";

type Variant = "primary" | "secondary";

// Primary: lime with ink text (never white on lime). Secondary: surface with an ink border.
const VARIANT: Record<Variant, string> = {
  primary:
    "border-action bg-action text-on-action hover:border-action-hover hover:bg-action-hover active:translate-y-px",
  secondary:
    "border-text-primary bg-surface text-text-primary hover:bg-background active:translate-y-px active:bg-locked-bg",
};

/** A link that looks like a button (min-height 48, radius 8). Use <button> for actions, this for navigation. */
export function ButtonLink({
  href,
  variant = "primary",
  block = false,
  compact = false,
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  block?: boolean;
  /** 16px side padding instead of 20 (the navbar button). */
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border text-body leading-none font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-150 ease-out ${compact ? "px-4" : "px-5"} ${VARIANT[variant]} ${block ? "w-full" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}

/** Text link with a trailing arrow (the "Daftar Minat →" calls to action in the segment rows). */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-sm font-semibold text-primary transition-[color] duration-150 ease-out hover:text-primary-hover hover:underline hover:underline-offset-3"
    >
      {children}
      <ArrowRight size={20} />
    </Link>
  );
}
