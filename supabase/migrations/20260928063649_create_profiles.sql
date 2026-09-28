-- profiles table (docs/TASKS.md 1.1, docs/Architecture.md §3/§4).
--
-- profiles.id IS the tenant identifier for every tenant-owned table in this
-- project (Architecture §3) — there is no separate tenant_id column here,
-- and none should ever be added: it would only create a second source of
-- truth for the same value.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  -- NULL means "no plan chosen yet" — the signal the 1.6 gate redirects on.
  -- It is never defaulted to 'free'.
  subscription_tier text,
  subscription_status text,
  is_admin boolean not null default false
);

-- === Auth trigger: create the profile row at signup (Architecture §3, "jalur
-- ketiga yang sah") ===
--
-- SECURITY DEFINER so it can insert despite the column-level revoke below,
-- but it only ever writes the signup defaults below — it is not a general
-- write path. set search_path = '' so every reference is schema-qualified
-- and cannot be hijacked by an object of the same name in another schema.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- === RLS ===
--
-- SELECT only, own row. No INSERT policy: rows are created exclusively by
-- the trigger above, which runs as the function/table owner and so bypasses
-- RLS the same way the §3a subscription functions do (FORCE ROW LEVEL
-- SECURITY is deliberately not used here, consistent with that pattern).
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Required even though column privilege (below) is what actually blocks the
-- sensitive columns: Postgres RLS defaults to deny for any command with no
-- applicable policy, regardless of other policies on the same table. With
-- only the SELECT policy above, a self-update of full_name matched zero
-- rows (silently, no error) rather than succeeding — confirmed by testing,
-- not assumed. This policy restores "update your own row" at the row
-- level; column privilege still stops authenticated from writing anything
-- but full_name, so it does not reopen subscription_tier/is_admin/id.
create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- === Column-level privilege (Architecture §3, "Wajib") ===
--
-- Row-level policies control which rows are visible, not which columns of
-- an allowed row may be written — a normal "update your own row" UPDATE
-- policy would let a user set subscription_tier/is_admin on their own row
-- via a raw API call. Table privileges close that gap: authenticated may
-- read every column but write only full_name. subscription_tier,
-- subscription_status, is_admin and id stay unwritable by authenticated
-- entirely; they change only via this trigger or the SECURITY DEFINER
-- functions built in later tasks (§3a).
revoke all on table public.profiles from authenticated, anon;

grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
