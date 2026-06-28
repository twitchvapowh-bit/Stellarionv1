-- STELLARION — Cloud Only Final 1.5.69
-- À lancer une fois dans Supabase SQL Editor.
-- Objectif : aligner la base avec le code cloud-only propre.

create extension if not exists pgcrypto;

-- Progression joueur cloud uniquement
create table if not exists public.player_saves (
  player_id uuid primary key,
  payload jsonb not null,
  save_version text,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

drop policy if exists "players read own save" on public.player_saves;
drop policy if exists "players insert own save" on public.player_saves;
drop policy if exists "players update own save" on public.player_saves;

create policy "players read own save" on public.player_saves
  for select using (auth.uid() = player_id);
create policy "players insert own save" on public.player_saves
  for insert with check (auth.uid() = player_id);
create policy "players update own save" on public.player_saves
  for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- Table alliances propre : PAS de chat_logs ici.
create table if not exists public.alliances (
  id text primary key,
  owner_id uuid,
  name text not null default 'Alliance',
  tag text not null default 'ALL',
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

-- Migration douce depuis anciens noms si présents.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='user_id') then
    execute 'update public.alliances set owner_id = coalesce(owner_id, user_id) where owner_id is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='alliances' and column_name='founder_id') then
    execute 'update public.alliances set owner_id = coalesce(owner_id, founder_id) where owner_id is null';
  end if;
end $$;

alter table public.alliances enable row level security;

drop policy if exists "alliances visible to all players" on public.alliances;
drop policy if exists "players create owned alliances" on public.alliances;
drop policy if exists "owners update their alliances" on public.alliances;
drop policy if exists "owners delete their alliances" on public.alliances;

create policy "alliances visible to all players" on public.alliances
  for select using (true);
create policy "players create owned alliances" on public.alliances
  for insert with check (auth.uid() = owner_id);
create policy "owners update their alliances" on public.alliances
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete their alliances" on public.alliances
  for delete using (auth.uid() = owner_id);

create index if not exists alliances_owner_id_idx on public.alliances(owner_id);
create index if not exists alliances_updated_at_idx on public.alliances(updated_at desc);

-- Membres alliance
create table if not exists public.alliance_members (
  alliance_id text not null,
  player_id text not null,
  name text not null default 'Membre',
  rank text not null default 'Membre',
  power integer not null default 0,
  country text not null default '',
  status text not null default 'Actif',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (alliance_id, player_id)
);

alter table public.alliance_members enable row level security;

drop policy if exists "alliance members visible" on public.alliance_members;
drop policy if exists "alliance owners manage members" on public.alliance_members;
drop policy if exists "players leave their alliance" on public.alliance_members;

create policy "alliance members visible" on public.alliance_members
  for select using (true);
create policy "alliance owners manage members" on public.alliance_members
  for all using (
    exists (select 1 from public.alliances a where a.id = alliance_members.alliance_id and a.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.alliances a where a.id = alliance_members.alliance_id and a.owner_id = auth.uid())
  );
create policy "players leave their alliance" on public.alliance_members
  for delete using (player_id = auth.uid()::text);

create index if not exists alliance_members_player_id_idx on public.alliance_members(player_id);
create index if not exists alliance_members_alliance_id_idx on public.alliance_members(alliance_id);

-- Candidatures
create table if not exists public.alliance_applications (
  id uuid primary key default gen_random_uuid(),
  alliance_id text not null,
  player_id uuid,
  player_name text not null default 'Joueur',
  message text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alliance_applications enable row level security;

drop policy if exists "players read related alliance applications" on public.alliance_applications;
drop policy if exists "players create alliance applications" on public.alliance_applications;
drop policy if exists "alliance owners update applications" on public.alliance_applications;

create policy "players read related alliance applications" on public.alliance_applications
  for select using (
    auth.uid() = player_id
    or exists (select 1 from public.alliances a where a.id = alliance_applications.alliance_id and a.owner_id = auth.uid())
  );
create policy "players create alliance applications" on public.alliance_applications
  for insert with check (auth.uid() = player_id);
create policy "alliance owners update applications" on public.alliance_applications
  for update using (
    exists (select 1 from public.alliances a where a.id = alliance_applications.alliance_id and a.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.alliances a where a.id = alliance_applications.alliance_id and a.owner_id = auth.uid())
  );

-- Chat alliance séparé. Table optionnelle mais propre.
create table if not exists public.alliance_chat (
  id uuid primary key default gen_random_uuid(),
  alliance_id text not null,
  player_id uuid,
  player_name text not null default 'Joueur',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.alliance_chat enable row level security;

drop policy if exists "alliance chat visible to members" on public.alliance_chat;
drop policy if exists "alliance members write chat" on public.alliance_chat;

create policy "alliance chat visible to members" on public.alliance_chat
  for select using (
    exists (select 1 from public.alliance_members m where m.alliance_id = alliance_chat.alliance_id and m.player_id = auth.uid()::text)
    or exists (select 1 from public.alliances a where a.id = alliance_chat.alliance_id and a.owner_id = auth.uid())
  );
create policy "alliance members write chat" on public.alliance_chat
  for insert with check (
    auth.uid() = player_id
    and (
      exists (select 1 from public.alliance_members m where m.alliance_id = alliance_chat.alliance_id and m.player_id = auth.uid()::text)
      or exists (select 1 from public.alliances a where a.id = alliance_chat.alliance_id and a.owner_id = auth.uid())
    )
  );

-- Trajectoires publiques, avec RLS propre.
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

drop policy if exists "public missions visible on galaxy map" on public.public_missions;
drop policy if exists "players publish their missions" on public.public_missions;
drop policy if exists "players update their missions" on public.public_missions;

create policy "public missions visible on galaxy map" on public.public_missions
  for select using (ends_at > now() - interval '2 minutes');
create policy "players publish their missions" on public.public_missions
  for insert with check (auth.uid() = player_id);
create policy "players update their missions" on public.public_missions
  for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

select pg_notify('pgrst', 'reload schema');
