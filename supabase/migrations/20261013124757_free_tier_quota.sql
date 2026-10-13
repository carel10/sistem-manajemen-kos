-- 1.10: free-tier quota of properties and rooms (docs/TASKS.md 1.10, docs/Architecture.md section 6; owner decision Q25 of 13 Okt 2026).
--
-- Two layers on the same tables:
--   1. RESTRICTIVE policies: declarative, ANDed with tenant_isolation (and with rooms_property_same_tenant).
--   2. BEFORE triggers: take a per-tenant advisory lock and RECOUNT inside the lock.
--
-- A policy alone is not safe against concurrent INSERTs: its count() is read from the statement snapshot, which only sees committed
-- rows, so two simultaneous INSERTs of one Free tenant both see 0 properties and both pass; it does not see the other rows of the same
-- multi-row INSERT either. The advisory lock serialises the decisions of one tenant until the end of the transaction, and the recount
-- runs in a VOLATILE function, so every query in it takes a fresh snapshot and sees the commit of the previous lock holder (a STABLE
-- function would keep the snapshot of the calling statement and would not see it).
--
-- The numbers live in ONE function, public.tier_quota; it is replaced by a lookup of the plans table in task 1.3. The tier is read from
-- the tenant's profiles row at the moment of the check, never cached.
--
-- Rooms are counted per property (docs/PRD.md section 5b). rooms.property_id can be changed after creation (1.1b allows moving a room
-- between a tenant's own properties, and the default grants of `authenticated` include UPDATE on that column), so the quota also
-- applies to an UPDATE that changes property_id. An UPDATE that keeps the property is never blocked: a room that already counts in
-- that property adds nothing.
--
-- A violation raises SQLSTATE MK001 (properties) or MK002 (rooms per property) with HINT upgrade_to_pro, so the UI can map it
-- (docs/Architecture.md section 6). A policy that rejects without the trigger gives the standard 42501.

-- === the numbers (the only place that holds them) ===
create function public.tier_quota(p_tier text, p_resource text)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_tier = 'free' and p_resource = 'properties' then 1
    when p_tier = 'free' and p_resource = 'rooms_per_property' then 5
    else null
  end;
$$;

-- === the decision: would one more row exceed the limit? (VOLATILE on purpose) ===
-- NULL limit = unlimited. An unknown tier (the profile row is not visible to the caller) is not limited here: the RLS policies decide.
create function public.quota_exceeded(
  p_resource text,
  p_tenant_id uuid,
  p_property_id uuid default null,
  p_room_id uuid default null
)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_tier text;
  v_limit integer;
  v_count bigint;
begin
  select p.subscription_tier into v_tier from public.profiles p where p.id = p_tenant_id;
  v_limit := public.tier_quota(v_tier, p_resource);
  if v_limit is null then
    return false;
  end if;

  if p_resource = 'properties' then
    select count(*) into v_count from public.properties where tenant_id = p_tenant_id;
  elsif p_resource = 'rooms_per_property' then
    if p_room_id is not null
       and exists (select 1 from public.rooms r where r.id = p_room_id and r.property_id = p_property_id) then
      return false;
    end if;
    select count(*) into v_count from public.rooms r where r.property_id = p_property_id;
  else
    raise exception 'unknown quota resource: %', p_resource;
  end if;
  return v_count >= v_limit;
end;
$$;

-- === layer 2: triggers (lock, then recount inside the lock) ===
create function public.enforce_properties_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('manakos.quota:' || new.tenant_id::text, 0));
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

create function public.enforce_rooms_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('manakos.quota:' || new.tenant_id::text, 0));
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

create trigger properties_quota_insert
  before insert on public.properties
  for each row execute function public.enforce_properties_quota();

create trigger rooms_quota_insert
  before insert on public.rooms
  for each row execute function public.enforce_rooms_quota();

create trigger rooms_quota_move
  before update of property_id on public.rooms
  for each row
  when (old.property_id is distinct from new.property_id)
  execute function public.enforce_rooms_quota();

-- === layer 1: RESTRICTIVE policies (the tier and the count come from the same functions) ===
-- >>> quota policies (restored from here by the MQ2 mutant)
create policy "free_tier_property_limit" on public.properties
  as restrictive
  for insert
  with check (not public.quota_exceeded('properties', tenant_id));

create policy "free_tier_room_limit" on public.rooms
  as restrictive
  for insert
  with check (not public.quota_exceeded('rooms_per_property', tenant_id, property_id));

-- USING (true) is neutral for a RESTRICTIVE policy; the check only bites when property_id moves to a property that is full.
create policy "free_tier_room_limit_move" on public.rooms
  as restrictive
  for update
  using (true)
  with check (not public.quota_exceeded('rooms_per_property', tenant_id, property_id, id));
-- <<< quota policies
