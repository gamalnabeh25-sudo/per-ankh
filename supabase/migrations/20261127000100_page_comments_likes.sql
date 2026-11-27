-- Per Ankh: per-page comments and likes without accounts (approved by Gamal, WhatsApp 2026-11-27 14:11).
-- Additive only: no existing table is changed. Apply in the Supabase SQL editor.

-- بر عنخ: تعليقات وإعجابات لكل صفحة (بدون حسابات) — إضافة فقط، لا يمس الجداول الحالية

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.page_comments (
  id bigint generated always as identity primary key,
  page_id text not null,               -- مثل: king-001 / site-03 / era-05 / beliefs-creation
  display_name text not null default 'زائر',
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  visitor_hash text not null,          -- كود الزائر مشفّر، لا يظهر لأحد
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_likes (
  page_id text not null,
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  primary key (page_id, visitor_hash)  -- إعجاب واحد فقط لكل زائر لكل صفحة
);

create index if not exists page_comments_page_status_idx
  on public.page_comments (page_id, status, created_at desc);
create index if not exists page_comments_visitor_created_idx
  on public.page_comments (visitor_hash, created_at desc);

alter table public.page_comments enable row level security;
alter table public.page_likes enable row level security;

-- القراءة العامة: التعليقات المعتمدة فقط. لا كتابة مباشرة من المتصفح إطلاقًا.
create policy page_comments_read_approved on public.page_comments
  for select to anon, authenticated
  using (status = 'approved');

-- الإدمن (أنت) يرى كل التعليقات ويغيّر حالتها من لوحة الإدارة
create policy page_comments_admin_all on public.page_comments
  for all to authenticated
  using (exists (select 1 from public.user_roles
                 where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles
                 where user_id = auth.uid() and role = 'admin'));

revoke insert, update, delete on public.page_comments from anon, authenticated;
revoke all on public.page_likes from anon, authenticated;

-- عدّاد الإعجابات لكل صفحة (قراءة عامة)
create or replace view public.page_like_counts as
  select page_id, count(*)::bigint as likes
  from public.page_likes group by page_id;
grant select on public.page_like_counts to anon, authenticated;

-- إرسال تعليق: فحص الطول + منع الروابط + حدود المعدل + منع التكرار
create or replace function public.submit_page_comment(
  p_page_id text, p_display_name text, p_body text, p_visitor text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_hash text := encode(extensions.digest(coalesce(p_visitor,''), 'sha256'), 'hex');
  v_name text := nullif(btrim(coalesce(p_display_name,'')), '');
  v_body text := nullif(btrim(coalesce(p_body,'')), '');
begin
  if p_page_id is null or p_page_id !~ '^[a-z0-9-]{1,80}$' then
    raise exception 'صفحة غير صالحة'; end if;
  if v_body is null or length(v_body) < 3 or length(v_body) > 1000 then
    raise exception 'طول التعليق غير صالح'; end if;
  if v_name is not null and (length(v_name) < 2 or length(v_name) > 40) then
    raise exception 'طول الاسم غير صالح'; end if;
  if v_body ~* '(https?://|www\.|\.com|\.net|\.org)' then
    raise exception 'الروابط غير مسموحة في التعليقات'; end if;
  if exists (select 1 from public.page_comments
             where visitor_hash = v_hash and created_at > now() - interval '1 minute') then
    raise exception 'مهلة قصيرة بين التعليقات، جرّب بعد دقيقة'; end if;
  if (select count(*) from public.page_comments
      where visitor_hash = v_hash and created_at > now() - interval '1 day') >= 10 then
    raise exception 'وصلت للحد الأقصى اليومي للتعليقات'; end if;
  if exists (select 1 from public.page_comments
             where visitor_hash = v_hash and body = v_body
               and created_at > now() - interval '1 day') then
    raise exception 'هذا التعليق مكرر'; end if;
  insert into public.page_comments (page_id, display_name, body, visitor_hash)
  values (p_page_id, coalesce(v_name, 'زائر'), v_body, v_hash);
end; $$;

-- إعجاب / إلغاء إعجاب، ويرجع الحالة والعدد الجديد
create or replace function public.toggle_page_like(p_page_id text, p_visitor text)
returns table(liked boolean, likes bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_hash text := encode(extensions.digest(coalesce(p_visitor,''), 'sha256'), 'hex');
begin
  if p_page_id is null or p_page_id !~ '^[a-z0-9-]{1,80}$' then
    raise exception 'صفحة غير صالحة'; end if;
  if exists (select 1 from public.page_likes
             where page_id = p_page_id and visitor_hash = v_hash) then
    delete from public.page_likes
    where page_id = p_page_id and visitor_hash = v_hash;
  else
    insert into public.page_likes (page_id, visitor_hash) values (p_page_id, v_hash);
  end if;
  return query
    select exists (select 1 from public.page_likes
                   where page_id = p_page_id and visitor_hash = v_hash),
           (select count(*) from public.page_likes where page_id = p_page_id);
end; $$;

revoke all on function public.submit_page_comment(text,text,text,text) from public;
revoke all on function public.toggle_page_like(text,text) from public;
grant execute on function public.submit_page_comment(text,text,text,text) to anon, authenticated;
grant execute on function public.toggle_page_like(text,text) to anon, authenticated;
