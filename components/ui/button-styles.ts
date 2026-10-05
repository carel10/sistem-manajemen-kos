// Class strings shared by <ButtonLink> (navigation) and <Button> (actions), so the button look has ONE source
// (docs/design/02-komponen.md "Button", docs/StyleGuide.md §5). Primary: lime with ink text, never white on lime.
// Transitions are scoped on purpose (docs/StyleGuide.md §5, "Aturan transisi").
export const BUTTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border text-body leading-none font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-150 ease-out";

export const BUTTON_VARIANT = {
  primary: "border-action bg-action text-on-action hover:border-action-hover hover:bg-action-hover active:translate-y-px",
  secondary:
    "border-text-primary bg-surface text-text-primary hover:bg-background active:translate-y-px active:bg-locked-bg",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT;
