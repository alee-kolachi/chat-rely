-- Demo outreach provision queue (Google Sheet intake → worker processes one store at a time).

create type public.demo_provision_job_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled'
);

create table if not exists public.demo_provision_jobs (
  id uuid primary key default gen_random_uuid(),
  store_url text not null check (store_url <> ''),
  store_host text not null check (store_host <> ''),
  agent_id uuid references public.agents(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.demo_provision_job_status not null default 'queued',
  attempt integer not null default 1 check (attempt >= 1),
  triggered_by text not null default 'sheets_sync',
  sheet_ref jsonb not null default '{}'::jsonb check (jsonb_typeof(sheet_ref) = 'object'),
  sheet_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(sheet_snapshot) = 'object'),
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create index if not exists demo_provision_jobs_active_idx
  on public.demo_provision_jobs (status, created_at asc)
  where status in ('queued', 'running');

create unique index if not exists demo_provision_jobs_store_host_active_uidx
  on public.demo_provision_jobs (store_host)
  where status in ('queued', 'running');

create index if not exists demo_provision_jobs_created_at_idx
  on public.demo_provision_jobs (created_at desc);
