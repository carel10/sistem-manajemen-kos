import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { FOTO } from "@/components/brand/ThemedImage";
import { Logo } from "@/components/brand/Logo";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

// Frame of /login and /register (docs/design/03-halaman.md §B and §C): from 1024px a photo on the left (7fr) and the form
// panel on the right (8fr), below that the photo is a strip (280 from 768, 176 under it). The photo is decorative:
// aria-hidden, empty alt, no overlay or text. The panel has the icon theme switcher at the top right; the form column is
// at most 480 wide, 69% of the panel from 1024, and the stacked logo (120, 96 under 768) links to the landing page.
export function AuthShell({
  photo,
  title,
  subtitle,
  footer,
  children,
}: {
  photo: "masuk" | "daftar";
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  const image = FOTO[photo];
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-[7fr_8fr]">
      <aside aria-hidden="true" className="p-4 lg:h-dvh">
        <div className="relative h-44 overflow-hidden rounded-lg border border-border bg-locked-bg md:h-70 lg:h-full">
          <Image
            src={image.src}
            alt=""
            fill
            preload
            sizes="(min-width: 1024px) 47vw, 100vw"
            className="object-cover"
            style={{ objectPosition: image.objectPosition }}
          />
        </div>
      </aside>

      <div className="flex min-h-0 flex-col lg:overflow-y-auto">
        <div className="flex justify-end px-4 pt-4 md:px-6">
          <ThemeSwitcher variant="icon" />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-6">
          <div className="flex w-full max-w-120 flex-col gap-6 lg:w-[69%]">
            <Link href="/" className="inline-flex w-fit rounded-sm" aria-label="manaKos, ke halaman utama">
              <span className="hidden md:inline-flex">
                <Logo variant="stacked" height={120} alt="" />
              </span>
              <span className="inline-flex md:hidden">
                <Logo variant="stacked" height={96} alt="" />
              </span>
            </Link>
            <header className="flex flex-col gap-2">
              <h1 className="text-h1 md:text-display">{title}</h1>
              <p className="text-lead text-text-secondary">{subtitle}</p>
            </header>
            {children}
            <p className="text-body text-text-secondary">{footer}</p>
          </div>
        </main>
      </div>
    </div>
  );
}
