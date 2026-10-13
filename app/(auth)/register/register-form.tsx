"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextField } from "@/components/ui/TextField";
import { AUTH_COPY } from "@/lib/auth-copy";
import { LEAD_MESSAGES } from "@/lib/leads";
import { getBrowserClient } from "@/lib/supabase/browser";
import { isEmail, isPhoneID, MESSAGES } from "@/lib/validators";

type Field = "name" | "email" | "password" | "password-confirm" | "phone";
type Errors = Partial<Record<Field, string>>;
type Values = { name: string; email: string; password: string; confirm: string; phone: string };

const ORDER: Field[] = ["name", "email", "password", "password-confirm", "phone"];
const MIN_PASSWORD = 8; // the UI rule (docs/design/07-copy-deck.md); the enforcing limit is the Supabase configuration (docs/Architecture.md §2a)
const NAME_MAX = 100; // owner decision Q11, the same cut the signup trigger applies (docs/TASKS.md 1.1c)

function validate(values: Values): Errors {
  const found: Errors = {};
  if (!values.name.trim()) found.name = MESSAGES.nameRequired;
  const email = values.email.trim();
  if (!email) found.email = MESSAGES.emailRequired;
  else if (!isEmail(email)) found.email = MESSAGES.emailFormat;
  if (values.password.length < MIN_PASSWORD) found.password = MESSAGES.passwordTooShort;
  if (!values.confirm) found["password-confirm"] = MESSAGES.passwordConfirmRequired;
  else if (values.confirm !== values.password) found["password-confirm"] = MESSAGES.passwordMismatch;
  const phone = values.phone.trim();
  if (!phone) found.phone = MESSAGES.phoneRequired;
  else if (!isPhoneID(phone)) found.phone = MESSAGES.phoneFormat;
  return found;
}

/**
 * Daftar (docs/design/03-halaman.md §C). The sign-up is called from the browser (docs/Architecture.md §2a).
 *
 * After a successful sign-up WITH a session the page signs the new account out, waits for that to finish, and goes to
 * /login?terdaftar=1, where a static notice tells the owner to sign in (owner decision Q16, replacing the old success panel
 * with a "Buka Dashboard" button). The only other outcome of a successful sign-up is the answer WITHOUT a session (email
 * confirmation on): the one-sentence panel of Q1. If the sign-out itself fails the page does not move: the alert is shown
 * and the guard lets go.
 */
export function RegisterForm() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", confirm: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (checkEmail) return <CheckEmail />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return;
    const found = validate(values);
    setErrors(found);
    setFormError(undefined);
    const first = ORDER.find((field) => found[field]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    let leaving = false;
    try {
      const supabase = getBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: { data: { full_name: values.name.trim(), phone: values.phone.trim() } },
      });
      if (error) {
        if (error.code === "user_already_exists") setErrors({ email: AUTH_COPY.emailTaken });
        else setFormError(LEAD_MESSAGES.submitFailed);
        return;
      }
      if (!data.session) {
        setCheckEmail(true);
        return;
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setFormError(LEAD_MESSAGES.submitFailed);
        return;
      }
      leaving = true;
      router.replace("/login?terdaftar=1");
    } catch {
      // Thrown, not returned: nothing about the attempt is logged (a message could carry the email or the number).
      setFormError(LEAD_MESSAGES.submitFailed);
    } finally {
      if (!leaving) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  function change(field: Field, key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Form Daftar" className="flex flex-col gap-4">
      {formError && (
        <Alert tone="danger" role="alert">
          {formError}
        </Alert>
      )}
      <TextField
        id="name"
        name="name"
        type="text"
        label="Nama"
        autoComplete="name"
        maxLength={NAME_MAX}
        error={errors.name}
        value={values.name}
        onChange={(event) => change("name", "name", event.target.value)}
      />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Alamat Email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.email}
        value={values.email}
        onChange={(event) => change("email", "email", event.target.value)}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Kata Sandi"
        help="Minimal 8 karakter"
        autoComplete="new-password"
        error={errors.password}
        value={values.password}
        onChange={(event) => change("password", "password", event.target.value)}
      />
      <TextField
        id="password-confirm"
        name="password-confirm"
        type="password"
        label="Konfirmasi Kata Sandi"
        autoComplete="new-password"
        error={errors["password-confirm"]}
        value={values.confirm}
        onChange={(event) => change("password-confirm", "confirm", event.target.value)}
      />
      <TextField
        id="phone"
        name="phone"
        type="tel"
        label="Nomor HP (WhatsApp)"
        help="Contoh: 08123456789; dipakai hanya untuk pemberitahuan terkait akunmu"
        autoComplete="tel"
        error={errors.phone}
        value={values.phone}
        onChange={(event) => change("phone", "phone", event.target.value)}
      />
      <Checkbox
        id="consent"
        name="consent"
        checked={consent}
        onChange={(event) => {
          setConsent(event.target.checked);
          setFormError(undefined);
        }}
      >
        {AUTH_COPY.consent}
      </Checkbox>
      <Button type="submit" block disabled={!consent} loading={pending} aria-describedby={consent ? undefined : "submit-help"}>
        {pending ? "Membuat akun…" : "Daftar"}
      </Button>
      {!consent && (
        <p id="submit-help" className="text-label text-text-secondary">
          Centang persetujuan untuk mengaktifkan tombol Daftar.
        </p>
      )}
    </form>
  );
}

/** Q1: the sign-up was accepted but there is no session yet. Replaces the form; focus moves to it, the form is gone. */
function CheckEmail() {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => panel.current?.focus(), []);
  return (
    <div ref={panel} tabIndex={-1} className="focus:outline-none">
      <Alert tone="info" role="status">
        {AUTH_COPY.checkEmail}
      </Alert>
    </div>
  );
}
