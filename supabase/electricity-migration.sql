-- Run this once in Supabase SQL Editor to upgrade an existing Sub database.
alter table public.orders add column if not exists billers_code text;
alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check check (kind in ('data','airtime','electricity'));
