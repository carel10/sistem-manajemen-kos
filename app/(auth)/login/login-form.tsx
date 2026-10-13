"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { AUTH_COPY } from "@/lib/auth-copy";
import { getBrowserClient } from "@/lib/supabase/browser";
import { isEmail, MESSAGES } from "@/lib/validators";

type Errors = { email?: string; password?: string };

/**
 * Masuk (docs/design/03-halaman.md §B). The sign-in is called from the browser (docs/Architecture.md §2a). Every failure
 * path ends with the form still there and the typed values kept:
 *  - GoTrue says the credentials do not match (`invalid_credentials`, the same code for an unknown email and a wrong
 *    password, so the visitor learns nothing about which): the one approved message;
 *  - anything else (network failure, 429, 5xx, a library or fetch exception): the "cannot sign in right now" text.
 * Typing in any field clears that field's error and the form-level alert.
 */
export function LoginForm() {
  const router = useRouter();
  // Double-submit guard, checked and set synchronously (the same reason as app/(marketing)/lead-form.tsx).
  const inFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Errors = {};
    const address = email.trim();
    if (!address) found.email = MESSAGES.emailRequired;
    else if (!isEmail(address)) found.email = MESSAGES.emailFormat;
    if (!password) found.password = MESSAGES.passwordRequired;
    setErrors(found);
    setFormError(undefined);
    const first = found.email ? "email" : found.password ? "password" : null;
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    let leaving = false;
    try {
      const { error } = await getBrowserClient().auth.signInWithPassword({ email: address, password });
      if (error) {
        setFormError(error.code === "invalid_credentials" ? MESSAGES.invalidCredentials : AUTH_COPY.loginUnavailable);
        return;
      }
      leaving = true;
      router.replace("/dashboard");
    } catch {
      // The request itself threw. Nothing about the attempt is logged: a message could carry the email.
      setFormError(AUTH_COPY.loginUnavailable);
    } finally {
      // On success the button stays busy until the navigation unmounts the form, so a second click cannot start another sign-in.
      if (!leaving) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  const clear = (field: keyof Errors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Form Masuk" className="flex flex-col gap-4">
      {formError && (
        <Alert tone="danger" role="alert">
          {formError}
        </Alert>
      )}
      <TextField
        id="email"
        name="email"
        type="email"
        label="Alamat Email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.email}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          clear("email");
        }}
      />
      <PasswordField
        id="password"
        name="password"
        label="Kata Sandi"
        autoComplete="current-password"
        error={errors.password}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          clear("password");
        }}
      />
      <Button type="submit" block loading={pending}>
        {pending ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}
