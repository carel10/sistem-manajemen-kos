import type { Metadata } from "next";

import { CtaBand } from "@/components/landing/CtaBand";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { Problem } from "@/components/landing/Problem";
import { Segments } from "@/components/landing/Segments";

// UVP from docs/PRD.md §6 (still [HIPOTESIS] as a market claim, though the copy itself is final).
// The title comes from the root layout ("manaKos · Sistem manajemen kos").
export const metadata: Metadata = {
  description:
    "Kelola kosmu dari mana saja — pembayaran, kamar, dan maintenance terpantau otomatis, tanpa perlu cek satu-satu setiap hari.",
};

// Order of the ten sections (docs/StyleGuide.md §7); Navbar and Footer live in the (marketing) layout.
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Segments />
      <Pricing />
      <Faq />
      <CtaBand />
    </>
  );
}
