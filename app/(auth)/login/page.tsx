import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { AUTH_COPY } from "@/lib/auth-copy";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { terdaftar } = await searchParams;
  // `terdaftar=1` is set by the register page after a successful sign-up (owner decision Q16). It switches on one static
  // sentence and carries nothing about the account: no email, no id. Any other value shows nothing.
  const justRegistered = terdaftar === "1";
  return (
    <AuthShell
      photo="masuk"
      title="Masuk ke manaKos"
      subtitle="Selamat datang kembali. Kelola kosmu dari satu tempat."
      footer={
        <>
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline underline-offset-3 transition-[color] duration-150 ease-out hover:text-primary-hover"
          >
            Daftar Sekarang
          </Link>
        </>
      }
    >
      {justRegistered && (
        <Alert tone="success" role="status">
          {AUTH_COPY.registered}
        </Alert>
      )}
      <LoginForm />
    </AuthShell>
  );
}
