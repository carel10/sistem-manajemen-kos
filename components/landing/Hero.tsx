import Image from "next/image";

import { FOTO } from "@/components/brand/ThemedImage";
import { Check } from "@/components/icons";
import { Badge, ProBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CARD, Container } from "@/components/ui/primitives";
import { IS_LAUNCHED, ROUTES } from "@/lib/launch";

import { MiniDashboard, MockCaption } from "./mocks";
import { RENT } from "./sample-data";

export function Hero() {
  const photo = FOTO.heroEksterior;
  return (
    <section
      id="beranda"
      aria-labelledby="hero-title"
      className="scroll-mt-16 bg-background pt-12 pb-16 md:pt-16 md:pb-20 xl:pt-20 xl:pb-24"
    >
      <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-6">
        <div className="flex max-w-160 flex-col items-start gap-4 lg:col-span-6">
          <Badge tone="brand">{IS_LAUNCHED ? "Sistem Manajemen Kos" : "Sistem Manajemen Kos · Segera hadir"}</Badge>
          <h1 id="hero-title" className="text-display lg:text-hero">
            Kelola kosmu <mark className="rounded-sm bg-action px-2 text-on-action box-decoration-clone">dari mana saja</mark>
          </h1>
          <p className="text-lead text-text-secondary">
            {IS_LAUNCHED
              ? "Pembayaran, kamar, dan penghuni tercatat rapi di satu dashboard, tanpa perlu cek satu-satu setiap hari."
              : "Pembayaran, kamar, dan maintenance terpantau otomatis, tanpa perlu cek satu-satu setiap hari."}
          </p>
          <div className="mt-2 flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <ButtonLink href={IS_LAUNCHED ? ROUTES.register : "#daftar"}>
              {IS_LAUNCHED ? "Mulai Gratis" : "Daftar Minat"}
            </ButtonLink>
            <ButtonLink href="#fitur" variant="secondary">
              Lihat Fitur
            </ButtonLink>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            <li className="flex flex-wrap items-center gap-2">
              <Check size={20} className="text-primary" />
              <span>Pembayaran tercatat rapi</span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <Check size={20} className="text-primary" />
              <span>Status kamar dalam satu layar</span>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <Check size={20} className="text-primary" />
              <span>Reminder terjadwal</span>
              <ProBadge>Pro · Segera hadir</ProBadge>
            </li>
          </ul>
        </div>

        <figure className="relative lg:col-span-6 lg:pb-28" aria-label="Contoh tampilan dashboard manaKos dengan data fiktif">
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg border border-border bg-locked-bg lg:aspect-5/4">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              preload
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="object-cover"
              style={{ objectPosition: photo.objectPosition }}
            />
          </div>
          <div aria-hidden="true">
            <div className={`absolute top-3 left-3 z-3 flex w-47 flex-col gap-1 p-3 md:top-4 md:left-4 md:w-52 ${CARD}`}>
              <Badge tone="warning">Jatuh tempo 3 hari</Badge>
              <span className="text-label font-semibold">Kamar 2B · Andi</span>
              <span className="num text-label text-text-secondary">{RENT}</span>
              <MockCaption />
            </div>
          </div>
          <div aria-hidden="true">
            <div
              className={`relative z-2 mx-3 -mt-12 overflow-hidden md:mx-12 md:-mt-16 lg:absolute lg:top-42 lg:-right-6 lg:m-0 lg:w-114 ${CARD}`}
            >
              <MiniDashboard />
            </div>
          </div>
        </figure>
      </Container>
    </section>
  );
}
