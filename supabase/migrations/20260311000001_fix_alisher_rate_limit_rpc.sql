create or replace function public.consume_ask_alisher_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  request_count integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  loop
    update public.ask_alisher_rate_limits
       set request_count = case
             when ask_alisher_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
             else ask_alisher_rate_limits.request_count + 1
           end,
           window_started_at = case
             when ask_alisher_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
             else ask_alisher_rate_limits.window_started_at
           end,
           updated_at = v_now
     where ask_alisher_rate_limits.key = p_key
     returning ask_alisher_rate_limits.window_started_at, ask_alisher_rate_limits.request_count
       into v_window_started_at, v_request_count;

    if found then
      exit;
    end if;

    begin
      insert into public.ask_alisher_rate_limits (key, window_started_at, request_count, updated_at)
      values (p_key, v_now, 1, v_now)
      returning ask_alisher_rate_limits.window_started_at, ask_alisher_rate_limits.request_count
        into v_window_started_at, v_request_count;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return query
  select
    v_request_count <= p_limit,
    v_request_count,
    v_window_started_at + make_interval(secs => p_window_seconds);
end;
$$;

grant execute on function public.consume_ask_alisher_rate_limit(text, integer, integer)
  to anon, authenticated, service_role;
