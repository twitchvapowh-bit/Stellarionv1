-- STELLARION 1.5.70 - Server authority schema
-- Run after SUPABASE_CLOUD_ONLY_FINAL_1569.sql.

create extension if not exists pgcrypto;

create table if not exists public.game_resources (
  player_id uuid primary key references auth.users(id) on delete cascade,
  titanium bigint not null default 2500 check (titanium >= 0),
  xenite bigint not null default 1200 check (xenite >= 0),
  antimatter bigint not null default 0 check (antimatter >= 0),
  fragments bigint not null default 0 check (fragments >= 0),
  last_tick timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_buildings (
  player_id uuid not null references auth.users(id) on delete cascade,
  planet_id text not null default 'home',
  building_id text not null,
  level integer not null default 0 check (level >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, planet_id, building_id)
);

create table if not exists public.game_build_queue (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  planet_id text not null default 'home',
  building_id text not null,
  from_level integer not null default 0,
  to_level integer not null default 1,
  start_at timestamptz not null default now(),
  finish_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_ships (
  player_id uuid not null references auth.users(id) on delete cascade,
  planet_id text not null default 'home',
  ship_id text not null,
  qty bigint not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, planet_id, ship_id)
);

create table if not exists public.game_ship_queue (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  planet_id text not null default 'home',
  ship_id text not null,
  qty integer not null default 1 check (qty > 0),
  start_at timestamptz not null default now(),
  finish_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_fleets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  origin_planet_id text not null default 'home',
  target_id text,
  target_name text,
  mission text not null default 'explore',
  ships jsonb not null default '{}'::jsonb,
  cargo jsonb not null default '{}'::jsonb,
  "returning" boolean not null default false,
  start_at timestamptz not null default now(),
  ends_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_security_profile (
  player_id uuid primary key references auth.users(id) on delete cascade,
  migration_locked boolean not null default false,
  migrated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_security_audit (
  id bigint generated always as identity primary key,
  player_id uuid references auth.users(id) on delete set null,
  action text not null,
  ok boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_build_queue_player_finish_idx on public.game_build_queue(player_id, finish_at);
create index if not exists game_ship_queue_player_finish_idx on public.game_ship_queue(player_id, finish_at);
create index if not exists game_fleets_player_ends_idx on public.game_fleets(player_id, ends_at);
create index if not exists game_security_audit_player_created_idx on public.game_security_audit(player_id, created_at desc);

alter table public.game_resources enable row level security;
alter table public.game_buildings enable row level security;
alter table public.game_build_queue enable row level security;
alter table public.game_ships enable row level security;
alter table public.game_ship_queue enable row level security;
alter table public.game_fleets enable row level security;
alter table public.game_security_profile enable row level security;
alter table public.game_security_audit enable row level security;

drop policy if exists "players read own game resources" on public.game_resources;
drop policy if exists "players read own game buildings" on public.game_buildings;
drop policy if exists "players read own build queue" on public.game_build_queue;
drop policy if exists "players read own game ships" on public.game_ships;
drop policy if exists "players read own ship queue" on public.game_ship_queue;
drop policy if exists "players read own game fleets" on public.game_fleets;
drop policy if exists "players read own security profile" on public.game_security_profile;
drop policy if exists "players read own security audit" on public.game_security_audit;

create policy "players read own game resources" on public.game_resources
  for select using (auth.uid() = player_id);
create policy "players read own game buildings" on public.game_buildings
  for select using (auth.uid() = player_id);
create policy "players read own build queue" on public.game_build_queue
  for select using (auth.uid() = player_id);
create policy "players read own game ships" on public.game_ships
  for select using (auth.uid() = player_id);
create policy "players read own ship queue" on public.game_ship_queue
  for select using (auth.uid() = player_id);
create policy "players read own game fleets" on public.game_fleets
  for select using (auth.uid() = player_id);
create policy "players read own security profile" on public.game_security_profile
  for select using (auth.uid() = player_id);
create policy "players read own security audit" on public.game_security_audit
  for select using (auth.uid() = player_id);

create or replace function public.stellarion_strip_player_save_sensitive_1570()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.payload = coalesce(new.payload, '{}'::jsonb)
    - 'resources'
    - 'planetResources'
    - 'buildings'
    - 'buildQueue'
    - 'ships'
    - 'planetShips'
    - 'shipQueue'
    - 'fleets'
    - 'defenses'
    - 'alliance'
    - 'allianceBank'
    - 'allianceLogs'
    - 'allianceApplications'
    - 'publicAlliances';
  new.payload = jsonb_set(new.payload, '{__serverAuthority1570}', '{"uiOnly":true}'::jsonb, true);
  return new;
end;
$$;

drop trigger if exists stellarion_strip_player_save_sensitive_1570 on public.player_saves;
create trigger stellarion_strip_player_save_sensitive_1570
before insert or update on public.player_saves
for each row execute function public.stellarion_strip_player_save_sensitive_1570();
