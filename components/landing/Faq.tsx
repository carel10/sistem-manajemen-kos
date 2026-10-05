"use client";

import { useState } from "react";

import { ThemedImage, ILUSTRASI } from "@/components/brand/ThemedImage";
import { Minus, Plus } from "@/components/icons";
import { Container, SectionHead } from "@/components/ui/primitives";
import { IS_LAUNCHED } from "@/lib/launch";

import { Reveal } from "./Reveal";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "Apa itu manaKos?",
    a: "manaKos adalah sistem manajemen kos berbasis web untuk pemilik kos. Kamu bisa mencatat pembayaran sewa, mengatur kamar dan penghuni, lalu melihat ringkasannya di satu dashboard.",
  },
  { q: "Apakah manaKos gratis?", a: "Ya, fitur dasar manaKos gratis. Paket Pro dengan fitur tambahan menyusul." },
  {
    q: "Apakah data kos saya terpisah dari pengguna lain?",
    a: "Ya. Data setiap pemilik kos terisolasi di level database, sehingga pemilik lain tidak dapat melihat atau mengubah data kosmu.",
  },
  {
    q: "Bagaimana cara membayar paket Pro?",
    a: "Pro belum dijual. Saat dibuka, pembayaran lewat QRIS dan unggah bukti, lalu diverifikasi manual.",
  },
  {
    q: "Apakah pengingat dikirim seketika?",
    a: "Tidak. Pengingat dikirim terjadwal, sekali sehari, ke email pemilik. Fitur ini bagian dari paket Pro dan masih dalam pengembangan.",
  },
  {
    q: "Apakah ada aplikasi mobile?",
    a: "Belum. manaKos berupa aplikasi web dengan tampilan responsif, jadi bisa dibuka lewat browser di ponsel tanpa instalasi.",
  },
  IS_LAUNCHED
    ? { q: "Bagaimana cara mulai memakai manaKos?", a: "Klik Mulai Gratis, buat akun, lalu tambahkan properti pertamamu dari dashboard." }
    : {
        q: "Kapan manaKos tersedia?",
        a: "manaKos sedang dalam pengembangan. Isi form Daftar Minat di bawah, dan kami akan mengabari kamu saat manaKos dibuka.",
      },
];

export function Faq() {
  // Only one item is open at a time; the first one starts open. Clicking the open item closes it.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 border-t border-border bg-background py-16 md:py-20 xl:py-24">
      <Reveal>
        <Container className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-x-6 md:gap-y-8">
          <div className="md:col-[1/6] md:row-[1/3] md:self-start">
            <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg border border-border bg-locked-bg">
              <ThemedImage {...ILUSTRASI.f1} className="h-full w-full object-cover" sizes="(min-width: 768px) 40vw, 100vw" />
            </div>
          </div>
          <SectionHead eyebrow="FAQ" titleId="faq-title" title="Pertanyaan yang sering diajukan" className="md:col-[7/13] md:row-[1]" />
          <div className="flex flex-col gap-3 md:col-[7/13] md:row-[2]">
            {ITEMS.map(({ q, a }, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={q}
                  className={`rounded-lg border bg-surface transition-[border-color] duration-150 ease-out ${isOpen ? "border-text-secondary" : "border-border"}`}
                >
                  <h3>
                    <button
                      type="button"
                      id={`faq-q${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-a${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-lg py-3 pr-3 pl-5 text-left text-h2 text-text-primary md:pl-6"
                    >
                      <span>{q}</span>
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg transition-[background-color,color] duration-200 ease-out ${
                          isOpen ? "bg-action text-on-action" : "bg-primary-subtle text-primary"
                        }`}
                      >
                        {isOpen ? <Minus size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={2} />}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-a${i}`}
                    role="region"
                    aria-labelledby={`faq-q${i}`}
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    {/* visibility keeps the closed answer out of the tab order and the accessibility tree */}
                    <div className={`min-h-0 overflow-hidden transition-[visibility] duration-200 ${isOpen ? "visible" : "invisible"}`}>
                      <p className="px-5 pb-5 text-text-secondary md:px-6 md:pb-6">{a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </Reveal>
    </section>
  );
}
