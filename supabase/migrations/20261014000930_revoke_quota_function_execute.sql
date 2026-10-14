-- 1.10d: EXECUTE on the two quota functions is taken away from PUBLIC and anon (docs/TASKS.md 1.10d; owner decision of 14 Okt 2026,
-- round 17, item H8). Separate from the hardening migration so that it can be reverted on its own if a caller turns out to need it.
--
-- Measured 14 Okt 2026 (read-only): tier_quota and quota_exceeded were executable by PUBLIC and by anon, authenticated, service_role
-- (explicit entries from the default ACL). anon has no business calling them (through PostgREST /rpc they were reachable), while the
-- RLS policies and the quota triggers call them as the INVOKER, so authenticated and service_role must keep EXECUTE: it is written
-- out explicitly below instead of relying on the default ACL.
-- Not changed (outside the decided list, reported only): the trigger functions enforce_properties_quota and enforce_rooms_quota (a
-- trigger function needs no EXECUTE at fire time) and handle_new_user (SECURITY DEFINER trigger function).
revoke execute on function public.tier_quota(text, text) from public, anon;
revoke execute on function public.quota_exceeded(text, uuid, uuid, uuid) from public, anon;

grant execute on function public.tier_quota(text, text) to authenticated, service_role;
grant execute on function public.quota_exceeded(text, uuid, uuid, uuid) to authenticated, service_role;
