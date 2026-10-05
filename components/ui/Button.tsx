import type { ButtonHTMLAttributes } from "react";

import { Spinner } from "@/components/icons";

import { BUTTON_BASE, BUTTON_VARIANT, type ButtonVariant } from "./button-styles";

// Disabled = locked colours + not-allowed, and it wins over hover/active. Loading keeps the normal colours, adds the
// spinner and a progress cursor, and the button is disabled as well so it cannot be pressed twice
// (docs/design/02-komponen.md "Button"). Use <ButtonLink> for navigation.
const IDLE =
  "cursor-pointer disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-locked-bg disabled:bg-locked-bg disabled:text-locked-text";
const LOADING = "cursor-progress";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: ButtonVariant;
  /** Full width. */
  block?: boolean;
  /** Shows the spinner and sets aria-busy; pass the in-progress label as the children ("Memproses…"). */
  loading?: boolean;
  className?: string;
};

export function Button({
  variant = "primary",
  block = false,
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BUTTON_BASE} px-5 ${BUTTON_VARIANT[variant]} ${loading ? LOADING : IDLE} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading && <Spinner size={16} strokeWidth={2} className="animate-spin [animation-duration:0.8s]" />}
      {children}
    </button>
  );
}
