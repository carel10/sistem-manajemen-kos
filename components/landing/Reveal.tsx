"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Section content fades and slides in once when it scrolls into view (docs/design/01-design-system.md §6:
 * opacity 0 + translateY(8px) → 1, 200ms, once, threshold 0.1).
 *
 * The hidden state is applied only AFTER mount and only to content that starts below the fold, so the
 * server HTML is fully visible: without JavaScript nothing stays invisible. prefers-reduced-motion never hides.
 */
export function Reveal({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen at load

    el.dataset.rv = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.rv = "shown";
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`data-[rv=hidden]:translate-y-2 data-[rv=hidden]:opacity-0 data-[rv=shown]:transition-[opacity,transform] data-[rv=shown]:duration-200 data-[rv=shown]:ease-out ${className}`}
    >
      {children}
    </div>
  );
}
