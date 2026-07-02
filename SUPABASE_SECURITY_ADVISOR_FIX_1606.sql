-- STELLARION 1.6.06 - Supabase Security Advisor cleanup
--
-- Warnings covered:
--   - authenticated_security_definer_function_executable
--   - auth_leaked_password_protection (dashboard action, see bottom)
--
-- IMPORTANT:
-- This file is the strict linter-clean version. It removes direct RPC access
-- from anon/authenticated for SECURITY DEFINER functions listed by Supabase.
-- Any frontend call to these RPCs must be replaced by a trusted Edge Function
-- or a safer SECURITY INVOKER/RLS design before applying this in production.

begin;

-- Construction / resource RPCs
revoke execute on function public.ca04_complete_due_constructions() from public, anon, authenticated;
grant execute on function public.ca04_complete_due_constructions() to service_role;

revoke execute on function public.ca04_finish_construction_now(uuid, bigint) from public, anon, authenticated;
grant execute on function public.ca04_finish_construction_now(uuid, bigint) to service_role;

revoke execute on function public.ca04_start_construction(uuid, text, integer, bigint, bigint, bigint, integer) from public, anon, authenticated;
grant execute on function public.ca04_start_construction(uuid, text, integer, bigint, bigint, bigint, integer) to service_role;

revoke execute on function public.ca05_tick_all_my_planets() from public, anon, authenticated;
grant execute on function public.ca05_tick_all_my_planets() to service_role;

revoke execute on function public.ca05_tick_planet_resources(uuid) from public, anon, authenticated;
grant execute on function public.ca05_tick_planet_resources(uuid) to service_role;

revoke execute on function public.ca060_tick_all_my_planets() from public, anon, authenticated;
grant execute on function public.ca060_tick_all_my_planets() to service_role;

revoke execute on function public.ca060_tick_planet_resources(uuid) from public, anon, authenticated;
grant execute on function public.ca060_tick_planet_resources(uuid) to service_role;

-- Account / empire bootstrap RPCs
revoke execute on function public.create_homeworld_for_player() from public, anon, authenticated;
grant execute on function public.create_homeworld_for_player() to service_role;

revoke execute on function public.ensure_player_empire(text, text) from public, anon, authenticated;
grant execute on function public.ensure_player_empire(text, text) to service_role;

-- Internal helper
revoke execute on function public.gb_numeric(text, numeric) from public, anon, authenticated;
grant execute on function public.gb_numeric(text, numeric) to service_role;

-- Combat return / attack resolvers
revoke execute on function public.rc01_finalize_returns() from public, anon, authenticated;
grant execute on function public.rc01_finalize_returns() to service_role;

revoke execute on function public.rc01_resolve_due_attacks() from public, anon, authenticated;
grant execute on function public.rc01_resolve_due_attacks() to service_role;

revoke execute on function public.rc01_resolve_due_attacks_v2() from public, anon, authenticated;
grant execute on function public.rc01_resolve_due_attacks_v2() to service_role;

-- Marketplace RPCs
revoke execute on function public.stellarion_accept_market_listing(text, text, text) from public, anon, authenticated;
grant execute on function public.stellarion_accept_market_listing(text, text, text) to service_role;

revoke execute on function public.stellarion_cancel_market_listing(text) from public, anon, authenticated;
grant execute on function public.stellarion_cancel_market_listing(text) to service_role;

-- PvP resolver
revoke execute on function public.stellarion_resolve_player_attack(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.stellarion_resolve_player_attack(uuid, text, jsonb) to service_role;

commit;

-- Verification after running:
-- select
--   n.nspname as schema_name,
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as args,
--   p.prosecdef as security_definer,
--   has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
--   has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
--   has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in (
--     'ca04_complete_due_constructions',
--     'ca04_finish_construction_now',
--     'ca04_start_construction',
--     'ca05_tick_all_my_planets',
--     'ca05_tick_planet_resources',
--     'ca060_tick_all_my_planets',
--     'ca060_tick_planet_resources',
--     'create_homeworld_for_player',
--     'ensure_player_empire',
--     'gb_numeric',
--     'rc01_finalize_returns',
--     'rc01_resolve_due_attacks',
--     'rc01_resolve_due_attacks_v2',
--     'stellarion_accept_market_listing',
--     'stellarion_cancel_market_listing',
--     'stellarion_resolve_player_attack'
--   )
-- order by p.proname, args;

-- The leaked password protection warning cannot be fixed with SQL.
-- Supabase Dashboard:
-- Authentication -> Providers -> Email -> Password security
-- Enable "Leaked password protection", then rerun Security Advisor.
