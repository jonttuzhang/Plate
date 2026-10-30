-- Plate: initial schema.
-- Every synced table: client-generated uuid id, user_id, created_at, updated_at (client clock,
-- used for last-write-wins), deleted_at (soft delete), server_updated_at (set here, pull cursor).
-- No foreign keys between synced tables on purpose: rows arrive from offline devices in any
-- order, and built-in exercises exist only in the app. Only user_id references auth.users,
-- so deleting the auth user deletes all of their data.

create table public.profiles (
  id uuid primary key,
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  language text not null default 'en' check (language in ('fi', 'en')),
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  weight_increment_kg double precision not null default 2.5 check (weight_increment_kg > 0),
  body_weight_kg double precision,
  kcal_target integer not null default 2500,
  protein_target_g integer not null default 160,
  carbs_target_g integer,
  fat_target_g integer,
  training_bonus_kcal integer not null default 0,
  training_bonus_protein_g integer not null default 0,
  rest_seconds integer not null default 120,
  onboarded_at timestamptz,
  constraint profiles_id_is_user check (id = user_id)
);

create table public.exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  name text not null,
  muscle_group text,
  equipment text,
  rep_min integer not null default 8,
  rep_max integer not null default 12,
  increment_kg double precision
);

create table public.workouts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  local_date date not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  note text
);

create table public.workout_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  workout_id uuid not null,
  exercise_id uuid not null,
  exercise_position integer not null,
  set_position integer not null,
  weight_kg double precision not null,
  reps integer not null,
  is_warmup boolean not null default false,
  completed_at timestamptz
);

create table public.foods (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  name text not null,
  brand text,
  barcode text,
  kcal_100g double precision not null,
  protein_100g double precision not null,
  carbs_100g double precision not null,
  fat_100g double precision not null,
  serving_g double precision,
  source text not null check (source in ('fineli', 'off', 'custom', 'ai', 'import')),
  source_ref text,
  is_favorite boolean not null default false,
  last_used_at timestamptz
);

create table public.food_entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  local_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid,
  name text not null,
  grams double precision not null,
  kcal double precision not null,
  protein_g double precision not null,
  carbs_g double precision not null,
  fat_g double precision not null,
  source text not null check (source in ('fineli', 'off', 'custom', 'ai', 'import')),
  logged_at timestamptz not null
);

-- Server-only: per-user daily counter for the AI food parser. Written only by the Edge Function (service role).
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

-- Last-write-wins + pull cursor. Runs before every insert/update on synced tables.
create or replace function public.sync_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- A stale write (older client timestamp than what we have) is silently skipped.
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.created_at := old.created_at;
    new.user_id := old.user_id;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

-- Same trigger, index and RLS policies for every synced table.
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'exercises', 'workouts', 'workout_sets', 'foods', 'food_entries'] loop
    execute format(
      'create trigger sync_before_write before insert or update on public.%I
         for each row execute function public.sync_before_write()', t);
    execute format('create index %I on public.%I (user_id, server_updated_at)', t || '_pull', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy "own rows: select" on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows: insert" on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows: update" on public.%I for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    -- No delete policy: clients soft-delete (deleted_at). Hard deletes only via account deletion.
  end loop;
end;
$$;

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
create policy "own rows: select" on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);
