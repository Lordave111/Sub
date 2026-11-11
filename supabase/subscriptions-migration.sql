-- Digital subscription marketplace foundation.
-- Run once in Supabase SQL Editor after schema.sql and account-migration.sql.
create table if not exists public.subscription_catalog (
  id text primary key,
  provider text not null,
  category text not null,
  description text not null default '',
  plans jsonb not null default '[]'::jsonb,
  enabled boolean not null default false,
  fulfillment_mode text not null default 'manual' check (fulfillment_mode in ('manual','api')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_id text not null references public.subscription_catalog(id),
  provider text not null,
  plan_name text not null,
  account_identifier text not null,
  status text not null default 'pending' check (status in ('pending','active','expired','failed','cancelled','pending_activation')),
  auto_renew boolean not null default false,
  started_at timestamptz,
  expires_at timestamptz,
  last_payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_subscriptions_user_created_idx
  on public.user_subscriptions(user_id, created_at desc);
create index if not exists user_subscriptions_expiry_idx
  on public.user_subscriptions(user_id, expires_at);

create table if not exists public.subscription_orders (
  id bigint generated always as identity primary key,
  reference text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_id text not null references public.subscription_catalog(id),
  provider text not null,
  plan_name text not null,
  account_identifier text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid_pending_activation','processing','active','failed','refunded')),
  paystack_reference text,
  provider_reference text,
  subscription_id uuid references public.user_subscriptions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscription_orders_user_created_idx
  on public.subscription_orders(user_id, created_at desc);

alter table public.subscription_catalog enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.subscription_orders enable row level security;
-- All access is through authenticated server routes using the service-role key.
-- Do not add public write policies or expose the service-role key.
