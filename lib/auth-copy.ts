// Texts of the login and register pages that the project owner approved word for word (docs/TASKS.md 1.1a, "Copy yang
// disetujui pemilik": Q1-Q8 of 10 Oct 2026, Q12 of 12 Oct 2026, Q16 of 13 Oct 2026). The field messages live in
// lib/validators.ts; the register failure text is LEAD_MESSAGES.submitFailed (lib/leads.ts), reused on purpose.
// tests/e2e/db/auth-flow.e2e.db.test.mjs spells every one of these out again, so a change here fails that test.
export const AUTH_COPY = {
  /** Q1: sign-up answered without a session (email confirmation is on). Neutral: it does not say whether the account is new. */
  checkEmail: "Cek emailmu untuk melanjutkan pendaftaran.",
  /** Q2, Masuk: network failure, rate limit or a server error. Never used for wrong credentials. */
  loginUnavailable: "Belum bisa masuk saat ini. Coba lagi sebentar lagi.",
  /** Q3: the email is already registered; shown under the email field. */
  emailTaken: "Email ini sudah terdaftar. Masuk saja, atau pakai email lain.",
  /** Q6a: the consent sentence of /register (no link until the privacy page exists, docs/TASKS.md 0.3b). */
  consent: "Saya setuju data akun ini disimpan dan dipakai untuk menjalankan akun manaKos saya.",
  /** Q16: shown on /login?terdaftar=1 after a successful sign-up. */
  registered: "Akun berhasil dibuat. Silakan masuk dengan email dan kata sandi yang baru kamu daftarkan.",
} as const;
