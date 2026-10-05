import type { ReactNode } from "react";

import { Alert as AlertIcon, CheckCircle } from "@/components/icons";

// Inline alert (docs/design/02-komponen.md "Alert inline"): padding 12/16, radius 8, icon 20.
// Pass role="alert" for errors that must be announced at once, role="status" for success.
const TONE = {
  danger: "border-danger bg-danger-subtle text-danger",
  success: "border-success bg-success-subtle text-success",
  info: "border-primary bg-primary-subtle text-primary",
} as const;

export function Alert({
  tone,
  role,
  className = "",
  children,
}: {
  tone: keyof typeof TONE;
  role?: "alert" | "status";
  className?: string;
  children: ReactNode;
}) {
  const Icon = tone === "success" ? CheckCircle : AlertIcon;
  return (
    <div role={role} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-body ${TONE[tone]} ${className}`}>
      <Icon size={20} className="shrink-0" />
      <div>{children}</div>
    </div>
  );
}
