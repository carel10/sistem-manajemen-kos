"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Logo } from "@/components/brand/Logo";
import { ChevronRight, Menu, X } from "@/components/icons";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/primitives";
import { IS_LAUNCHED, ROUTES } from "@/lib/launch";

const LINKS = [
  { id: "fitur", label: "Fitur" },
  { id: "cara-kerja", label: "Cara Kerja" },
  { id: "harga", label: "Harga" },
  { id: "faq", label: "FAQ" },
] as const;

const BAND_ID = IS_LAUNCHED ? "mulai" : "daftar";

// Page order of the sections, mapped to the nav link they belong to ("" = no link). The scroll-spy
// highlights the link of the LAST section whose top has passed the navbar.
const SPY: readonly (readonly [section: string, link: string])[] = [
  ["masalah", ""],
  ["cara-kerja", "cara-kerja"],
  ["fitur", "fitur"],
  ["segmen", ""],
  ["harga", "harga"],
  ["faq", "faq"],
  [BAND_ID, ""],
];
const SPY_OFFSET = 96; // navbar 64 + some air

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}
const getScrolled = () => window.scrollY > 8;
const getActive = () => {
  let active = "";
  for (const [section, link] of SPY) {
    const el = document.getElementById(section);
    if (el && el.getBoundingClientRect().top <= SPY_OFFSET) active = link;
  }
  return active;
};

export function Navbar() {
  const scrolled = useSyncExternalStore(subscribeScroll, getScrolled, () => false);
  const active = useSyncExternalStore(subscribeScroll, getActive, () => "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Open mobile menu: Escape closes it and returns focus to the button, the page behind does not scroll,
  // and growing past the desktop breakpoint (where the menu does not exist) closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onBreakpoint);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onBreakpoint);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-40 h-16 border-b border-border bg-surface transition-shadow duration-150 ease-out ${scrolled ? "shadow-sm" : ""}`}
    >
      <Container className="flex h-full items-center justify-between gap-4">
        <Link href="#beranda" aria-label="manaKos, ke awal halaman" className="inline-flex min-h-11 items-center rounded-sm">
          <Logo height={32} />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden gap-1 lg:flex">
          {LINKS.map(({ id, label }) => (
            <Link
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 font-medium transition-[color] duration-150 ease-out hover:text-text-primary ${
                active === id
                  ? "text-text-primary after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:bg-primary after:content-['']"
                  : "text-text-secondary"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {IS_LAUNCHED && (
            <Link
              href={ROUTES.login}
              className="hidden min-h-11 items-center rounded-sm px-1 font-semibold text-primary hover:text-primary-hover hover:underline hover:underline-offset-3 lg:inline-flex"
            >
              Masuk
            </Link>
          )}
          <ButtonLink href={IS_LAUNCHED ? ROUTES.register : "#daftar"} compact>
            {IS_LAUNCHED ? "Mulai Gratis" : "Daftar Minat"}
          </ButtonLink>
          <button
            ref={menuButton}
            type="button"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            aria-controls="menu-penuh"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-grid size-11 cursor-pointer place-items-center rounded-lg border border-border bg-surface p-0 text-text-primary lg:hidden"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </Container>

      <div
        id="menu-penuh"
        hidden={!menuOpen}
        className="fixed inset-x-0 top-16 bottom-0 z-39 flex flex-col overflow-auto bg-surface px-4 pt-4 pb-8 lg:hidden"
      >
        <nav aria-label="Menu utama">
          {[...LINKS, ...(IS_LAUNCHED ? [{ id: "", label: "Masuk" }] : [])].map(({ id, label }) => (
            <Link
              key={label}
              href={id ? `#${id}` : ROUTES.login}
              onClick={() => setMenuOpen(false)}
              aria-current={id && active === id ? "true" : undefined}
              className={`flex min-h-14 items-center justify-between border-b border-border text-h2 ${
                id && active === id ? "text-primary" : ""
              }`}
            >
              {label}
              <ChevronRight size={20} />
            </Link>
          ))}
        </nav>
        <div className="pt-6">
          <ThemeSwitcher variant="full" />
        </div>
      </div>
    </header>
  );
}
