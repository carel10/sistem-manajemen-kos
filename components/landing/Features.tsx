import type { ReactNode } from "react";

import { Badge, ProBadge } from "@/components/ui/Badge";
import { Bell, CalendarX, ChevronRight, Door, Mail, Toolbox, Wrench, Card as CardIcon } from "@/components/icons";
import { CARD, CARD_HOVER, Container, IconBox, SectionHead } from "@/components/ui/primitives";

import { Mock, MockCaption, MockRow, PayBadge } from "./mocks";
import { Reveal } from "./Reveal";
import { PAY_STATUS, PAYMENT_ROWS, PROPERTY_NAME, RENT, ROOMS } from "./sample-data";

function BentoCard({
  className,
  icon,
  title,
  pro = false,
  text,
  children,
}: {
  className: string;
  icon: ReactNode;
  title: string;
  pro?: boolean;
  text: string;
  children: ReactNode;
}) {
  return (
    <article className={`flex flex-col gap-4 p-6 ${CARD} ${CARD_HOVER} ${className}`}>
      <div className="flex items-start gap-4">
        <IconBox tone={pro ? "locked" : "brand"}>{icon}</IconBox>
        <div className="flex min-w-0 flex-col gap-2">
          {pro ? (
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-h2">{title}</h3>
              <ProBadge>Pro · Segera hadir</ProBadge>
            </div>
          ) : (
            <h3 className="text-h2">{title}</h3>
          )}
          <p className="text-text-secondary">{text}</p>
        </div>
      </div>
      <Mock className="grow">{children}</Mock>
    </article>
  );
}

const SWATCH = {
  lunas: "bg-success-subtle",
  tempo: "bg-warning-subtle",
  telat: "bg-danger-subtle",
  kosong: "border border-dashed border-text-secondary bg-surface",
} as const;

const CELL = {
  lunas: "bg-success-subtle text-success",
  tempo3: "bg-warning-subtle text-warning-text-strong",
  tempo7: "bg-warning-subtle text-warning-text-strong",
  telat5: "bg-danger-subtle text-danger",
  kosong: "border border-dashed border-text-secondary bg-surface text-text-secondary",
} as const;

