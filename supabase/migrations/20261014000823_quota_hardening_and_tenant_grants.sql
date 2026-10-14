-- 1.10b and 1.10c: hardening of the Free-tier quota triggers and of the tenant-table grants (docs/TASKS.md 1.10b and 1.10c; owner
-- decision of 14 Okt 2026, round 17; docs/Architecture.md section 3). Migration 20261013124757 stays exactly as applied.
--
-- 1.10b. The advisory-lock key of the two quota triggers is derived from auth.uid() instead of the row's tenant_id.
--   Before: a request of tenant A that carried tenant_id = B took B's lock first and was rejected by RLS only afterwards, so it waited
--   for B's own inserts (measured 14 Okt 2026: SQLSTATE 55P03 after 1.8 to 2.0 s under a 1.5 s lock_timeout) and could stall them.
--   After: every authenticated request locks ITS OWN key. A legitimate writer has auth.uid() = tenant_id (tenant_isolation enforces
--   it), so the serialisation per tenant is unchanged; a cross-tenant request is rejected by RLS (42501) without waiting.
--   postgres and service_role have no auth.uid(), so their key stays new.tenant_id.
--   Assumption (docs/Architecture.md section 3): tenant_id = auth.uid() for every authenticated writer (one account, one tenant).
--   If a multi-user tenant is ever added, the key must come from the same tenant-resolution function as the policies.
--   CREATE OR REPLACE keeps the owner, the ACL and the three triggers; search_path and SECURITY INVOKER are written out again.
create or replace function public.enforce_properties_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('manakos.quota:' || coalesce(auth.uid(), new.tenant_id)::text, 0));
  if public.quota_exceeded('properties', new.tenant_id) then
    raise exception using
      errcode = 'MK001',
      message = 'quota_exceeded: properties',
      detail = 'resource=properties',
      hint = 'upgrade_to_pro';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_rooms_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('manakos.quota:' || coalesce(auth.uid(), new.tenant_id)::text, 0));
  if public.quota_exceeded(
       'rooms_per_property',
       new.tenant_id,
       new.property_id,
       case when tg_op = 'UPDATE' then new.id end
     ) then
    raise exception using
      errcode = 'MK002',
      message = 'quota_exceeded: rooms_per_property',
      detail = 'resource=rooms_per_property',
      hint = 'upgrade_to_pro';
  end if;
  return new;
end;
$$;

-- 1.10c. Grants of the tenant tables. RLS covers SELECT, INSERT, UPDATE and DELETE only; TRUNCATE, REFERENCES and TRIGGER are not
-- subject to it, and the default ACL of this project (pg_default_acl, read 14 Okt 2026) gives anon, authenticated and service_role ALL
-- on every new table of schema public. The tenant tables therefore get explicit REVOKEs:
--   anon           nothing at all on properties, rooms, profiles (the only allowlisted anon privilege is leads INSERT, untouched here);
--   authenticated  no TRUNCATE, REFERENCES or TRIGGER; SELECT, INSERT, UPDATE, DELETE (and the column grants of profiles) stay.
-- REVOKE ALL on a table also removes column-level privileges, which anon does not hold on these tables anyway.
-- ALTER DEFAULT PRIVILEGES is NOT changed (owner decision): the permanent grant-audit test is the guard for future tables.
-- Not changed either: MAINTAIN (PostgreSQL 17) held by authenticated; it is outside the decided list and is reported as a finding.
revoke all on table public.properties from anon;
revoke all on table public.rooms from anon;
revoke all on table public.profiles from anon;

revoke truncate, references, trigger on table public.properties from authenticated;
revoke truncate, references, trigger on table public.rooms from authenticated;
revoke truncate, references, trigger on table public.profiles from authenticated;
