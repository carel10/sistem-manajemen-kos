-- 1.1d: profiles.phone, filled by the signup trigger from the user's metadata (docs/TASKS.md 1.1d; owner decision Q10 of 12 Okt 2026).
-- Deliberately a migration of its own, separate from 1.1c (owner decision of 5 Okt 2026), so each trigger change is verified alone.
--
-- Q10: signUp is called from the browser (docs/Architecture.md 2a), so raw_user_meta_data is attacker-controlled. The phone is accepted
-- only when it passes the SAME rule as lib/leads.ts normalizePhoneID (separators removed, 08... or 628... turned into +628..., then
-- ^\+628[0-9]{8,11}$); anything else becomes NULL. The trigger never raises. The rule is duplicated in SQL on purpose and kept equal to
-- the TypeScript one by a parity test (a corpus run through both, see docs/TASKS.md 1.1d).
--
-- profiles.phone gets NO "grant update (phone)" for authenticated: the 1.1 column privileges stay as they are, so only the trigger
-- writes it. If users must be able to change their number, that is a separate decision and a separate migration.

alter table public.profiles add column phone text;

comment on column public.profiles.phone is
  'Indonesian mobile number in E.164 (+628...), NULL when not given or not valid. Written only by the signup trigger (no UPDATE grant for authenticated).';

-- JavaScript's \s (and so lib/leads.ts) strips: \t \n \v \f \r space, U+00A0, U+1680, U+2000-U+200A, U+2028, U+2029, U+202F, U+205F,
-- U+3000, U+FEFF. The same set is spelled out here, plus the separators . ( ) -.
create function public.normalize_phone_id(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when t.e164 ~ '^\+628[0-9]{8,11}$' then t.e164 end
  from (
    select case
      when s.d like '08%' then '+62' || substr(s.d, 2)
      when s.d like '628%' then '+' || s.d
      else s.d
    end as e164
    from (
      select regexp_replace(raw, '[\t\n\u000b\f\r    -     　﻿.()-]', '', 'g') as d
    ) s
  ) t
$$;

-- An internal helper: not part of the API surface (the trigger runs as the function owner, which keeps EXECUTE).
revoke execute on function public.normalize_phone_id(text) from public, anon, authenticated;

-- SECURITY DEFINER and set search_path = '' restated (CREATE OR REPLACE drops what is not restated); verified through
-- pg_proc.prosecdef and pg_proc.proconfig after this migration, as after 1.1c.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone, subscription_tier, subscription_status)
  values (
    new.id,
    new.email,
    -- trim (the characters JavaScript's trim() removes), keep at most 100 characters, empty becomes NULL (Q10, from 1.1c)
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name', E' \t\n\u000b\f\r                 　﻿'), 100), ''),
    public.normalize_phone_id(new.raw_user_meta_data ->> 'phone'),
    'free',
    'active'
  );
  return new;
end;
$$;
