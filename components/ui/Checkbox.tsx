import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Native checkbox, 20×20, accent-color primary, wrapped in its label so the whole row is the target (min-height 44)
 * — docs/design/02-komponen.md "Checkbox". The label content may hold a link (primary, 600, underlined).
 */
export function Checkbox({
  id,
  className = "",
  children,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "className"> & {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-start gap-3 py-0.5 text-body leading-5 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="m-0 size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
        {...input}
      />
      <span>{children}</span>
    </label>
  );
}
