-- STELLARION 1.6.09 - Idempotency guard for ship/fleet credits
--
-- Run this once in Supabase SQL Editor before deploying the updated
-- supabase/functions/game-action function.

create table if not exists public.game_action_claims (
  kind text not null,
  action_id text not null,
  player_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (kind, action_id)
);

alter table public.game_action_claims enable row level security;

drop policy if exists "service role manages game action claims" on public.game_action_claims;
create policy "service role manages game action claims" on public.game_action_claims
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists game_action_claims_player_idx
  on public.game_action_claims(player_id, claimed_at desc);
