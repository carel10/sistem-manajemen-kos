// Contact rules for the landing interest form (docs/TASKS.md 0.4, 0.4a). THE single source of the rules:
// the client form (instant feedback), the server action (source of truth) and lib/validators.ts (isEmail/isPhoneID
// for the login/register forms) all call the functions below. Do not write these regexes anywhere else.

export type LeadFormState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      contactError?: string;
      consentError?: string;
      formError?: string;
    };

// Same limit as the leads.contact check constraint (char_length between 5 and 254).
export const MAX_EMAIL_LENGTH = 254;

export const LEAD_MESSAGES = {
  invalidContact: "Masukkan nomor WhatsApp (diawali 08 atau +62) atau alamat email yang valid.",
  emailTooLong: `Alamat email terlalu panjang, maksimal ${MAX_EMAIL_LENGTH} karakter.`,
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

// Lowercase email for storage, or null (wrong shape, or longer than MAX_EMAIL_LENGTH).
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email) ? email : null;
}

// +628... number for storage, or null when it is not an Indonesian mobile number.
export function normalizePhoneID(raw: string): string | null {
  const digits = raw.trim().replace(PHONE_SEPARATORS, "");
  const e164 = digits.startsWith("08")
    ? `+62${digits.slice(1)}`
    : digits.startsWith("628")
      ? `+${digits}`
      : digits;
  return ID_MOBILE_E164.test(e164) ? e164 : null;
}

export const isEmail = (raw: string): boolean => normalizeEmail(raw) !== null;
export const isPhoneID = (raw: string): boolean => normalizePhoneID(raw) !== null;

// Returns the contact normalized for storage (lowercase email or +628... number),
// or null when it is neither a valid email nor an Indonesian mobile number.
export function normalizeContact(raw: string): string | null {
  const input = raw.trim();
  return input.includes("@") ? normalizeEmail(input) : normalizePhoneID(input);
}

export type ContactProblem = "invalid" | "emailTooLong";

// Why a contact is rejected (null = accepted), so the client AND the server can show the same friendly message:
// an over-long email gets its own message instead of the generic "invalid" one.
export function contactProblem(raw: string): ContactProblem | null {
  const input = raw.trim();
  if (input.includes("@") && input.length > MAX_EMAIL_LENGTH) return "emailTooLong";
  return normalizeContact(input) === null ? "invalid" : null;
}

export function contactProblemMessage(problem: ContactProblem): string {
  return problem === "emailTooLong" ? LEAD_MESSAGES.emailTooLong : LEAD_MESSAGES.invalidContact;
}

// Channel tag from the page's ?src= param. Anything the leads.source constraint
// would reject becomes 'direct', so a mistyped link never costs a lead.
export function normalizeSource(raw: FormDataEntryValue | null): string {
  const source = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return SOURCE_PATTERN.test(source) ? source : "direct";
}
