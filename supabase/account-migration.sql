-- Run this migration in Supabase SQL Editor after the original schema.sql.
-- Customers authenticate with Supabase Auth; orders are linked to auth.users.
alter table public.orders add column if not exists user_id uuid references auth.users(id);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);

create table if not exists public.wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('credit','debit')),
  description text not null,
  reference text unique,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_idx on public.wallet_transactions(user_id, created_at desc);
alter table public.wallet_transactions enable row level security;
-- Access remains server-only through service-role API routes.
