-- Per Ankh: persistent account activity and privacy-respecting device metadata
-- This migration is additive. It does not delete or rewrite existing sessions/page views.

alter table public.site_sessions
  add column if not exists device_type text,
  add column if not exists browser_name text,
  add column if not exists os_name text,
  add column if not exists device_label text,
  add column if not exists language text;

create table if not exists public.site_account_activity (
  user_id uuid primary key,
  email_snapshot text,
  display_name_snapshot text,
  first_seen_at timestamptz not null default now(),
  last_login_at timestamptz,
  last_logout_at timestamptz,
  last_seen_at timestamptz,
  login_count bigint not null default 0 check (login_count >= 0),
  last_status text not null default 'inactive'
    check (last_status in ('active', 'inactive', 'logged_out')),
  last_session_id uuid,
  last_path text not null default '/',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_account_activity enable row level security;

create index if not exists site_sessions_started_at_idx
  on public.site_sessions (started_at desc);
create index if not exists site_sessions_user_last_seen_idx
  on public.site_sessions (user_id, last_seen desc)
  where user_id is not null;
create index if not exists site_account_activity_last_seen_idx
  on public.site_account_activity (last_seen_at desc);
create index if not exists site_account_activity_status_idx
  on public.site_account_activity (last_status, last_seen_at desc);

-- Preserve a snapshot of existing registered accounts, without exposing them publicly.
insert into public.site_account_activity (
  user_id, email_snapshot, display_name_snapshot, first_seen_at,
  last_login_at, last_seen_at, login_count, last_status, created_at, updated_at
)
select
  u.id,
  u.email,
  coalesce(nullif(p.display_name, ''), nullif(u.raw_user_meta_data->>'display_name', ''), ''),
  coalesce(u.created_at, now()),
  u.last_sign_in_at,
  u.last_sign_in_at,
  case when u.last_sign_in_at is null then 0 else 1 end,
  'inactive',
  now(),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
on conflict (user_id) do nothing;

comment on table public.site_account_activity is
  'Private persistent account activity snapshots for Per Ankh administration. Never readable by anonymous clients.';
comment on column public.site_sessions.device_label is
  'Coarse browser-derived device label only; no IP address, fingerprint, phone contents, or precise device identifiers.';


create or replace function public.record_site_account_login(
  p_user_id uuid, p_email text, p_display_name text,
  p_session_id uuid, p_path text, p_seen_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_account_activity (
    user_id, email_snapshot, display_name_snapshot, first_seen_at,
    last_login_at, last_seen_at, login_count, last_status,
    last_session_id, last_path, created_at, updated_at
  ) values (
    p_user_id, coalesce(p_email,''), coalesce(p_display_name,'عضو بر عنخ'),
    p_seen_at, p_seen_at, p_seen_at, 1, 'active',
    p_session_id, coalesce(p_path,'/'), p_seen_at, p_seen_at
  )
  on conflict (user_id) do update set
    email_snapshot = coalesce(nullif(excluded.email_snapshot,''), public.site_account_activity.email_snapshot),
    display_name_snapshot = coalesce(nullif(excluded.display_name_snapshot,''), public.site_account_activity.display_name_snapshot),
    last_login_at = excluded.last_login_at,
    last_seen_at = excluded.last_seen_at,
    login_count = public.site_account_activity.login_count + 1,
    last_status = 'active',
    last_session_id = excluded.last_session_id,
    last_path = excluded.last_path,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.touch_site_account_activity(
  p_user_id uuid, p_email text, p_display_name text,
  p_session_id uuid, p_path text, p_seen_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_account_activity (
    user_id, email_snapshot, display_name_snapshot, first_seen_at,
    last_seen_at, login_count, last_status, last_session_id,
    last_path, created_at, updated_at
  ) values (
    p_user_id, coalesce(p_email,''), coalesce(p_display_name,'عضو بر عنخ'),
    p_seen_at, p_seen_at, 0, 'active', p_session_id,
    coalesce(p_path,'/'), p_seen_at, p_seen_at
  )
  on conflict (user_id) do update set
    email_snapshot = coalesce(nullif(excluded.email_snapshot,''), public.site_account_activity.email_snapshot),
    display_name_snapshot = coalesce(nullif(excluded.display_name_snapshot,''), public.site_account_activity.display_name_snapshot),
    last_seen_at = excluded.last_seen_at,
    last_status = 'active',
    last_session_id = excluded.last_session_id,
    last_path = excluded.last_path,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.record_site_account_logout(
  p_user_id uuid, p_session_id uuid, p_seen_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_account_activity
  set last_logout_at = p_seen_at,
      last_seen_at = p_seen_at,
      last_status = 'logged_out',
      last_session_id = p_session_id,
      updated_at = p_seen_at
  where user_id = p_user_id;
end;
$$;

revoke all on function public.record_site_account_login(uuid,text,text,uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.touch_site_account_activity(uuid,text,text,uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.record_site_account_logout(uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.record_site_account_login(uuid,text,text,uuid,text,timestamptz) to service_role;
grant execute on function public.touch_site_account_activity(uuid,text,text,uuid,text,timestamptz) to service_role;
grant execute on function public.record_site_account_logout(uuid,uuid,timestamptz) to service_role;


-- Immutable account sign-in/sign-out history; account snapshots remain even if a user later signs out.
create table if not exists public.site_account_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  email_snapshot text,
  display_name_snapshot text,
  event_type text not null check (event_type in ('login', 'logout')),
  session_id uuid,
  event_at timestamptz not null default now(),
  current_path text not null default '/'
);

alter table public.site_account_events enable row level security;
create index if not exists site_account_events_user_event_idx
  on public.site_account_events (user_id, event_at desc);
create index if not exists site_account_events_event_at_idx
  on public.site_account_events (event_at desc);

create or replace function public.record_site_account_login(
  p_user_id uuid, p_email text, p_display_name text,
  p_session_id uuid, p_path text, p_seen_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_account_activity (
    user_id, email_snapshot, display_name_snapshot, first_seen_at,
    last_login_at, last_seen_at, login_count, last_status,
    last_session_id, last_path, created_at, updated_at
  ) values (
    p_user_id, coalesce(p_email,''), coalesce(p_display_name,'عضو بر عنخ'),
    p_seen_at, p_seen_at, p_seen_at, 1, 'active',
    p_session_id, coalesce(p_path,'/'), p_seen_at, p_seen_at
  )
  on conflict (user_id) do update set
    email_snapshot = coalesce(nullif(excluded.email_snapshot,''), public.site_account_activity.email_snapshot),
    display_name_snapshot = coalesce(nullif(excluded.display_name_snapshot,''), public.site_account_activity.display_name_snapshot),
    last_login_at = excluded.last_login_at,
    last_seen_at = excluded.last_seen_at,
    login_count = public.site_account_activity.login_count + 1,
    last_status = 'active',
    last_session_id = excluded.last_session_id,
    last_path = excluded.last_path,
    updated_at = excluded.updated_at;

  insert into public.site_account_events (
    user_id, email_snapshot, display_name_snapshot, event_type, session_id, event_at, current_path
  ) values (
    p_user_id, coalesce(p_email,''), coalesce(p_display_name,'عضو بر عنخ'),
    'login', p_session_id, p_seen_at, coalesce(p_path,'/')
  );
end;
$$;

create or replace function public.record_site_account_logout(
  p_user_id uuid, p_session_id uuid, p_seen_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_account_activity
  set last_logout_at = p_seen_at,
      last_seen_at = p_seen_at,
      last_status = 'logged_out',
      last_session_id = p_session_id,
      updated_at = p_seen_at
  where user_id = p_user_id;

  insert into public.site_account_events (
    user_id, email_snapshot, display_name_snapshot, event_type, session_id, event_at, current_path
  )
  select user_id, email_snapshot, display_name_snapshot, 'logout', p_session_id, p_seen_at, last_path
  from public.site_account_activity
  where user_id = p_user_id;
end;
$$;

revoke all on public.site_account_events from public, anon, authenticated;
revoke all on function public.record_site_account_login(uuid,text,text,uuid,text,timestamptz) from public, anon, authenticated;
revoke all on function public.record_site_account_logout(uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.record_site_account_login(uuid,text,text,uuid,text,timestamptz) to service_role;
grant execute on function public.record_site_account_logout(uuid,uuid,timestamptz) to service_role;
