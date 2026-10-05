import type { ReactNode } from "react";

import { CARD, CARD_HOVER, Container, SectionHead } from "@/components/ui/primitives";

import { MockCaption, Mock, MockRow, MockSelect, PayBadge } from "./mocks";
import { Reveal } from "./Reveal";
import { PROPERTY_NAME, RENT, ROOMS } from "./sample-data";

function Step({ n, title, text, mock }: { n: number; title: string; text: string; mock: ReactNode }) {
  return (
    <li className="relative flex flex-col gap-4">
      <span
        aria-hidden="true"
        className="num relative z-1 grid size-8 place-items-center rounded-lg bg-action text-body font-semibold text-on-action"
      >
        {n}
      </span>
      <div className={`flex grow flex-col gap-3 p-6 ${CARD} ${CARD_HOVER}`}>
        <h3 className="text-h2">
          <span className="sr-only">Langkah {n}: </span>
          {title}
        </h3>
        <p className="text-text-secondary">{text}</p>
        <Mock className="mt-auto">
          {mock}
          <MockCaption />
        </Mock>
      </div>
    </li>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <b className="text-label font-semibold">{label}</b>
      <span className="rounded-lg bg-input-bg px-3 py-2 text-label shadow-sm">{value}</span>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="cara-kerja" aria-labelledby="cara-title" className="scroll-mt-16 border-t border-border bg-background py-16 md:py-20 xl:py-24">
      <Reveal>
        <Container>
          <SectionHead
            center
            className="mb-10 md:mb-12"
            eyebrow="Cara Kerja"
            titleId="cara-title"
            title="Empat langkah untuk mulai"
            sub="Dari membuat akun sampai memantau tagihan, alurnya sama untuk semua pemilik."
          />
          <ol className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:before:absolute lg:before:top-4 lg:before:left-4 lg:before:h-px lg:before:bg-border lg:before:content-[''] lg:before:right-[calc((100%_-_72px)/4_-_16px)]">
            <Step
              n={1}
              title="Daftar akun"
              text="Buat akun dengan nama, email, kata sandi, dan nomor WhatsApp."
              mock={
                <>
                  <MockField label="Nama" value="Pemilik Kos" />
                  <MockField label="Alamat Email" value="nama@email.com" />
                  <span className="flex h-8 items-center justify-center rounded-lg bg-action text-label font-semibold text-on-action">
                    Daftar
                  </span>
                </>
              }
            />
            <Step
              n={2}
              title="Siapkan properti dan kamar"
              text="Tambahkan properti, lalu daftarkan kamar dan tarifnya."
              mock={
                <>
                  <MockSelect>{PROPERTY_NAME}</MockSelect>
                  <span className="text-label text-text-secondary">
                    10 kamar · tarif <span className="num">{RENT}</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {ROOMS.map(({ code, status }) => (
                      <span
                        key={code}
                        className={`num rounded-sm border bg-surface px-2 py-1 text-label ${
                          status === "kosong" ? "border-dashed border-text-secondary text-text-secondary" : "border-border"
                        }`}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </>
              }
            />
            <Step
              n={3}
              title="Catat penghuni dan pembayaran"
              text="Isi data penghuni tiap kamar dan catat setiap pembayaran sewa."
              mock={
                <>
                  <MockRow name="Kamar 1A · Rina" sub={<span className="num">{RENT}</span>} badge={<PayBadge status="lunas" />} />
                  <MockRow name="Kamar 2B · Andi" sub={<span className="num">{RENT}</span>} badge={<PayBadge status="tempo3" />} />
                </>
              }
            />
            <Step
              n={4}
              title="Pantau dari dashboard"
              text="Lihat kamar terisi, tagihan, dan pembayaran dalam satu layar."
              mock={
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["Terkumpul", "Rp 6.000.000"],
                      ["Belum dibayar", "Rp 3.600.000"],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex flex-col rounded-lg border border-border bg-surface px-3 py-2">
                      <span className="text-label text-text-secondary">{label}</span>
                      <span className="num text-body leading-5">{value}</span>
                    </div>
                  ))}
                </div>
              }
            />
          </ol>
        </Container>
      </Reveal>
    </section>
  );
}
