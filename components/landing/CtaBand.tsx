import Link from "next/link";

import { LeadForm } from "@/app/(marketing)/lead-form";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { IS_LAUNCHED, ROUTES } from "@/lib/launch";

import { Reveal } from "./Reveal";

/** Closing band. Pre-launch (default): the "Daftar Minat" form. Launch mode: a call to sign up. */
export function CtaBand() {
  if (IS_LAUNCHED) {
    return (
      <section id="mulai" aria-labelledby="mulai-title" className="band scroll-mt-16 bg-band py-16 text-on-band md:py-20 xl:py-24">
        <Reveal>
          <Container>
            <div className="mx-auto flex max-w-180 flex-col items-center gap-3 text-center">
              <h2 id="mulai-title" className="text-h1 md:text-display">
                Mulai kelola kosmu <span className="text-action">hari ini</span>
              </h2>
              <p className="text-lead text-on-band-muted">
                Buat akun gratis, lalu catat kamar, penghuni, dan pembayaran dari satu dashboard.
              </p>
              <div className="mt-2 flex w-full flex-col items-center gap-3 md:w-auto md:flex-row md:justify-center">
                <ButtonLink href={ROUTES.register} className="w-full md:w-auto">
                  Mulai Gratis
                </ButtonLink>
                <Link
                  href={ROUTES.login}
                  className="inline-flex min-h-11 items-center px-2 font-semibold text-on-band underline underline-offset-3"
                >
                  Sudah punya akun? Masuk
                </Link>
              </div>
            </div>
          </Container>
        </Reveal>
      </section>
    );
  }

  return (
    <section id="daftar" aria-labelledby="daftar-title" className="band scroll-mt-16 bg-band py-16 text-on-band md:py-20 xl:py-24">
      <Reveal>
        <Container className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-6">
          <div className="flex max-w-160 flex-col gap-3 md:col-[1/7]">
            <span className="text-label tracking-eyebrow uppercase">Daftar Minat</span>
            <h2 id="daftar-title" className="text-h1 md:text-display">
              Jadi yang pertama tahu saat manaKos <span className="text-action">dibuka</span>
            </h2>
            <p className="text-lead text-on-band-muted">
              manaKos masih dalam pengembangan. Tinggalkan nomor WhatsApp atau email, dan kami kabari saat sudah bisa dipakai.
            </p>
          </div>
          {/* A light card inside the dark band, so the existing form (task 0.4) stays readable. The form itself is
              restyled in 0.4a; until then its own outer margin and max width are neutralised here. */}
          <div
            data-band-card
            className="rounded-lg bg-surface p-6 text-text-primary shadow-sm md:col-[7/13] lg:col-[8/13] [&>*]:mt-0 [&>*]:max-w-none"
          >
            <LeadForm />
          </div>
        </Container>
      </Reveal>
    </section>
  );
}
