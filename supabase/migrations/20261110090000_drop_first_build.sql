-- Removes the schema of the first Plate build (it held no data) before the rebuild.
drop table if exists public.workout_sets, public.workouts, public.exercises,
  public.food_entries, public.foods, public.profiles, public.ai_usage cascade;
drop function if exists public.consume_ai_quota(uuid, integer);
drop function if exists public.refund_ai_quota(uuid);
drop function if exists public.sync_before_write();
