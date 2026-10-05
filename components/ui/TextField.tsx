import type { InputHTMLAttributes, ReactNode } from "react";

import { Alert } from "@/components/icons";

// Text input with its label, help and error (docs/design/02-komponen.md "TextField"; docs/StyleGuide.md §5).
// Height 44, font 16px. Hover border = text-secondary in BOTH themes (decision A3, 5 Oct 2026): the prototype's
// `border` on hover fades the now-visible border (3.83:1 -> 1.27:1). Focus ring comes from the global
// :focus-visible rule; an invalid field turns it red. Transitions are scoped (StyleGuide §5, "Aturan transisi").
const INPUT =
  "block h-11 w-full rounded-lg border border-input-border bg-input-bg px-3 text-lead text-text-primary shadow-sm transition-[border-color,background-color] duration-150 ease-out hover:border-text-secondary focus-visible:border-border focus-visible:bg-surface aria-invalid:border-danger aria-invalid:bg-surface aria-invalid:hover:border-danger aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:outline-danger disabled:cursor-not-allowed disabled:bg-locked-bg disabled:text-locked-text disabled:shadow-none";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "aria-invalid" | "aria-describedby"> & {
  id: string;
  label: string;
  help?: ReactNode;
  /** The error message; its presence marks the field invalid. */
  error?: string;
  className?: string;
};

export function TextField({ id, label, help, error, className = "", ...input }: Props) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-label-form text-text-primary">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
        className={INPUT}
        {...input}
      />
      {help && (
        <p id={helpId} className="text-label text-text-secondary">
          {help}
        </p>
      )}
      {/* The live region is always in the DOM, so the message is announced when it appears. */}
      <div aria-live="polite">
        {error && (
          <p id={errorId} className="flex items-start gap-2 text-label text-danger">
            <Alert size={16} strokeWidth={2} className="shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
