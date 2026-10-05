// Product mock-ups for the landing page. All of them are decorative (aria-hidden) and show fictitious data
// (sample-data.ts) next to the caption "Contoh tampilan · data fiktif".
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { ChevronDown, Door, Gear, Home, Lock, Menu, Card as CardIcon, Toolbox, Users } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";

import { PAY_STATUS, PROPERTY_NAME, RENT, type PayStatus } from "./sample-data";

export function MockCaption() {
  return <p className="text-label text-text-secondary">Contoh tampilan · data fiktif</p>;
}

/** The grey box that holds a mock inside a card. */
export function Mock({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-2 rounded-lg border border-border bg-background p-3 ${className}`}>
      {children}
    </div>
  );
}

export function PayBadge({ status }: { status: Exclude<PayStatus, "kosong"> }) {
  const { tone, label } = PAY_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Compact two-line row: name + subline on the left, a badge on the right. */
export function MockRow({ name, sub, badge }: { name: string; sub: ReactNode; badge: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-label font-semibold">{name}</span>
        <span className="text-label text-text-secondary">{sub}</span>
      </div>
      {badge}
    </div>
  );
}

export function MockSelect({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 flex h-7 items-center justify-between gap-1 rounded-lg border border-border bg-surface px-2 text-label shadow-sm">
      {children}
      <ChevronDown size={12} strokeWidth={2} />
    </span>
  );
}

function SideItem({ icon, on = false, locked = false, children }: { icon: ReactNode; on?: boolean; locked?: boolean; children: string }) {
  return (
    <span
      className={`flex h-7 items-center gap-2 rounded-lg px-2 text-label font-semibold ${
        on ? "bg-action text-on-action" : locked ? "text-text-secondary [&_svg]:text-locked-text" : "text-text-primary"
      }`}
    >
      {icon}
      {children}
      {locked && <Lock size={12} strokeWidth={2} className="ml-auto" />}
    </span>
  );
}

/** Replica of the app shell: top bar below 768px, sidebar from 768px up. Used in the hero. */
export function MiniDashboard() {
  const tiles: [string, string][] = [
    ["Kamar terisi", "8 dari 10"],
    ["Kamar kosong", "2"],
    ["Terkumpul", "Rp 6.000.000"],
    ["Belum dibayar", "Rp 3.600.000"],
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-[152px_minmax(0,1fr)]">
      <div className="flex h-11 items-center justify-between gap-2 border-b border-border bg-surface px-3 md:hidden">
        <Menu size={20} />
        <Logo height={16} />
        <span className="grid size-6 place-items-center rounded-full bg-primary-subtle text-label leading-none font-semibold text-primary">
          PK
        </span>
      </div>
      <div className="hidden flex-col gap-1 border-r border-border bg-surface px-2 py-3 md:flex">
        <div className="mx-1 mt-1 mb-2">
          <Logo height={16} />
        </div>
        <MockSelect>{PROPERTY_NAME}</MockSelect>
        <SideItem on icon={<Home size={16} />}>Dashboard</SideItem>
        <SideItem icon={<Door size={16} />}>Kamar</SideItem>
        <SideItem icon={<Users size={16} />}>Penghuni</SideItem>
        <SideItem icon={<CardIcon size={16} />}>Pembayaran</SideItem>
        <SideItem locked icon={<Toolbox size={16} />}>Pemeliharaan</SideItem>
        <SideItem icon={<Gear size={16} />}>Pengaturan</SideItem>
      </div>
      <div className="flex min-w-0 flex-col gap-2 bg-background p-3">
        <div>
          <p className="text-body leading-5 font-semibold">Dashboard</p>
          <p className="text-label text-text-secondary">{PROPERTY_NAME} · Oktober 2026</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map(([label, value]) => (
            <div key={label} className="flex flex-col rounded-lg border border-border bg-surface px-3 py-2">
              <span className="text-label text-text-secondary">{label}</span>
              <span className="num text-body leading-5">{value}</span>
            </div>
          ))}
        </div>
        <MockRow name="Kamar 2B · Andi" sub={<span className="num">{RENT}</span>} badge={<PayBadge status="tempo3" />} />
        <MockRow name="Kamar 3A · Fajar" sub={<span className="num">{RENT}</span>} badge={<PayBadge status="telat5" />} />
        <MockRow name="Kamar 3B · Maya" sub={<span className="num">{RENT}</span>} badge={<PayBadge status="tempo7" />} />
        <MockCaption />
      </div>
    </div>
  );
}
