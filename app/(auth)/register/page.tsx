import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Buat akun" };

// `?minat=pro` (the pricing CTA of the launched landing page) is deliberately ignored in 1.1a (owner decision Q12): the page
// does not read the search params at all, so the same form is served whatever the query says.
export default function RegisterPage() {
  return (
    <AuthShell
      photo="daftar"
      title="Buat akun manaKos"
      subtitle="Mulai kelola kosmu. Gratis, tanpa kartu kredit."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline underline-offset-3 transition-[color] duration-150 ease-out hover:text-primary-hover"
          >
            Masuk
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
