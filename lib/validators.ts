// Form validation helpers for the login/register pages (docs/TASKS.md 1.1a). The design package ships its own
// validators (kode/lib/validators.ts); this file deliberately does NOT: the rules live in lib/leads.ts (task 0.4a, owner
// decision 5 Oct 2026), and the package validators disagree with the approved rules on 9 of 44 test inputs.
// isEmail / isPhoneID are re-exported, never rewritten, so there is one regex to maintain.
export { isEmail, isPhoneID } from "./leads";

// UI copy from docs/design/07-copy-deck.md (Masuk and Daftar). The interest-form messages live next to their rules in
// LEAD_MESSAGES (lib/leads.ts). Keys are English, the texts are the approved Indonesian copy.
export const MESSAGES = {
  emailRequired: "Masukkan alamat email.",
  emailFormat: "Format email belum benar, contoh: nama@email.com.",
  passwordRequired: "Masukkan kata sandi.",
  passwordTooShort: "Kata sandi minimal 8 karakter.",
  passwordConfirmRequired: "Ulangi kata sandi.",
  passwordMismatch: "Konfirmasi kata sandi tidak sama.",
  nameRequired: "Masukkan nama kamu.",
  phoneRequired: "Masukkan nomor HP (WhatsApp).",
  phoneFormat: "Gunakan format nomor Indonesia, diawali 08 atau +62.",
  invalidCredentials: "Email atau kata sandi tidak cocok. Periksa lagi, lalu coba masuk kembali.",
} as const;