/** Payments mock: a table when its own box is wide enough (≥520px), a list of cards below that. */
function PaymentsMock() {
  return (
    <>
      <div className="flex items-center justify-between text-label text-text-secondary">
        <span>{PROPERTY_NAME} · Oktober 2026</span>
        <span>
          Total <span className="num">Rp 9.600.000</span>
        </span>
      </div>
      <div className="@container/dt">
        <table className="hidden w-full border-collapse bg-surface @min-[520px]/dt:table">
          <thead>
            <tr>
              {["Kamar", "Penghuni", "Jatuh tempo", "Nominal", "Status"].map((head) => (
                <th
                  key={head}
                  scope="col"
                  className={`border-b border-border px-3 py-2 text-label font-medium whitespace-nowrap text-text-secondary ${head === "Nominal" ? "text-right" : "text-left"}`}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAYMENT_ROWS.map(({ room, name, due, status }) => (
              <tr key={room} className="[&:last-child>td]:border-b-0">
                <td className="num border-b border-border p-3 text-body whitespace-nowrap">{room}</td>
                <td className="border-b border-border p-3 text-body whitespace-nowrap">{name}</td>
                <td className="num border-b border-border p-3 text-body whitespace-nowrap">{due}</td>
                <td className="num border-b border-border p-3 text-right text-body whitespace-nowrap">{RENT}</td>
                <td className="border-b border-border p-3 text-body whitespace-nowrap">
                  <PayBadge status={status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="flex flex-col gap-2 @min-[520px]/dt:hidden">
          {PAYMENT_ROWS.map(({ room, name, due, status }) => (
            <li key={room} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold">
                  Kamar {room} · {name}
                </span>
                <span className="text-label text-text-secondary">
                  <span className="num">{RENT}</span> · tempo <span className="num">{due}</span>
                </span>
              </div>
              <PayBadge status={status} />
            </li>
          ))}
        </ul>
      </div>
      <MockCaption />
    </>
  );
}

function RoomsMock() {
  return (
    <>
      <div className="flex items-center justify-between text-label text-text-secondary">
        <span>{PROPERTY_NAME}</span>
        <span className="num">8 terisi · 2 kosong</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
        {ROOMS.map(({ code, name, status }) => (
          <div key={code} className={`flex min-h-16 flex-col justify-center rounded-lg px-3 py-2 text-label ${CELL[status]}`}>
            <b className="text-label-form tabular-nums">{name ? `${code} · ${name}` : code}</b>
            <span>{status === "kosong" ? "Kosong" : PAY_STATUS[status].label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-label text-text-secondary">
        {(
          [
            ["lunas", "Lunas"],
            ["tempo", "Jatuh tempo"],
            ["telat", "Terlambat"],
            ["kosong", "Kosong"],
          ] as const
        ).map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-2">
            <i className={`inline-block size-3 rounded-sm ${SWATCH[key]}`} />
            {label}
          </span>
        ))}
      </div>
      <MockCaption />
    </>
  );
}

function AssetsMock() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1 text-label">
        <Badge tone="success">Baru</Badge>
        <ChevronRight size={16} className="text-text-secondary" />
        <Badge tone="success">Aktif</Badge>
        <ChevronRight size={16} className="text-text-secondary" />
        <Badge tone="warning">Perlu dicek</Badge>
        <ChevronRight size={16} className="text-text-secondary" />
        <Badge tone="danger">Perlu servis</Badge>
        <ChevronRight size={16} className="text-text-secondary" />
        <Badge tone="neutral">Diganti</Badge>
      </div>
      <MockRow name="AC · Kamar 1A" sub="Rina" badge={<Badge tone="danger">Perlu servis</Badge>} />
      <MockRow name="Water heater · Kamar 2C" sub="Siti" badge={<Badge tone="warning">Perlu dicek</Badge>} />
      <MockRow name="Kasur · Kamar 3D" sub="Rizky" badge={<Badge tone="success">Aktif</Badge>} />
      <MockCaption />
    </>
  );
}

function Notif({ tone, icon, title, sub }: { tone: "warn" | "danger"; icon: ReactNode; title: string; sub: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg ${
          tone === "warn" ? "bg-warning-subtle text-warning-text-strong" : "bg-danger-subtle text-danger"
        }`}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-label font-semibold">{title}</span>
        <span className="text-label text-text-secondary">{sub}</span>
      </div>
    </div>
  );
}

function ReminderMock() {
  return (
    <>
      <Notif
        tone="warn"
        icon={<CalendarX size={20} />}
        title="Tagihan Kamar 2B jatuh tempo 3 hari lagi"
        sub={
          <>
            Andi · <span className="num">{RENT}</span>
          </>
        }
      />
      <Notif tone="danger" icon={<Wrench size={20} />} title="AC Kamar 1A perlu servis" sub="Status aset: Perlu servis" />
      <p className="flex items-center gap-2 text-label text-text-secondary">
        <Mail size={16} />
        <span>Dikirim terjadwal, sekali sehari, ke email pemilik</span>
      </p>
      <MockCaption />
    </>
  );
}

export function Features() {
  return (
    <section id="fitur" aria-labelledby="fitur-title" className="scroll-mt-16 border-t border-border bg-surface py-16 md:py-20 xl:py-24">
      <Reveal>
        <Container>
          <SectionHead
            center
            className="mb-10 md:mb-12"
            eyebrow="Fitur"
            titleId="fitur-title"
            title="Yang bisa kamu kelola di manaKos"
            sub="Pembayaran dan kamar menjadi inti. Modul aset dan pengingat sedang disiapkan untuk paket Pro."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <BentoCard
              className="md:col-span-7"
              icon={<CardIcon />}
              title="Pembayaran & Tagihan"
              text="Catat pembayaran sewa tiap penghuni dan lihat siapa yang sudah lunas, akan jatuh tempo, atau terlambat."
            >
              <PaymentsMock />
            </BentoCard>
            <BentoCard
              className="md:col-span-5"
              icon={<Door />}
              title="Kamar & Penghuni"
              text="Lihat kamar terisi dan kosong dalam satu layar, lengkap dengan penghuni dan status bayarnya."
            >
              <RoomsMock />
            </BentoCard>
            <BentoCard
              className="md:col-span-6"
              pro
              icon={<Toolbox />}
              title="Asset & Maintenance Management"
              text="Direncanakan untuk Pro: catat aset tiap kamar dan ikuti statusnya, dari baru sampai perlu diganti."
            >
              <AssetsMock />
            </BentoCard>
            <BentoCard
              className="md:col-span-6"
              pro
              icon={<Bell />}
              title="Reminder terjadwal"
              text="Direncanakan untuk Pro: pengingat tagihan dan maintenance yang dikirim terjadwal."
            >
              <ReminderMock />
            </BentoCard>
          </div>
        </Container>
      </Reveal>
    </section>
  );
}
