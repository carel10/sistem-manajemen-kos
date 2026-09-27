"use server";

import { createClient } from "@supabase/supabase-js";

import {
  LEAD_MESSAGES,
  normalizeContact,
  normalizeSource,
  type LeadFormState,
} from "@/lib/leads";

export async function submitLead(
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  // Honeypot: people never see this field, so a filled one means a bot.
  // Answer like a success and store nothing.
  if (formData.get("hp_note")) {
    return { status: "success" };
  }

  // Re-validated here even though the form checks first: consent (UU PDP) and
  // the contact format must hold for requests that skip the client entirely.
  const contact = normalizeContact(String(formData.get("contact") ?? ""));
  const consented = formData.get("consent") === "on";
  if (!contact || !consented) {
    return {
      status: "error",
      contactError: contact ? undefined : LEAD_MESSAGES.invalidContact,
      consentError: consented ? undefined : LEAD_MESSAGES.consentRequired,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error(
      "submitLead: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set",
    );
    return { status: "error", formError: LEAD_MESSAGES.submitFailed };
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  // No .select(): anon may only INSERT (contact, source). consented_at and
  // created_at are set by the database (supabase/migrations/…_create_leads.sql).
  const { error } = await supabase
    .from("leads")
    .insert({ contact, source: normalizeSource(formData.get("src")) });

  if (error) {
    console.error("submitLead: insert into leads failed", error.code);
    return { status: "error", formError: LEAD_MESSAGES.submitFailed };
  }
  return { status: "success" };
}
