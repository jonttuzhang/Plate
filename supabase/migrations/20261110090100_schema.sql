-- Plate: synced tables, sync trigger and Row Level Security.
--
-- Every table mirrors a local SQLite table (src/db/schema.ts) and adds:
--   user_id     owner, filled from the session; RLS limits every query to the owner's rows
--   server_seq  a server-side change counter, bumped on every write; devices pull
--               "everything with server_seq greater than what I have seen"
-- Rows are never deleted by the app (soft delete via deleted_at). Deleting the auth user
-- cascades and removes all of their rows.

create sequence public.sync_seq;

create function public.sync_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- One writer per user at a time. This makes server_seq order equal commit order, so a
  -- device that has pulled up to N can never miss a row that commits later with a lower number.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if tg_op = 'UPDATE' then
    -- Last write wins: an older (or identical) copy never overwrites a newer one.
    if new.updated_at <= old.updated_at then
      return null;
    end if;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;

  new.server_seq := nextval('public.sync_seq');
  return new;
end;
$$;

revoke execute on function public.sync_before_write() from public, anon, authenticated;
grant usage on sequence public.sync_seq to authenticated;

create table public.profiles (
  id uuid primary key,
  units text not null check (units in ('metric', 'imperial')),
  body_weight_kg double precision,
  kcal_target double precision not null,
  protein_target_g double precision not null,
  carbs_target_g double precision,
  fat_target_g double precision,
  training_bonus_kcal double precision not null,
  training_bonus_protein_g double precision not null,
  weight_increment_kg double precision not null,
  onboarded_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_seq bigint not null,
  -- one profile per user, and its id is the user's id
  constraint profiles_id_is_user check (id = user_id)
);

create table public.exercises (
  id uuid primary key,
  name text not null,
  muscle_group text,
  rep_min integer not null,
  rep_max integer not null,
  increment_kg double precision,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_seq bigint not null
);

create table public.workouts (
  id uuid primary key,
  day date not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  note text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_seq bigint not null
);

create table public.workout_sets (
  id uuid primary key,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  -- no foreign key: built-in exercises live in the app and have no row here
  exercise_id uuid not null,
  exercise_order integer not null,
  set_order integer not null,
  weight_kg double precision not null,
  reps integer not null,
  completed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_seq bigint not null
);

create table public.foods (
  id uuid primary key,
  name text not null,
  brand text,
  barcode text,
  source text not null check (source in ('custom', 'fineli', 'off', 'ai', 'import')),
  source_ref text,
  kcal_100g double precision not null,
  protein_100g double precision not null,
  carbs_100g double precision not null,
  fat_100g double precision not null,
  serving_g double precision,
  serving_label text,
  favorited_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_seq bigint not null
);

create table public.food_entries (
  id uuid primary key,
  day date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  -- no foreign key: the entry keeps its own macro snapshot and outlives the food
  food_id uuid,
  name text not null,
  amount_g double precision not null,
  kcal double precision not null,
  protein_g double precision not null,
  carbs_g double precision not null,
  fat_g double precision not null,
  logged_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  server_seq bigint not null
);

create index workout_sets_workout_id on public.workout_sets (workout_id);

-- The same trigger, pull index, grants and policies for every synced table.
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'exercises', 'workouts', 'workout_sets', 'foods', 'food_entries']
  loop
    execute format(
      'create trigger sync_before_write before insert or update on public.%I
         for each row execute function public.sync_before_write()', t);
    execute format('create index %I on public.%I (user_id, server_seq)', t || '_pull', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    -- No DELETE grant: the app only soft-deletes.
    execute format('grant select, insert, update on public.%I to authenticated', t);

    execute format(
      'create policy "Users read their own rows" on public.%I
         for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Users insert their own rows" on public.%I
         for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Users update their own rows" on public.%I
         for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
