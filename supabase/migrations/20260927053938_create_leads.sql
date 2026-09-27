-- Landing page "daftar minat" leads (TASKS.md 0.2, Architecture.md §4).
-- Not tenant-owned, but RLS stays on: the anon key is public, so without it
-- anyone could read every submitted contact through the REST API.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  contact text not null
    check (char_length(contact) between 5 and 254 and contact = btrim(contact)),
  -- Channel tag from the landing page's ?src= param, e.g. 'fbgroup-jogja'
  source text not null default 'direct'
    check (source ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  -- UU PDP consent audit trail. Always set by the database, never by the
  -- client; the form's checkbox is validated server-side before inserting.
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Insert-only through the API: no SELECT, UPDATE or DELETE for visitors or
-- signed-in users, and only contact/source are writable so ids and
-- timestamps stay database-generated. Leads are read in Supabase Studio.
revoke all on table public.leads from anon, authenticated;
grant insert (contact, source) on table public.leads to anon, authenticated;

create policy "leads_insert_only" on public.leads
  for insert
  to anon, authenticated
  with check (true);
