create extension if not exists pgcrypto;

create table if not exists public.public_audits (
    id text primary key,
    tools jsonb not null,
    total_spend numeric not null default 0,
    total_savings numeric not null default 0,
    created_at timestamptz not null default now()
);

alter table public.public_audits enable row level security;

drop policy if exists "public_audits_select_public" on public.public_audits;
drop policy if exists "public_audits_insert_public" on public.public_audits;

create policy "public_audits_select_public"
on public.public_audits
for select
to anon, authenticated
using (true);

create policy "public_audits_insert_public"
on public.public_audits
for insert
to anon, authenticated
with check (jsonb_typeof(tools) = 'array');

create table if not exists public.leads (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    company text,
    role text,
    team_size text,
    audit_id text,
    total_monthly numeric,
    total_savings numeric,
    tool_count integer,
    is_high_savings boolean,
    audit_results jsonb,
    created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "leads_insert_public" on public.leads;

create policy "leads_insert_public"
on public.leads
for insert
to anon, authenticated
with check (
    position('@' in email) > 1
    and length(email) <= 320
);
