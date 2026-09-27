// Rules for the landing page lead form (docs/TASKS.md 0.4). Shared by the client
// form (instant feedback) and the server action, which is the source of truth.

export type LeadFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      contactError?: string;
      consentError?: string;
      formError?: string;
    };

export const LEAD_MESSAGES = {
  invalidContact:
    "Masukkan nomor WhatsApp (contoh 0812-3456-7890) atau alamat email yang valid.",
  consentRequired: "Centang persetujuan dulu supaya kami boleh menyimpan kontakmu.",
  submitFailed: "Maaf, pendaftaran belum berhasil. Coba lagi sebentar lagi.",
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_SEPARATORS = /[\s.()-]/g;
// Indonesian mobile number in E.164: +62 8 followed by 8-11 digits
// (a local 08... number of 10-13 digits).
const ID_MOBILE_E164 = /^\+628\d{8,11}$/;
// Same rule as the leads.source check constraint.
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

// Returns the contact normalized for storage (lowercase email or +628... number),
// or null when it is neither a valid email nor an Indonesian mobile number.
export function normalizeContact(raw: string): string | null {
  const input = raw.trim();

  if (input.includes("@")) {
    const email = input.toLowerCase();
    return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
  }

  const digits = input.replace(PHONE_SEPARATORS, "");
  const e164 = digits.startsWith("08")
    ? `+62${digits.slice(1)}`
    : digits.startsWith("628")
      ? `+${digits}`
      : digits;
  return ID_MOBILE_E164.test(e164) ? e164 : null;
}

// Channel tag from the page's ?src= param. Anything the leads.source constraint
// would reject becomes 'direct', so a mistyped link never costs a lead.
export function normalizeSource(raw: FormDataEntryValue | null): string {
  const source = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return SOURCE_PATTERN.test(source) ? source : "direct";
}
