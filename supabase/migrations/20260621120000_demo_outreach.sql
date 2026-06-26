-- Demo outreach: flagged agents, outreach metadata, catalog snapshots for cards/QA.

create type public.demo_outreach_status as enum (
  'pending',
  'indexing',
  'qa_running',
  'ready',
  'needs_review',
  'failed',
  'expired'
);

alter table public.agents
  add column if not exists is_demo boolean not null default false;

create index if not exists agents_is_demo_idx
  on public.agents(is_demo)
  where is_demo = true;

create table if not exists public.demo_outreach (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  slug text not null unique,
  store_url text not null check (store_url <> ''),
  store_host text not null check (store_host <> ''),
  status public.demo_outreach_status not null default 'pending',
  display_name text,
  logo_url text,
  product_count integer not null default 0 check (product_count >= 0),
  suggested_prompts jsonb not null default '[]'::jsonb check (jsonb_typeof(suggested_prompts) = 'array'),
  sheet_ref jsonb not null default '{}'::jsonb check (jsonb_typeof(sheet_ref) = 'object'),
  sheet_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(sheet_snapshot) = 'object'),
  qa_report jsonb not null default '{}'::jsonb check (jsonb_typeof(qa_report) = 'object'),
  lifetime_message_count integer not null default 0 check (lifetime_message_count >= 0),
  ready_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists demo_outreach_status_idx
  on public.demo_outreach(status, created_at desc);

create index if not exists demo_outreach_store_host_idx
  on public.demo_outreach(store_host);

create index if not exists demo_outreach_expires_at_idx
  on public.demo_outreach(expires_at)
  where expires_at is not null;

create table if not exists public.demo_catalog_snapshots (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  products jsonb not null default '[]'::jsonb check (jsonb_typeof(products) = 'array'),
  policies jsonb not null default '{}'::jsonb check (jsonb_typeof(policies) = 'object'),
  ingest_source text not null default 'products_json',
  ingested_at timestamptz not null default now()
);

create table if not exists public.demo_visitor_usage (
  demo_agent_id uuid not null references public.agents(id) on delete cascade,
  visitor_id text not null check (visitor_id <> ''),
  message_count integer not null default 0 check (message_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (demo_agent_id, visitor_id)
);
