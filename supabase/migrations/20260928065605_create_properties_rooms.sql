-- properties, rooms: basic schema + standard tenant isolation RLS
-- (docs/TASKS.md 1.1b, docs/Architecture.md §3/§4). Quota policies
-- (AS RESTRICTIVE, tier limits) are a separate task, 1.10 — not here.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles (id),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

-- rooms.status: intentionally nullable, no default. Lifecycle values
-- (baru/aktif/perlu-cek/…) are 1.11 scope (docs/PRD.md §6) — inventing a
-- placeholder value here would silently pre-decide that design. NULL is
-- "no status recorded yet", the same pattern already used for
-- profiles.subscription_tier, not a business value.
-- [HIPOTESIS] whether rooms.status ends up NOT NULL with a real default
-- is a 1.11 decision, not settled by this migration.
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id),
  tenant_id uuid not null references public.profiles (id),
  status text
);

create index rooms_property_id_idx on public.rooms (property_id);
create index rooms_tenant_id_idx on public.rooms (tenant_id);
create index properties_tenant_id_idx on public.properties (tenant_id);

-- === RLS: standard tenant isolation ===
--
-- FOR ALL with both USING and WITH CHECK, covering every command in one
-- policy — the 1.1 lesson: a table with a policy for only some commands
-- silently denies the commands that have none, even when other policies
-- exist on the same table. FOR ALL has no such gap.
alter table public.properties enable row level security;

create policy "tenant_isolation" on public.properties
  for all
  using (tenant_id = (select id from public.profiles where id = auth.uid()))
  with check (tenant_id = (select id from public.profiles where id = auth.uid()));

alter table public.rooms enable row level security;

create policy "tenant_isolation" on public.rooms
  for all
  using (tenant_id = (select id from public.profiles where id = auth.uid()))
  with check (tenant_id = (select id from public.profiles where id = auth.uid()));

-- === Cross-tenant FK guard (Architecture §3, "Wajib") ===
--
-- A plain FK constraint does not stop tenant A from inserting a room whose
-- tenant_id is their own (passes tenant_isolation) but whose property_id
-- points at a property owned by tenant B: FK checks run with internal
-- privileges that see every row regardless of RLS, so the referenced row
-- merely has to exist. These RESTRICTIVE policies AND with tenant_isolation
-- instead of replacing it, so a row is only ever visible/writable when both
-- hold: the tenant matches AND property_id belongs to that same tenant.
--
-- property_id IS allowed to change after a room is created (e.g. a Pro
-- tenant reassigning a room between their own properties, or fixing a
-- data-entry mistake) — so the guard applies to UPDATE as well as INSERT,
-- not just INSERT as the minimal case would be. Both policies use the
-- identical check; only the command differs.
create policy "rooms_property_same_tenant" on public.rooms
  as restrictive
  for insert
  with check (
    tenant_id = (select tenant_id from public.properties where id = property_id)
  );

create policy "rooms_property_same_tenant_update" on public.rooms
  as restrictive
  for update
  using (
    tenant_id = (select tenant_id from public.properties where id = property_id)
  )
  with check (
    tenant_id = (select tenant_id from public.properties where id = property_id)
  );
