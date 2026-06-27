-- Stellarion - positions joueurs uniques sur la carte galaxie
-- A lancer une fois dans l'editeur SQL Supabase.

alter table public.players
  add column if not exists galaxy_x integer,
  add column if not exists galaxy_y integer,
  add column if not exists sector integer,
  add column if not exists system integer,
  add column if not exists home_planet_id text,
  add column if not exists home_planet_name text,
  add column if not exists home_planet_type text,
  add column if not exists home_planet_world jsonb;


create table if not exists public.player_saves (
  player_id uuid primary key,
  payload jsonb not null,
  save_version text,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

do $$
begin
  create policy "players read own save"
    on public.player_saves
    for select
    using (auth.uid() = player_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players insert own save"
    on public.player_saves
    for insert
    with check (auth.uid() = player_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players update own save"
    on public.player_saves
    for update
    using (auth.uid() = player_id)
    with check (auth.uid() = player_id);
exception
  when duplicate_object then null;
end $$;
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  recipient_id uuid not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

alter table public.messages enable row level security;

do $$
begin
  create policy "players send messages"
    on public.messages
    for insert
    with check (auth.uid() = sender_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players read their messages"
    on public.messages
    for select
    using (auth.uid() = recipient_id or auth.uid() = sender_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players mark received messages read"
    on public.messages
    for update
    using (auth.uid() = recipient_id)
    with check (auth.uid() = recipient_id);
exception
  when duplicate_object then null;
end $$;

-- 0,0 est une position "non attribuee", jamais une vraie planete joueur.
update public.players
set galaxy_x = null,
    galaxy_y = null,
    sector = null,
    system = null
where galaxy_x = 0 and galaxy_y = 0;

-- Si des doublons historiques existent, on garde le plus recent et on force les autres
-- a reclamer une nouvelle position au prochain chargement.
with ranked as (
  select
    id,
    row_number() over (
      partition by galaxy_x, galaxy_y
      order by last_seen desc nulls last, id
    ) as rn
  from public.players
  where galaxy_x is not null and galaxy_y is not null
)
update public.players p
set galaxy_x = null,
    galaxy_y = null,
    sector = null,
    system = null
from ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists players_unique_galaxy_coord
  on public.players (galaxy_x, galaxy_y)
  where galaxy_x is not null and galaxy_y is not null;

do $$
begin
  create policy "players visible on galaxy map"
    on public.players
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.public_missions (
  id text primary key,
  player_id uuid,
  player_name text,
  mission text,
  from_x integer not null,
  from_y integer not null,
  to_x integer not null,
  to_y integer not null,
  target_name text,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_returning boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.public_missions enable row level security;

do $$
begin
  create policy "public missions visible on galaxy map"
    on public.public_missions
    for select
    using (ends_at > now() - interval '2 minutes');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players publish their missions"
    on public.public_missions
    for insert
    with check (auth.uid() = player_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players update their missions"
    on public.public_missions
    for update
    using (auth.uid() = player_id)
    with check (auth.uid() = player_id);
exception
  when duplicate_object then null;
end $$;

