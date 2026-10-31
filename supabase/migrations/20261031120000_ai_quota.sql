-- Per-user daily quota for the AI food parser. Only the Edge Function (service role) may call these.
-- The day boundary is UTC.

create or replace function public.consume_ai_quota(p_user uuid, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  insert into public.ai_usage (user_id, day, count)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into used;

  if used > p_limit then
    update public.ai_usage set count = count - 1
    where user_id = p_user and day = (now() at time zone 'utc')::date;
    return null; -- over the limit
  end if;
  return used;
end;
$$;

-- Gives a request back when the AI call failed on our side (not the user's fault).
create or replace function public.refund_ai_quota(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage set count = greatest(0, count - 1)
  where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

revoke execute on function public.consume_ai_quota(uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, integer) to service_role;
grant execute on function public.refund_ai_quota(uuid) to service_role;
