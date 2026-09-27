import type { Metadata } from "next";

const PRODUCT_NAME = "Sistem Manajemen Kos";

// UVP from docs/PRD.md §6, still [HIPOTESIS]; the hero splits it at the dash.
export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description:
    "Kelola kosmu dari mana saja — pembayaran, kamar, dan maintenance terpantau otomatis, tanpa perlu cek satu-satu setiap hari.",
};

export default function LandingPage() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24"
    >
      <p className="text-label text-primary">{PRODUCT_NAME}</p>
      <h1 id="hero-title" className="mt-4 text-display leading-tight text-balance">
        Kelola kosmu dari mana saja
      </h1>
      <p className="mt-4 max-w-xl text-body text-text-secondary">
        Pembayaran, kamar, dan maintenance terpantau otomatis, tanpa perlu cek
        satu-satu setiap hari.
      </p>
    </section>
  );
}
