"use client";

import { useActionState, useState, type FormEvent } from "react";

import { LEAD_MESSAGES, normalizeContact, type LeadFormState } from "@/lib/leads";

import { submitLead } from "./actions";

const initialState: LeadFormState = { status: "idle" };

type FieldErrors = { contact?: string; consent?: string };

export function LeadForm() {
  const [state, formAction, pending] = useActionState(submitLead, initialState);
  // Controlled on purpose: React resets uncontrolled fields after every action,
  // which would wipe what the visitor typed when the server rejects it.
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="mt-8 max-w-md rounded-lg border border-border bg-surface p-4 text-body shadow-card"
      >
        Terima kasih! Kami akan menghubungimu lewat kontak ini saat Sistem Manajemen
        Kos siap dicoba.
      </p>
    );
  }

  const serverErrors = state.status === "error" ? state : undefined;
  const contactError = clientErrors ? clientErrors.contact : serverErrors?.contactError;
  const consentError = clientErrors ? clientErrors.consent : serverErrors?.consentError;
  const formError = clientErrors ? undefined : serverErrors?.formError;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const errors: FieldErrors = {
      contact: normalizeContact(contact) ? undefined : LEAD_MESSAGES.invalidContact,
      consent: consent ? undefined : LEAD_MESSAGES.consentRequired,
    };
    if (errors.contact || errors.consent) {
      event.preventDefault();
      setClientErrors(errors);
      const firstInvalid = form.elements.namedItem(errors.contact ? "contact" : "consent");
      (firstInvalid as HTMLInputElement).focus();
      return;
    }
    setClientErrors(null);
    // The channel tag travels with the form, so the page itself stays static.
    const source = form.elements.namedItem("src") as HTMLInputElement;
    source.value = new URLSearchParams(window.location.search).get("src") ?? "";
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="lead-form-intro"
      className="mt-8 max-w-md"
    >
      <p id="lead-form-intro" className="text-body">
        Sedang kami siapkan. Tinggalkan kontakmu, kami kabari saat sudah bisa dicoba.
      </p>

      <div className="mt-4">
        <label htmlFor="contact" className="text-label text-text-secondary">
          Nomor WhatsApp atau email
        </label>
        <input
          id="contact"
          name="contact"
          type="text"
          required
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          aria-invalid={contactError ? true : undefined}
          aria-describedby={contactError ? "contact-help contact-error" : "contact-help"}
          className="mt-1 block w-full rounded-sm border border-border bg-surface px-3 py-2 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle aria-invalid:border-danger"
        />
        <p id="contact-help" className="mt-1 text-label text-text-secondary">
          Contoh: 0812-3456-7890 atau nama@email.com
        </p>
        {contactError && (
          <p id="contact-error" className="mt-1 text-label text-danger">
            {contactError}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          aria-invalid={consentError ? true : undefined}
          aria-describedby={consentError ? "consent-error" : undefined}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <label htmlFor="consent" className="text-body">
          Saya setuju kontak ini disimpan dan dipakai untuk menghubungi saya seputar
          Sistem Manajemen Kos.
        </label>
      </div>
      {consentError && (
        <p id="consent-error" className="mt-1 text-label text-danger">
          {consentError}
        </p>
      )}

      {/* Honeypot: hidden from sight, keyboard and screen readers. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="hp_note">Kosongkan field ini</label>
        <input id="hp_note" name="hp_note" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="src" />

      {formError && (
        <p role="alert" className="mt-4 text-label text-danger">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-lg bg-primary px-6 py-3 text-body font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {pending ? "Mengirim…" : "Daftar minat"}
      </button>
    </form>
  );
}
