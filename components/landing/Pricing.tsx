import { Building, Check, Home, Lock } from "@/components/icons";
import { ProBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CARD, CARD_HOVER, Container, IconBox, SectionHead } from "@/components/ui/primitives";
import { IS_LAUNCHED, ROUTES } from "@/lib/launch";

import { Reveal } from "./Reveal";

// While Pro is not on sale (NEXT_PUBLIC_PRO_AVAILABLE='false', docs/Architecture.md §3a) the price is not shown, in
// BOTH landing modes: the design's launch mode still reads "Diumumkan saat Pro dibuka". The price appears
// only when Pro is actually sold (Fase 2); it is not wired here because nothing can be sold yet.
export function Pricing() {
  return (
    <section id="harga" aria-labelledby="harga-title" className="scroll-mt-16 border-t border-border bg-surface py-16 md:py-20 xl:py-24">
      <Reveal>
        <Container>
          <SectionHead
            center
            className="mb-10 md:mb-12"
            eyebrow="Harga"
            titleId="harga-title"
            title="Mulai gratis, Pro menyusul"
            sub="Fitur dasar gratis. Paket Pro dan batas tiap paket diumumkan sebelum dibuka."
          />
          <div className="mx-auto grid max-w-220 grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-6">
            <article aria-labelledby="paket-free" className={`relative flex flex-col gap-5 p-6 ${CARD} ${CARD_HOVER}`}>
              <div className="flex flex-wrap items-center gap-3">
                <IconBox tone="brand">
                  <Home />
                </IconBox>
                <h3 id="paket-free" className="text-h2">
                  Free
                </h3>
              </div>
              <p className="text-text-secondary">Fitur dasar untuk mencatat dan memantau kos.</p>
              <div className="flex min-h-16 flex-col justify-center gap-1">
                <span className="text-display">Gratis</span>
              </div>
              <ul className="flex grow flex-col gap-3 border-t border-border pt-5">
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-primary" />
                  <span>Dashboard ringkasan</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-primary" />
                  <span>Data penghuni &amp; pembayaran</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-primary" />
                  <span>
                    Kamar &amp; properti <span className="text-text-secondary">(batas diumumkan sebelum peluncuran)</span>
                  </span>
                </li>
              </ul>
              <ButtonLink href={IS_LAUNCHED ? ROUTES.register : "#daftar"} block>
                {IS_LAUNCHED ? "Mulai Gratis" : "Daftar Minat"}
              </ButtonLink>
            </article>

            <article aria-labelledby="paket-pro" className={`relative flex flex-col gap-5 border-2 border-primary p-5.75 ${CARD}`}>
              <div className="flex flex-wrap items-center gap-3">
                <IconBox tone="brand">
                  <Building />
                </IconBox>
                <h3 id="paket-pro" className="text-h2">
                  Pro
                </h3>
                <ProBadge>Segera hadir</ProBadge>
              </div>
              <p className="text-text-secondary">Untuk pemilik yang butuh pencatatan aset dan pengingat terjadwal.</p>
              <div className="flex min-h-16 flex-col justify-center gap-1">
                <span className="text-h2">Diumumkan saat Pro dibuka</span>
              </div>
              <ul className="flex grow flex-col gap-3 border-t border-border pt-5">
                <li className="flex items-start gap-2">
                  <Check size={20} className="text-primary" />
                  <span>Semua fitur Free</span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock size={20} className="text-locked-text" />
                  <span className="flex flex-wrap items-center gap-2 text-text-secondary">
                    Asset &amp; Maintenance Management <ProBadge>Segera hadir</ProBadge>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock size={20} className="text-locked-text" />
                  <span className="flex flex-wrap items-center gap-2 text-text-secondary">
                    Reminder terjadwal sekali sehari <ProBadge>Segera hadir</ProBadge>
                  </span>
                </li>
              </ul>
              <ButtonLink href={IS_LAUNCHED ? ROUTES.registerPro : "#daftar"} variant="secondary" block>
                Kabari Saya
              </ButtonLink>
            </article>
          </div>
          <p className="mt-6 text-center text-label text-text-secondary">
            {IS_LAUNCHED ? "Paket dan batas dapat berubah saat Pro dibuka." : "Paket dan batas dapat berubah sebelum peluncuran."}
          </p>
        </Container>
      </Reveal>
    </section>
  );
}
