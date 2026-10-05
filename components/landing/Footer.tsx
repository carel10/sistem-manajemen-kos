import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Container } from "@/components/ui/primitives";

// No "Kebijakan Privasi" link yet: the page does not exist (docs/TASKS.md 0.3b, waiting for the policy text from the
// project owner), so the link would be a dead end. It joins this list when the page is written.
const LINKS = [
  { href: "#fitur", label: "Fitur" },
  { href: "#harga", label: "Harga" },
  { href: "#faq", label: "FAQ" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface pt-12 pb-8">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex max-w-90 flex-col gap-3">
            <Link href="#beranda" aria-label="manaKos, ke awal halaman" className="inline-flex min-h-11 items-center rounded-sm">
              <Logo height={32} />
            </Link>
            <p className="text-text-secondary">Sistem manajemen kos berbasis web untuk pemilik kos di Indonesia.</p>
          </div>
          <nav aria-label="Tautan footer">
            <ul className="flex flex-wrap gap-x-2">
              {LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-2 text-text-secondary hover:text-text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col-reverse gap-4 border-t border-border pt-6 text-text-secondary md:flex-row md:items-center md:justify-between">
          <p className="text-label">© {new Date().getFullYear()} manaKos</p>
          <ThemeSwitcher variant="full" />
        </div>
      </Container>
    </footer>
  );
}
