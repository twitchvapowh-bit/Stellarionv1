-- STELLARION 1.5.70 — SERVER AUTHORITY SECURITY LAYER
-- Objectif : empêcher le navigateur de décider seul des ressources, bâtiments,
-- vaisseaux, files et flottes. Le client demande; le serveur vérifie et décide.

create extension if not exists pgcrypto;

-- Etat canonique ressources joueur.
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
  from_level integer not null default 0 check (from_level >= 0),
  to_level integer not null check (to_level > 0),
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
  mission text not null,
  ships jsonb not null default '{}'::jsonb,
  cargo jsonb not null default '{}'::jsonb,
  returning boolean not null default false,
  start_at timestamptz not null default now(),
  ends_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_security_audit (
  id bigserial primary key,
  player_id uuid,
  action text not null,
  ok boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.game_security_profile (
  player_id uuid primary key references auth.users(id) on delete cascade,
  migration_locked boolean not null default true,
  migrated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index utiles.
create index if not exists game_build_queue_player_finish_idx on public.game_build_queue(player_id, finish_at);
create index if not exists game_ship_queue_player_finish_idx on public.game_ship_queue(player_id, finish_at);
create index if not exists game_fleets_player_finish_idx on public.game_fleets(player_id, ends_at);

-- RLS : le navigateur peut lire son état, mais ne peut pas modifier les tables canoniques.
alter table public.game_resources enable row level security;
alter table public.game_buildings enable row level security;
alter table public.game_build_queue enable row level security;
alter table public.game_ships enable row level security;
alter table public.game_ship_queue enable row level security;
alter table public.game_fleets enable row level security;
alter table public.game_security_audit enable row level security;
alter table public.game_security_profile enable row level security;

drop policy if exists "read own game resources" on public.game_resources;
create policy "read own game resources" on public.game_resources for select using (auth.uid() = player_id);

drop policy if exists "read own game buildings" on public.game_buildings;
create policy "read own game buildings" on public.game_buildings for select using (auth.uid() = player_id);

drop policy if exists "read own build queue" on public.game_build_queue;
create policy "read own build queue" on public.game_build_queue for select using (auth.uid() = player_id);

drop policy if exists "read own ships" on public.game_ships;
create policy "read own ships" on public.game_ships for select using (auth.uid() = player_id);

drop policy if exists "read own ship queue" on public.game_ship_queue;
create policy "read own ship queue" on public.game_ship_queue for select using (auth.uid() = player_id);

drop policy if exists "read own fleets" on public.game_fleets;
create policy "read own fleets" on public.game_fleets for select using (auth.uid() = player_id);

drop policy if exists "read own security profile" on public.game_security_profile;
create policy "read own security profile" on public.game_security_profile for select using (auth.uid() = player_id);

-- Aucun INSERT/UPDATE/DELETE policy sur game_* : seulement l'Edge Function avec SERVICE_ROLE peut écrire.

-- Sécurisation player_saves : même si un joueur force une sauvegarde depuis la console,
-- les champs sensibles sont retirés AVANT stockage. player_saves reste pour UI/options/messages non critiques.
create or replace function public.stellarion_strip_authoritative_payload()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payload is null then
    return new;
  end if;

  new.payload = new.payload
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
    - 'publicAlliances'
    - 'messages_read_related';

  new.save_version = coalesce(new.save_version, 'ui-only') || '-ui-only-authority-1570';
  return new;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='player_saves') then
    drop trigger if exists stellarion_strip_authoritative_payload_trg on public.player_saves;
    create trigger stellarion_strip_authoritative_payload_trg
      before insert or update on public.player_saves
      for each row execute function public.stellarion_strip_authoritative_payload();
  end if;
end $$;

-- Table public_missions compatible avec la carte galaxie, si absente.
create table if not exists public.public_missions (
  id text primary key,
  player_id uuid,
  player_name text,
  mission text,
  from_x integer not null default 0,
  from_y integer not null default 0,
  to_x integer not null default 0,
  to_y integer not null default 0,
  target_name text,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_returning boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.public_missions enable row level security;

drop policy if exists "public missions visible on galaxy map" on public.public_missions;
create policy "public missions visible on galaxy map" on public.public_missions
  for select using (ends_at > now() - interval '2 minutes');

drop policy if exists "players publish their missions" on public.public_missions;
create policy "players publish their missions" on public.public_missions
  for insert with check (auth.uid() = player_id);

drop policy if exists "players update their missions" on public.public_missions;
create policy "players update their missions" on public.public_missions
  for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

select pg_notify('pgrst', 'reload schema');
