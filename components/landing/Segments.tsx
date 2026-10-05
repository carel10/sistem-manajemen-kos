import Image from "next/image";
import type { ReactNode } from "react";

import { FOTO, ILUSTRASI, ThemedImage } from "@/components/brand/ThemedImage";
import { Check, FileText, Folders, Building, Layout, Receipt, Swap } from "@/components/icons";
import { ProBadge } from "@/components/ui/Badge";
import { TextLink } from "@/components/ui/ButtonLink";
import { Container, IconBox, SectionHead } from "@/components/ui/primitives";
import { IS_LAUNCHED, ROUTES } from "@/lib/launch";

import { Reveal } from "./Reveal";

const CTA_HREF = IS_LAUNCHED ? ROUTES.register : "#daftar";
const CTA_LABEL = IS_LAUNCHED ? "Mulai Gratis" : "Daftar Minat";

function Segment({
  media,
  mediaClass,
  textClass,
  eyebrow,
  title,
  checks,
  eases,
  className = "",
}: {
  media: ReactNode;
  mediaClass: string;
  textClass: string;
  eyebrow: string;
  title: string;
  checks: ReactNode[];
  eases: { icon: ReactNode; label: string }[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-6 ${className}`}>
      <div className={mediaClass}>
        <div className="relative aspect-4/5 w-full overflow-hidden rounded-lg border border-border bg-locked-bg">{media}</div>
      </div>
      <div className={`flex flex-col gap-4 ${textClass}`}>
        <span className="text-label tracking-eyebrow text-primary uppercase">{eyebrow}</span>
        <h3 className="text-h1">{title}</h3>
        <ul className="flex flex-col gap-3">
          {checks.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check size={20} className="text-primary" />
              {item}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-label text-text-secondary">Yang dipermudah</p>
          <ul className="grid grid-cols-3 gap-3">
            {eases.map(({ icon, label }) => (
              <li key={label} className="flex flex-col gap-2 font-medium">
                <IconBox tone="brand" size="md">
                  {icon}
                </IconBox>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <TextLink href={CTA_HREF}>{CTA_LABEL}</TextLink>
      </div>
    </div>
  );
}

export function Segments() {
  const atrium = FOTO.segmenAtrium;
  return (
    <section id="segmen" aria-labelledby="segmen-title" className="scroll-mt-16 border-t border-border bg-background py-16 md:py-20 xl:py-24">
      <Reveal>
        <Container>
          <SectionHead
            center
            className="mb-10 md:mb-12"
            eyebrow="Untuk siapa"
            titleId="segmen-title"
            title="Dirancang untuk cara kamu mengelola kos"
            sub="Satu kos atau beberapa properti, alurnya tetap sederhana."
          />
          <Segment
            mediaClass="md:col-[1/6] md:row-[1]"
            textClass="md:col-[7/13] md:row-[1]"
            media={
              <Image
                src={atrium.src}
                alt={atrium.alt}
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover"
                style={{ objectPosition: atrium.objectPosition }}
              />
            }
            eyebrow="Untuk pemilik satu kos yang sibuk"
            title="Semua catatan kosmu di satu tempat"
            checks={[
              <span key="a">Catat penghuni dan pembayaran di satu tempat</span>,
              <span key="b">Lihat kamar kosong dan tagihan dalam hitungan detik</span>,
              <span key="c">Mulai dari paket gratis</span>,
              <span key="d">Bisa dibuka dari ponsel lewat tampilan web responsif</span>,
            ]}
            eases={[
              { icon: <Layout />, label: "Tak perlu cek satu-satu" },
              { icon: <Receipt />, label: "Tagihan jelas" },
              { icon: <FileText />, label: "Data rapi" },
            ]}
          />
          <Segment
            className="mt-16 md:mt-20"
            mediaClass="md:col-[8/13] md:row-[1]"
            textClass="md:col-[1/7] md:row-[1]"
            media={
              <ThemedImage {...ILUSTRASI.s2} className="h-full w-full object-cover" sizes="(min-width: 768px) 40vw, 100vw" />
            }
            eyebrow="Untuk pemilik beberapa properti"
            title="Banyak properti, satu akun"
            checks={[
              <span key="a">Pindah antarproperti lewat satu pemilih properti</span>,
              <span key="b">Data tiap properti tersimpan terpisah dan rapi</span>,
              <span key="c">Ringkasan kamar dan pembayaran per properti</span>,
              <span key="d" className="flex flex-wrap items-center gap-2">
                Asset &amp; Maintenance Management dan reminder di Pro <ProBadge>Segera hadir</ProBadge>
              </span>,
            ]}
            eases={[
              { icon: <Swap />, label: "Pindah properti cepat" },
              { icon: <Folders />, label: "Data per properti terpisah" },
              { icon: <Building />, label: "Ringkasan per properti" },
            ]}
          />
        </Container>
      </Reveal>
    </section>
  );
}
