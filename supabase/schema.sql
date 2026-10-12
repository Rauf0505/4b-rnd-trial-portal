-- ============================================================================
-- 4B R&D Trial Portal - Supabase schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).
--
-- NOTE ON SECURITY: this app keeps a lightweight in-app role switcher instead
-- of Supabase Auth, so the anon key needs read/write access. That means anyone
-- holding the anon key can read/write the data. Do not store sensitive data and
-- consider adding Supabase Auth + stricter RLS before production use.
-- ============================================================================

-- ── Trials ──────────────────────────────────────────────────────────────────
create table if not exists public.trials (
  id uuid primary key default gen_random_uuid(),
  station text not null,
  station_serial integer,
  trial_name text not null,
  category text not null,
  insecticide_sub_category text,
  crop text not null,
  pest_or_weed text not null,
  observation_schedule integer[] not null default '{}',
  harvest_stage_date date,
  conducted_date date not null,
  field_location text not null,
  field_staff_name text not null,
  remarks text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Trial products (one trial -> many products) ─────────────────────────────
create table if not exists public.trial_products (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  position integer not null default 0,
  product_name text not null,
  active_ingredient text not null default '',
  formulation text default '',
  dose text default '',
  unit text default '',
  replications integer default 3,
  applications integer default 1,
  created_at timestamptz not null default now()
);

-- ── Observations (one trial -> many scheduled observations) ─────────────────
create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials(id) on delete cascade,
  day integer not null,
  planned_date date not null,
  completed boolean not null default false,
  actual_date date,
  efficacy_percent numeric,
  pest_mortality_count text,
  weed_control_percent numeric,
  phytotoxicity text,
  notes text,
  observed_by text,
  updated_at timestamptz not null default now(),
  unique (trial_id, day)
);

create index if not exists idx_trial_products_trial on public.trial_products(trial_id);
create index if not exists idx_observations_trial on public.observations(trial_id);
create index if not exists idx_trials_station on public.trials(station);

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trials_updated_at on public.trials;
create trigger trg_trials_updated_at
  before update on public.trials
  for each row execute function public.set_updated_at();

-- ── Row Level Security (permissive while auth is not enabled) ───────────────
alter table public.trials enable row level security;
alter table public.trial_products enable row level security;
alter table public.observations enable row level security;

drop policy if exists "trials_all_anon" on public.trials;
create policy "trials_all_anon" on public.trials
  for all using (true) with check (true);

drop policy if exists "trial_products_all_anon" on public.trial_products;
create policy "trial_products_all_anon" on public.trial_products
  for all using (true) with check (true);

drop policy if exists "observations_all_anon" on public.observations;
create policy "observations_all_anon" on public.observations
  for all using (true) with check (true);
