-- Run this in Supabase SQL Editor. Keep the service-role key server-side only.
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  reference text not null unique,
  kind text not null check (kind in ('data','airtime','electricity')),
  network text not null,
  phone text not null,
  billers_code text,
  email text not null,
  amount numeric(12,2) not null,
  commission numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  variation_code text,
  plan_name text,
  status text not null default 'pending_payment',
  paystack_reference text,
  provider_reference text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
alter table public.orders enable row level security;
-- No public policies: all order access is performed by server routes using service role.
