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
