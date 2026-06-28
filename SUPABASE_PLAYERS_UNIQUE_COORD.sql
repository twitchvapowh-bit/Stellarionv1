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

-- Alpha 1.5.60 - Alliances MMO: registre, membres, annonces, candidatures.
create table if not exists public.alliances (
  id text primary key,
  owner_id uuid,
  name text not null,
  tag text not null,
  description text not null default '',
  status text not null default 'open',
  country text not null default '',
  member_count integer not null default 1,
  power integer not null default 0,
  announcement text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alliances
  add column if not exists owner_id uuid,
  add column if not exists name text not null default 'Alliance',
  add column if not exists tag text not null default 'ALL',
  add column if not exists description text not null default '',
  add column if not exists status text not null default 'open',
  add column if not exists country text not null default '',
  add column if not exists member_count integer not null default 1,
  add column if not exists power integer not null default 0,
  add column if not exists announcement text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'alliances'
      and column_name = 'founder_id'
  ) then
    execute 'update public.alliances set owner_id = coalesce(owner_id, founder_id) where owner_id is null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'alliances'
      and column_name = 'user_id'
  ) then
    execute 'update public.alliances set owner_id = coalesce(owner_id, user_id) where owner_id is null';
  end if;
end $$;

alter table public.alliances enable row level security;

drop policy if exists "alliances visible to all players" on public.alliances;
drop policy if exists "players create owned alliances" on public.alliances;
drop policy if exists "owners update their alliances" on public.alliances;

do $$
begin
  create policy "alliances visible to all players"
    on public.alliances
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players create owned alliances"
    on public.alliances
    for insert
    with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "owners update their alliances"
    on public.alliances
    for update
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.alliance_members (
  alliance_id text not null references public.alliances(id) on delete cascade,
  player_id text not null,
  name text not null,
  rank text not null default 'Membre',
  power integer not null default 0,
  country text not null default '',
  status text not null default 'Actif',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (alliance_id, player_id)
);

alter table public.alliance_members enable row level security;

do $$
begin
  create policy "alliance members visible"
    on public.alliance_members
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "alliance owners manage members"
    on public.alliance_members
    for all
    using (
      exists (
        select 1 from public.alliances a
        where a.id = alliance_members.alliance_id
          and a.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.alliances a
        where a.id = alliance_members.alliance_id
          and a.owner_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.alliance_announcements (
  id uuid primary key default gen_random_uuid(),
  alliance_id text not null references public.alliances(id) on delete cascade,
  author_id uuid,
  title text not null default 'Annonce',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.alliance_announcements enable row level security;

do $$
begin
  create policy "alliance announcements visible"
    on public.alliance_announcements
    for select
    using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "alliance owners publish announcements"
    on public.alliance_announcements
    for insert
    with check (
      exists (
        select 1 from public.alliances a
        where a.id = alliance_announcements.alliance_id
          and a.owner_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.alliance_applications (
  id uuid primary key default gen_random_uuid(),
  alliance_id text not null references public.alliances(id) on delete cascade,
  player_id uuid,
  player_name text not null,
  message text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alliance_applications enable row level security;

do $$
begin
  create policy "players read related alliance applications"
    on public.alliance_applications
    for select
    using (
      auth.uid() = player_id
      or exists (
        select 1 from public.alliances a
        where a.id = alliance_applications.alliance_id
          and a.owner_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "players create alliance applications"
    on public.alliance_applications
    for insert
    with check (auth.uid() = player_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "alliance owners update applications"
    on public.alliance_applications
    for update
    using (
      exists (
        select 1 from public.alliances a
        where a.id = alliance_applications.alliance_id
          and a.owner_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1 from public.alliances a
        where a.id = alliance_applications.alliance_id
          and a.owner_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end $$;

