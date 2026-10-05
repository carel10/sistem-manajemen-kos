import { ILUSTRASI, ThemedImage } from "@/components/brand/ThemedImage";
import { CalendarX, FileText, Wrench } from "@/components/icons";
import { Container, IconBox, SectionHead } from "@/components/ui/primitives";

import { Reveal } from "./Reveal";

const PROBLEMS = [
  {
    icon: <FileText />,
    title: "Data tersebar",
    text: "Catatan sewa terpisah di Excel, buku tulis, dan chat WhatsApp, jadi satu angka harus dicari di beberapa tempat.",
  },
  {
    icon: <CalendarX />,
    title: "Tagihan terlewat",
    text: "Tanpa pengingat, jatuh tempo baru terasa setelah penghuni terlambat membayar.",
  },
  {
    icon: <Wrench />,
    title: "Aset tak terpantau",
    text: "AC dan water heater rusak mendadak, lalu muncul biaya yang tidak direncanakan.",
  },
];

export function Problem() {
  const m1 = ILUSTRASI.m1;
  return (
    <section id="masalah" aria-labelledby="masalah-title" className="scroll-mt-16 border-t border-border bg-surface py-16 md:py-20 xl:py-24">
      <Reveal>
        <Container className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-x-6 md:gap-y-8">
          <div className="md:col-[1/7] md:row-[1/3] md:self-center">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg border border-border bg-locked-bg">
              <ThemedImage {...m1} className="h-full w-full object-cover" sizes="(min-width: 768px) 46vw, 100vw" />
            </div>
          </div>
          <SectionHead
            eyebrow="Masalah"
            titleId="masalah-title"
            title="Yang biasanya terjadi saat kos dikelola manual"
            sub="Kalau kamu mengurus kos sendiri, mungkin ini terdengar akrab."
            className="md:col-[7/13] md:row-[1] md:self-end"
          />
          <ul className="flex flex-col gap-6 md:col-[7/13] md:row-[2] md:self-start">
            {PROBLEMS.map(({ icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <IconBox tone="neutral">{icon}</IconBox>
                <div className="flex flex-col gap-1">
                  <h3 className="text-h2">{title}</h3>
                  <p className="text-text-secondary">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Reveal>
    </section>
  );
}
