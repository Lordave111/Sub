-- Run this migration in the Supabase SQL Editor before enabling social OAuth.
create table if not exists public.fg_social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('meta','google')),
  external_account_id text not null,
  account_name text not null,
  access_token_enc text not null,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','paused','revoked','error')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,provider,external_account_id)
);
create index if not exists fg_social_connections_user_idx on public.fg_social_connections(user_id,created_at desc);
alter table public.fg_social_connections enable row level security;
-- Deliberately no client-side SELECT/INSERT/UPDATE/DELETE policies.
-- OAuth tokens are encrypted and only accessed through server routes using the Supabase service key.
