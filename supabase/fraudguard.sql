-- FraudGuard production foundation. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.fg_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.fg_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table if not exists public.fg_memberships (
  organization_id uuid not null references public.fg_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'analyst' check (role in ('owner','admin','analyst','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);
create table if not exists public.fg_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.fg_organizations(id) on delete set null,
  category text not null check (category in ('phishing','impersonation','investment','payment','romance','job','other')),
  channel text not null default 'other',
  description text not null check (char_length(description) between 12 and 8000),
  suspicious_url text,
  amount_lost numeric(14,2),
  currency text not null default 'NGN',
  status text not null default 'pending_review' check (status in ('pending_review','in_review','verified_pattern','rejected','resolved')),
  visibility text not null default 'private' check (visibility in ('private','moderated_public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fg_reports_reporter_created_idx on public.fg_reports(reporter_id,created_at desc);
create index if not exists fg_reports_status_created_idx on public.fg_reports(status,created_at desc);
create table if not exists public.fg_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.fg_organizations(id) on delete set null,
  scan_type text not null check (scan_type in ('message','link','investment')),
  risk_level text not null check (risk_level in ('low','medium','high')),
  score integer not null check (score between 0 and 100),
  summary text not null,
  signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fg_scans_user_created_idx on public.fg_scans(user_id,created_at desc);
create table if not exists public.fg_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.fg_reports(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null,
  review_status text not null default 'quarantined' check (review_status in ('quarantined','clean','rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.fg_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.fg_organizations(id) on delete cascade,
  provider text not null check (provider in ('whatsapp_cloud','facebook_pages','instagram','telegram')),
  external_account_id text,
  status text not null default 'pending_setup' check (status in ('pending_setup','connected','paused','revoked','error')),
  scopes text[] not null default '{}',
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id,provider,external_account_id)
);
create table if not exists public.fg_alert_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_alerts boolean not null default true,
  high_risk_only boolean not null default true,
  digest text not null default 'instant' check (digest in ('instant','daily','weekly','off')),
  updated_at timestamptz not null default now()
);
create table if not exists public.fg_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.fg_organizations(id) on delete cascade,
  event_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.fg_profiles enable row level security;
alter table public.fg_organizations enable row level security;
alter table public.fg_memberships enable row level security;
alter table public.fg_reports enable row level security;
alter table public.fg_scans enable row level security;
alter table public.fg_evidence enable row level security;
alter table public.fg_integrations enable row level security;
alter table public.fg_alert_preferences enable row level security;
alter table public.fg_audit_events enable row level security;

drop policy if exists "profile self read" on public.fg_profiles;
create policy "profile self read" on public.fg_profiles for select using (auth.uid() = id);
drop policy if exists "profile self insert" on public.fg_profiles;
create policy "profile self insert" on public.fg_profiles for insert with check (auth.uid() = id);
drop policy if exists "profile self update" on public.fg_profiles;
create policy "profile self update" on public.fg_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "membership self read" on public.fg_memberships;
create policy "membership self read" on public.fg_memberships for select using (auth.uid() = user_id);
drop policy if exists "org members read org" on public.fg_organizations;
create policy "org members read org" on public.fg_organizations for select using (exists(select 1 from public.fg_memberships m where m.organization_id=id and m.user_id=auth.uid()));
drop policy if exists "org creator insert" on public.fg_organizations;
create policy "org creator insert" on public.fg_organizations for insert with check (auth.uid() = created_by);
drop policy if exists "reports owner read" on public.fg_reports;
create policy "reports owner read" on public.fg_reports for select using (reporter_id=auth.uid() or exists(select 1 from public.fg_memberships m where m.organization_id=fg_reports.organization_id and m.user_id=auth.uid()));
drop policy if exists "reports owner insert" on public.fg_reports;
create policy "reports owner insert" on public.fg_reports for insert with check (reporter_id=auth.uid() and (organization_id is null or exists(select 1 from public.fg_memberships m where m.organization_id=fg_reports.organization_id and m.user_id=auth.uid())));
drop policy if exists "scans owner read" on public.fg_scans;
create policy "scans owner read" on public.fg_scans for select using (user_id=auth.uid() or exists(select 1 from public.fg_memberships m where m.organization_id=fg_scans.organization_id and m.user_id=auth.uid()));
drop policy if exists "evidence uploader read" on public.fg_evidence;
create policy "evidence uploader read" on public.fg_evidence for select using (uploader_id=auth.uid());
drop policy if exists "alert prefs self" on public.fg_alert_preferences;
create policy "alert prefs self" on public.fg_alert_preferences for all using (user_id=auth.uid()) with check (user_id=auth.uid());
-- No client-side write policies for memberships, integrations, evidence, audit events or moderation.
-- Use the server-side service key only after checking the authenticated user's membership/role.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('fraudguard-evidence','fraudguard-evidence',false,10485760,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain'])
on conflict (id) do update set public=false,file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;
