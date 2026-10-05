// Sample data for the product mock-ups on the landing page. It is FICTITIOUS and only ever shown next to the
// caption "Contoh tampilan · data fiktif" (docs/design/03-halaman.md: "Data ini fiktif dan hanya untuk mockup").
// Never use it as real data anywhere else.

export type PayStatus = "lunas" | "tempo3" | "tempo7" | "telat5" | "kosong";

export const PAY_STATUS: Record<
  Exclude<PayStatus, "kosong">,
  { tone: "success" | "warning" | "danger"; label: string }
> = {
  lunas: { tone: "success", label: "Lunas" },
  tempo3: { tone: "warning", label: "Jatuh tempo 3 hari" },
  tempo7: { tone: "warning", label: "Jatuh tempo 7 hari" },
  telat5: { tone: "danger", label: "Terlambat 5 hari" },
};

export const RENT = "Rp 1.200.000";

// 8 occupied rooms, with one payment each: 5 paid (Rp 6.000.000), 3 not yet (Rp 3.600.000).
export const PAYMENT_ROWS = [
  { room: "1A", name: "Rina", due: "1 Okt 2026", status: "lunas" },
  { room: "1B", name: "Budi", due: "3 Okt 2026", status: "lunas" },
  { room: "2A", name: "Dewi", due: "6 Okt 2026", status: "lunas" },
  { room: "2B", name: "Andi", due: "13 Okt 2026", status: "tempo3" },
  { room: "2C", name: "Siti", due: "8 Okt 2026", status: "lunas" },
  { room: "3A", name: "Fajar", due: "5 Okt 2026", status: "telat5" },
  { room: "3B", name: "Maya", due: "17 Okt 2026", status: "tempo7" },
  { room: "3D", name: "Rizky", due: "10 Okt 2026", status: "lunas" },
] as const;

// 10 rooms: 8 occupied, 2 empty (1C and 3C).
export const ROOMS = [
  { code: "1A", name: "Rina", status: "lunas" },
  { code: "1B", name: "Budi", status: "lunas" },
  { code: "1C", name: null, status: "kosong" },
  { code: "2A", name: "Dewi", status: "lunas" },
  { code: "2B", name: "Andi", status: "tempo3" },
  { code: "2C", name: "Siti", status: "lunas" },
  { code: "3A", name: "Fajar", status: "telat5" },
  { code: "3B", name: "Maya", status: "tempo7" },
  { code: "3C", name: null, status: "kosong" },
  { code: "3D", name: "Rizky", status: "lunas" },
] as const;

export const PROPERTY_NAME = "Kos Nusa Bangsa";
