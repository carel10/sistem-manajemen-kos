import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* First focusable element of the page (docs/design/05-aksesibilitas.md): hidden until focused. */}
      <a
        href="#konten"
        className="absolute -top-30 left-4 z-200 rounded-lg border border-border bg-surface px-4 py-3 font-semibold focus:top-2"
      >
        Lewati ke konten
      </a>
      <Navbar />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
