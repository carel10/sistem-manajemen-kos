import type { ReactNode } from "react";

import { Lock } from "@/components/icons";

type Tone = "success" | "warning" | "danger" | "neutral" | "locked" | "brand";

// Status badges: pill radius 4px (not full-pill), tinted background + solid text. Warning uses
// warning-text-strong because `warning` on warning-subtle is only 3.23:1 (docs/StyleGuide.md §2).
const TONE: Record<Tone, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning-text-strong",
  danger: "bg-danger-subtle text-danger",
  neutral: "bg-locked-bg text-text-secondary",
  locked: "bg-locked-bg text-text-secondary [&_svg]:text-locked-text",
  brand: "bg-primary-subtle text-primary",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-label whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/** "Pro · Segera hadir" and friends: the locked badge with its small padlock. */
export function ProBadge({ children }: { children: ReactNode }) {
  return (
    <Badge tone="locked">
      <Lock size={12} strokeWidth={2} />
      {children}
    </Badge>
  );
}
