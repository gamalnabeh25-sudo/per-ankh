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
