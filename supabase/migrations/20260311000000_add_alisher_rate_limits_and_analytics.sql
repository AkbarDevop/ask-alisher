create table if not exists public.ask_alisher_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default timezone('utc', now()),
  request_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists ask_alisher_rate_limits_updated_at_idx
  on public.ask_alisher_rate_limits (updated_at desc);

alter table public.ask_alisher_rate_limits enable row level security;

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
             when window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
             else request_count + 1
           end,
           window_started_at = case
             when window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
             else window_started_at
           end,
           updated_at = v_now
     where key = p_key
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

create table if not exists public.ask_alisher_analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  session_id text,
  language text,
  hostname text,
  page_path text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ask_alisher_analytics_events_created_at_idx
  on public.ask_alisher_analytics_events (created_at desc);

create index if not exists ask_alisher_analytics_events_event_name_idx
  on public.ask_alisher_analytics_events (event_name);

alter table public.ask_alisher_analytics_events enable row level security;
