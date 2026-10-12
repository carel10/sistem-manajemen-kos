-- 1.1c: the signup trigger sets the Free tier, the subscription columns can no longer be NULL, and the user-controlled full_name is
-- filtered (docs/TASKS.md 1.1c; owner decisions of 5 Okt 2026 and Q10 of 12 Okt 2026; docs/Architecture.md sections 3a and 2a).
--
-- Migration 20260928063649 (task 1.1) stays exactly as applied: its trigger inserted only (id, email, full_name) and left
-- subscription_tier / subscription_status NULL ("no plan chosen yet", the signal the old 1.6 gate redirected on). Since the revision of
-- 4-5 Okt 2026 every owner starts on the Free tier at signup, so the trigger sets it and the columns can no longer be NULL.
--
-- The column-level privileges of 1.1 (revoke all, grant select, grant update (full_name) to authenticated) are NOT touched here.

-- (3) Backfill rows written by the old trigger. This must run BEFORE the NOT NULL constraints below.
update public.profiles set subscription_tier = 'free' where subscription_tier is null;
update public.profiles set subscription_status = 'active' where subscription_status is null;

-- (2) Default + NOT NULL + CHECK.
alter table public.profiles
  alter column subscription_tier set default 'free',
  alter column subscription_tier set not null,
  alter column subscription_status set default 'active',
  alter column subscription_status set not null;

alter table public.profiles
  add constraint profiles_subscription_tier_check
    check (subscription_tier in ('free', 'pro')),
  add constraint profiles_subscription_status_check
    check (subscription_status in ('active', 'pending_verification'));

comment on column public.profiles.subscription_tier is
  'free | pro. Never NULL since 1.1c: the signup trigger sets free (the 1.1 comment "NULL = no plan chosen yet" is obsolete).';
comment on column public.profiles.subscription_status is
  'active | pending_verification. Never NULL since 1.1c: the signup trigger sets active.';

-- (1) handle_new_user: SECURITY DEFINER and set search_path = '' are written out again, because CREATE OR REPLACE drops any attribute
-- that is not restated (verified through pg_proc.prosecdef and pg_proc.proconfig, not assumed).
--
-- Owner decision Q10: signUp is called from the browser (docs/Architecture.md 2a), so raw_user_meta_data is attacker-controlled. The
-- trigger filters it and NEVER raises: a hostile value must not make the signup fail, it is only cut down.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, subscription_tier, subscription_status)
  values (
    new.id,
    new.email,
    -- trim (the characters JavaScript's trim() removes), keep at most 100 characters, empty becomes NULL
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name', E' \t\n\u000b\f\r                 　﻿'), 100), ''),
    'free',
    'active'
  );
  return new;
end;
$$;
