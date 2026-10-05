import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRight } from "@/components/icons";

import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from "./button-styles";

/** A link that looks like a button (min-height 48, radius 8). Use <Button> for actions, this for navigation. */
export function ButtonLink({
  href,
  variant = "primary",
  block = false,
  compact = false,
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  block?: boolean;
  /** 16px side padding instead of 20 (the navbar button). */
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${BUTTON_BASE} ${compact ? "px-4" : "px-5"} ${BUTTON_VARIANT[variant]} ${block ? "w-full" : ""} ${className}`}
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
