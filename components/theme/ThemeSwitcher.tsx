"use client";

/**
 * ThemeSwitcher (Terang / Sistem / Gelap)
 * - role="group" with a label + 3 <button aria-pressed>. 44×44 px touch targets.
 * - variant="full": icon + label, for the dashboard sidebar, the landing footer and the mobile menu.
 * - variant="icon": icon only + aria-label + title, for the top right of Masuk/Daftar.
 * Styles come from .theme-sw / .ts-btn in the design package's prototype.css, rewritten as Tailwind utilities.
 */
import { useEffect, useId, useSyncExternalStore } from "react";

import { Monitor, Moon, Sun } from "@/components/icons";
import { applyTheme, readThemePref, subscribeThemePref, type ThemePref } from "@/lib/theme-script";

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Terang", Icon: Sun },
  { value: "system", label: "Sistem", Icon: Monitor },
  { value: "dark", label: "Gelap", Icon: Moon },
];

export function ThemeSwitcher({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "icon";
  className?: string;
}) {
  const labelId = useId();
  // null on the server and during hydration: the server cannot know the visitor's choice, so no
  // button is marked yet. After hydration React reads the real choice from <html data-theme-pref>.
  const pref = useSyncExternalStore<ThemePref | null>(subscribeThemePref, readThemePref, () => null);

  // While on "Sistem", follow the device theme without a reload.
  useEffect(() => {
    if (pref !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system", { persist: false });
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [pref]);

  const isIcon = variant === "icon";

  const group = (
    <div
      role="group"
      {...(isIcon ? { "aria-label": "Tema tampilan" } : { "aria-labelledby": labelId })}
      className={`gap-0.5 rounded-lg border border-border bg-input-bg p-0.5 ${isIcon ? "inline-flex items-center" : "flex w-full items-center"}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={pref === value}
          onClick={() => applyTheme(value)}
          {...(isIcon ? { "aria-label": `Tema ${label.toLowerCase()}`, title: `Tema ${label.toLowerCase()}` } : {})}
          // The corner radius is the group's (lg) minus its 2px padding, so the corners stay concentric.
          className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--radius-lg)-2px)] border border-transparent bg-transparent text-label text-text-secondary transition-[color,background-color,border-color] duration-150 ease-out hover:text-text-primary aria-pressed:border-text-secondary aria-pressed:bg-surface aria-pressed:font-semibold aria-pressed:text-text-primary aria-pressed:shadow-sm aria-pressed:[&_svg]:text-primary ${isIcon ? "w-11 flex-none p-0" : "flex-1 px-2.5"}`}
        >
          <Icon size={isIcon ? 18 : 16} />
          {!isIcon && <span>{label}</span>}
        </button>
      ))}
    </div>
  );

  if (isIcon) return <div className={className}>{group}</div>;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span id={labelId} className="text-label text-text-secondary">
        Tema tampilan
      </span>
      {group}
    </div>
  );
}
