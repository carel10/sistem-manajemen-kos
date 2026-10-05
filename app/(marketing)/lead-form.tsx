"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { CheckCircle } from "@/components/icons";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TextField } from "@/components/ui/TextField";
import { contactProblem, contactProblemMessage, type LeadFormState } from "@/lib/leads";

import { submitLead } from "./actions";

const initialState: LeadFormState = { status: "idle" };

// UU PDP consent. Owner decision 5 Oct 2026 (option A): the approved sentence with only the product name changed,
// NOT the design package's wording. Keep it in step with docs/TASKS.md 0.4a if it ever changes.
const CONSENT_TEXT = "Saya setuju kontak ini disimpan dan dipakai untuk menghubungi saya seputar manaKos.";

type LeadAction = (previous: LeadFormState, formData: FormData) => Promise<LeadFormState>;

/**
 * Interest form of the pre-launch band (docs/design/03-halaman.md §A.9, copy: 07-copy-deck.md). The rules and the
 * messages come from lib/leads.ts, the same module the server action validates with. `action` is injectable so the
 * states can be exercised without a database; the page always uses the real server action.
 *
 * The design's "Baca Kebijakan Privasi" link is NOT here: /kebijakan-privasi does not exist yet (docs/TASKS.md 0.3b,
 * waiting for the policy text), so the link would be dead.
 */
export function LeadForm({ action = submitLead }: { action?: LeadAction }) {
  // Double-submit guard. `pending` is still false inside the task that dispatched, so two submit events in ONE task
  // (form.requestSubmit() twice) would both get through a `pending` check, and React's action queue would then run both,
  // one after the other, and send two requests (docs/TASKS.md 0.4a, round-6 probes). This ref is checked and set
  // synchronously in handleSubmit and released when the action settles, whatever the outcome.
  const inFlight = useRef(false);
  const guardedAction = useCallback<LeadAction>(
    async (previous, formData) => {
      try {
        return await action(previous, formData);
      } finally {
        inFlight.current = false;
      }
    },
    [action],
  );
  const [state, dispatch, pending] = useActionState(guardedAction, initialState);
  // Both fields are controlled AND the form is submitted through a transition instead of <form action={...}>: with
  // the `action` prop React 19 calls form.reset() when the action finishes, which unticked the consent checkbox
  // (while this state still said "ticked") after every server error. Found by testing the failure path in 0.4a.
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [clientError, setClientError] = useState<string | undefined>(undefined);
  // The server response the visitor has already reacted to (typing or ticking hides its messages until a new one arrives).
  const [dismissed, setDismissed] = useState<LeadFormState | null>(null);

  if (state.status === "success") return <Success />;

  const serverError = state.status === "error" && dismissed !== state ? state : undefined;
  const contactError = clientError ?? serverError?.contactError;
  // The button stays disabled until consent is ticked, so a consent error can only come from a request that skipped
  // this form; it is shown with the other form-level errors.
  const alertMessage = serverError?.formError ?? serverError?.consentError;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!consent) return;
    const problem = contactProblem(contact);
    if (problem) {
      setClientError(contactProblemMessage(problem));
      (form.elements.namedItem("contact") as HTMLInputElement).focus();
      return;
    }
    setClientError(undefined);
    // A second submit while one is in flight carries this very form: drop it. Set only after the client validation
    // passed, so a rejected submit never locks the form.
    if (inFlight.current) return;
    inFlight.current = true;
    const formData = new FormData(form);
    // The channel tag from ?src= travels with the request, so the page itself stays static.
    formData.set("src", new URLSearchParams(window.location.search).get("src") ?? "");
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Form Daftar Minat" className="flex flex-col gap-4">
      <h3 className="text-h2">Daftar Minat</h3>

      <TextField
        id="contact"
        name="contact"
        type="text"
        label="Nomor WhatsApp atau email"
        help="Contoh: 081234567890 atau nama@email.com"
        error={contactError}
        required
        autoCapitalize="none"
        spellCheck={false}
        value={contact}
        onChange={(event) => {
          setContact(event.target.value);
          setClientError(undefined);
          setDismissed(state);
        }}
      />

      <Checkbox
        id="consent"
        name="consent"
        required
        checked={consent}
        onChange={(event) => {
          setConsent(event.target.checked);
          setDismissed(state);
        }}
      >
        {CONSENT_TEXT}
      </Checkbox>

      {/* Honeypot: hidden from sight, keyboard and screen readers. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="hp_note">Kosongkan field ini</label>
        <input id="hp_note" name="hp_note" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {alertMessage && (
        <Alert tone="danger" role="alert">
          {alertMessage}
        </Alert>
      )}

      <Button
        type="submit"
        block
        disabled={!consent}
        loading={pending}
        aria-describedby={consent ? undefined : "submit-help"}
      >
        {pending ? "Mengirim…" : "Daftar Minat"}
      </Button>
      {!consent && (
        <p id="submit-help" className="text-label text-text-secondary">
          Centang persetujuan di atas untuk mengaktifkan tombol.
        </p>
      )}
    </form>
  );
}

function Success() {
  const panel = useRef<HTMLDivElement>(null);
  // The form (and the button that had focus) is gone: put focus on the confirmation instead of dropping it on <body>.
  useEffect(() => panel.current?.focus(), []);
  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className="flex flex-col items-start gap-3 py-2 focus:outline-none"
    >
      <span className="grid size-12 place-items-center rounded-lg bg-success-subtle text-success">
        <CheckCircle size={24} />
      </span>
      <h3 className="text-h2">Terima kasih, kami akan menghubungi kamu</h3>
      <p className="text-text-secondary">Kabar peluncuran akan dikirim ke kontak yang kamu daftarkan.</p>
    </div>
  );
}
