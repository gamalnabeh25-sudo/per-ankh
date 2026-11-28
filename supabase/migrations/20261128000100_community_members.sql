-- بر عنخ: المجتمع والعضوية — نسخة الأعضاء المسجلين (معتمدة من جمال ٢١:٤١ — ملحق الإصدار ٣)
-- مراجعة ٤ (النسخة النهائية الموحدة): إصلاح لغة دالة _member_name إلى sql، وإصلاح عمود لوحة الصدارة (member_id)، وكل ما في مراجعة ٢: نقاط تعليقات الصفحات،
-- قوائم القراءة بملاحظات خاصة، لوحة صدارة الاختبارات، حماية أعمدة الإدارة على profiles، تسجيل نشاط الاختبار.
-- ملاحظة: avatar_url موجود مسبقًا في profiles — العمود يُترك كما هو (add if not exists).
-- إضافية فقط: لا يتغير أي جدول أو سجل موجود. الأعمدة الجديدة على profiles قيمها الافتراضية لا تؤثر على الحسابات الحالية.
-- وظائف الزوار القديمة (تعليق/إعجاب بكود زائر) تُترك كما هي حتى لا يتعطل الموقع الحالي؛ الكود الجديد ينادي النسخ الجديدة.
-- تُنفَّذ في محرر SQL في Supabase بعد الموافقة فقط.

-- ========== 1) أعمدة الملف الشخصي على جدول الحسابات الموجود ==========
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists avatar_approved boolean not null default false;
alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists leaderboard_excluded boolean not null default false;

-- ربط تعليقات وإعجابات الصفحات بالحساب (صفوف الزوار القديمة تبقى كما هي بقيمة فارغة)
alter table public.page_likes add column if not exists member_id uuid references auth.users(id) on delete cascade;
alter table public.page_comments add column if not exists member_id uuid references auth.users(id) on delete cascade;
create index if not exists page_likes_member_idx on public.page_likes (member_id, page_id);
create unique index if not exists page_likes_member_uniq on public.page_likes (page_id, member_id) where member_id is not null;
create index if not exists page_comments_member_idx on public.page_comments (member_id, created_at desc);

-- بطاقة العضو العامة (الملفات العامة فقط، والصورة بعد موافقة الإدارة)
create or replace view public.community_members_public as
  select id, display_name, bio,
         case when avatar_approved then avatar_url else null end as avatar_url,
         created_at
  from public.profiles
  where is_public = true;
grant select on public.community_members_public to anon, authenticated;

-- ========== 2) جداول المجتمع (جديدة كلها) ==========
create table if not exists public.community_articles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  title text not null,
  body text not null,
  topic text not null default 'عام',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_discussions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_replies (
  id bigint generated always as identity primary key,
  discussion_id uuid not null references public.community_discussions(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('comment','article','discussion','reply')),
  target_id text not null,
  reason text not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- سجل نشاط العضو: ماذا قرأ وأعجب وحفظ (خاص بالعضو وللإدارة)
create table if not exists public.member_activity (
  id bigint generated always as identity primary key,
  member_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('read','like','favorite','comment','article','discussion','reply','quiz')),
  target text not null,
  created_at timestamptz not null default now()
);

-- النقاط: مجمّع كلي + تفصيل يومي لفرض الحدود
create table if not exists public.member_points (
  member_id uuid primary key references auth.users(id) on delete cascade,
  points int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.member_points_daily (
  member_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  category text not null,
  points int not null default 0,
  primary key (member_id, day, category)
);

-- الأوسمة
create table if not exists public.member_badges (
  member_id uuid not null references auth.users(id) on delete cascade,
  badge text not null,
  awarded_at timestamptz not null default now(),
  primary key (member_id, badge)
);

-- قوائم القراءة: حفظ صفحات الموقع مع ملاحظة خاصة (للعضو وحده وللإدارة)
create table if not exists public.member_reading_list (
  member_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null,
  note text not null default '',
  saved_at timestamptz not null default now(),
  primary key (member_id, page_id)
);

create index if not exists community_articles_status_idx on public.community_articles (status, created_at desc);
create index if not exists community_articles_member_idx on public.community_articles (member_id, status, created_at desc);
create index if not exists community_discussions_status_idx on public.community_discussions (status, created_at desc);
create index if not exists community_replies_discussion_idx on public.community_replies (discussion_id, status, created_at);
create index if not exists community_replies_member_idx on public.community_replies (member_id, status, created_at desc);
create index if not exists community_reports_status_idx on public.community_reports (status, created_at desc);
create index if not exists member_activity_member_idx on public.member_activity (member_id, created_at desc);
create index if not exists member_points_points_idx on public.member_points (points desc);

-- ========== 3) صلاحيات القراءة (RLS) ==========
alter table public.community_articles enable row level security;
alter table public.community_discussions enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_reports enable row level security;
alter table public.member_activity enable row level security;
alter table public.member_points enable row level security;
alter table public.member_points_daily enable row level security;
alter table public.member_badges enable row level security;
alter table public.member_reading_list enable row level security;

-- المنشور مقروء للجميع؛ العضو يرى مساهماته بحالتها؛ الإدارة ترى وتعدل كل شيء
drop policy if exists community_articles_read on public.community_articles;
create policy community_articles_read on public.community_articles
  for select to anon, authenticated using (status = 'approved' or auth.uid() = member_id);
drop policy if exists community_discussions_read on public.community_discussions;
create policy community_discussions_read on public.community_discussions
  for select to anon, authenticated using (status = 'approved' or auth.uid() = member_id);
drop policy if exists community_replies_read on public.community_replies;
create policy community_replies_read on public.community_replies
  for select to anon, authenticated using (status = 'approved' or auth.uid() = member_id);

drop policy if exists community_articles_admin on public.community_articles;
create policy community_articles_admin on public.community_articles for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
drop policy if exists community_discussions_admin on public.community_discussions;
create policy community_discussions_admin on public.community_discussions for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
drop policy if exists community_replies_admin on public.community_replies;
create policy community_replies_admin on public.community_replies for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
drop policy if exists community_reports_admin on public.community_reports;
create policy community_reports_admin on public.community_reports for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
drop policy if exists member_activity_admin on public.member_activity;
create policy member_activity_admin on public.member_activity for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- العضو يرى سجل نشاطه ونقاطه وأوسمته؛ نقاط الجميع مقروءة (للوحة الصدارة)
drop policy if exists member_activity_own on public.member_activity;
create policy member_activity_own on public.member_activity
  for select to authenticated using (auth.uid() = member_id);
drop policy if exists member_points_read on public.member_points;
create policy member_points_read on public.member_points
  for select to anon, authenticated using (true);
drop policy if exists member_points_daily_own on public.member_points_daily;
create policy member_points_daily_own on public.member_points_daily
  for select to authenticated using (auth.uid() = member_id);
drop policy if exists member_badges_read on public.member_badges;
create policy member_badges_read on public.member_badges
  for select to anon, authenticated using (true);
drop policy if exists member_reading_list_own on public.member_reading_list;
create policy member_reading_list_own on public.member_reading_list
  for select to authenticated using (auth.uid() = member_id);
drop policy if exists member_reading_list_admin on public.member_reading_list;
create policy member_reading_list_admin on public.member_reading_list for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- الإدارة تدير ملفات الأعضاء (تشمل مراجعة الصور والاستبعاد من اللوحة)
drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- لا كتابة مباشرة من المتصفح في أي جدول جديد
revoke insert, update, delete on public.community_articles from anon, authenticated;
revoke insert, update, delete on public.community_discussions from anon, authenticated;
revoke insert, update, delete on public.community_replies from anon, authenticated;
revoke all on public.community_reports from anon, authenticated;
revoke all on public.member_activity from anon, authenticated;
revoke all on public.member_points from anon, authenticated;
revoke all on public.member_points_daily from anon, authenticated;
revoke all on public.member_badges from anon, authenticated;
revoke insert, update, delete on public.member_reading_list from anon, authenticated;

-- ========== 4) النقاط والأوسمة (خادم فقط) ==========
create or replace function public._award_points(p_member uuid, p_category text, p_points int, p_daily_cap int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_today int;
begin
  if p_member is null or p_points <= 0 then return; end if;
  select coalesce(points, 0) into v_today from public.member_points_daily
  where member_id = p_member and day = current_date and category = p_category;
  v_today := coalesce(v_today, 0);
  if v_today >= p_daily_cap then return; end if;
  p_points := least(p_points, p_daily_cap - v_today);
  insert into public.member_points_daily (member_id, day, category, points)
  values (p_member, current_date, p_category, p_points)
  on conflict (member_id, day, category) do update set points = member_points_daily.points + p_points;
  insert into public.member_points (member_id, points, updated_at)
  values (p_member, p_points, now())
  on conflict (member_id) do update set points = member_points.points + p_points, updated_at = now();
end; $$;
revoke all on function public._award_points(uuid,text,int,int) from public, anon, authenticated;

create or replace function public._check_badges(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_points int; v_articles int; v_replies int; v_published int; v_days int;
begin
  select coalesce(points,0) into v_points from public.member_points where member_id = p_member;
  v_points := coalesce(v_points, 0);
  select count(*) into v_articles from public.community_articles where member_id = p_member and status = 'approved';
  select count(*) into v_replies from public.community_replies where member_id = p_member and status = 'approved';
  select coalesce(count(distinct created_at::date),0) into v_days from public.member_activity where member_id = p_member;
  v_published := v_articles + v_replies
    + (select count(*) from public.community_discussions where member_id = p_member and status = 'approved');
  if v_published >= 1 then
    insert into public.member_badges (member_id, badge) values (p_member, 'وردة اللوتس') on conflict do nothing; end if;
  if v_replies >= 5 then
    insert into public.member_badges (member_id, badge) values (p_member, 'الجعران الذهبي') on conflict do nothing; end if;
  if v_articles >= 1 then
    insert into public.member_badges (member_id, badge) values (p_member, 'ريشة ماعت') on conflict do nothing; end if;
  if v_articles >= 5 then
    insert into public.member_badges (member_id, badge) values (p_member, 'لوحة الكاتب') on conflict do nothing; end if;
  if v_points >= 500 then
    insert into public.member_badges (member_id, badge) values (p_member, 'كبير الكتبة') on conflict do nothing; end if;
  if v_points >= 2000 and v_days >= 30 then
    insert into public.member_badges (member_id, badge) values (p_member, 'حارس بيت الحياة') on conflict do nothing; end if;
end; $$;
revoke all on function public._check_badges(uuid) from public, anon, authenticated;

-- عند موافقة الإدارة على محتوى: احتساب نقاطه وفحص الأوسمة
create or replace function public._on_content_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_id is null then return new; end if; -- تعليقات الزوار القديمة بلا حساب: لا نقاط
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if tg_table_name = 'community_articles' then
      perform public._award_points(new.member_id, 'article', 25, 50);
    elsif tg_table_name = 'community_discussions' then
      perform public._award_points(new.member_id, 'discussion', 10, 30);
    elsif tg_table_name = 'community_replies' then
      perform public._award_points(new.member_id, 'reply', 5, 40);
    elsif tg_table_name = 'page_comments' then
      perform public._award_points(new.member_id, 'comment', 3, 25);
    end if;
    perform public._check_badges(new.member_id);
  end if;
  return new;
end; $$;

drop trigger if exists community_articles_approved on public.community_articles;
create trigger community_articles_approved after update on public.community_articles
  for each row execute function public._on_content_approved();
drop trigger if exists community_discussions_approved on public.community_discussions;
create trigger community_discussions_approved after update on public.community_discussions
  for each row execute function public._on_content_approved();
drop trigger if exists community_replies_approved on public.community_replies;
create trigger community_replies_approved after update on public.community_replies
  for each row execute function public._on_content_approved();

-- نقاط تعليقات الصفحات عند نشرها (زناد جديد على جدول موجود — لا يغير بنيته ولا بياناته)
drop trigger if exists page_comments_approved on public.page_comments;
create trigger page_comments_approved after update on public.page_comments
  for each row execute function public._on_content_approved();

-- حماية أعمدة الإدارة على الملفات: العضو يعدل نبذته وخصوصيته بنفسه،
-- لكن اعتماد الصورة والاستبعاد من اللوحة للإدارة فقط حتى مع صلاحية تعديل الصف
create or replace function public._protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- محرر SQL / مفاتيح الخدمة
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    new.avatar_approved := old.avatar_approved;
    new.leaderboard_excluded := old.leaderboard_excluded;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_admin_columns on public.profiles;
create trigger profiles_protect_admin_columns before update on public.profiles
  for each row execute function public._protect_profile_columns();

-- لوحة الصدارة: أفضل 30 من الملفات العامة غير المستبعدة
create or replace view public.community_leaderboard as
  select p.member_id, pr.display_name,
         case when pr.avatar_approved then pr.avatar_url else null end as avatar_url,
         p.points,
         coalesce((select array_agg(b.badge order by b.awarded_at) from public.member_badges b where b.member_id = p.member_id), '{}') as badges
  from public.member_points p
  join public.profiles pr on pr.id = p.member_id
  where pr.is_public = true and pr.leaderboard_excluded = false
  order by p.points desc
  limit 30;
grant select on public.community_leaderboard to anon, authenticated;

-- لوحة صدارة الاختبارات: مجموع نقاط الاختبار فقط، أفضل 30 من الملفات العامة
create or replace view public.community_quiz_leaderboard as
  select d.member_id, pr.display_name,
         case when pr.avatar_approved then pr.avatar_url else null end as avatar_url,
         sum(d.points)::int as quiz_points
  from public.member_points_daily d
  join public.profiles pr on pr.id = d.member_id
  where d.category in ('quiz_answer','quiz_complete')
    and pr.is_public = true and pr.leaderboard_excluded = false
  group by d.member_id, pr.display_name, pr.avatar_url, pr.avatar_approved
  order by quiz_points desc
  limit 30;
grant select on public.community_quiz_leaderboard to anon, authenticated;

-- ========== 5) وظائف الكتابة (للمسجلين فقط — auth.uid) ==========
create or replace function public._member_name(p_uid uuid)
returns text language sql security definer set search_path = public as $$
  select coalesce(nullif(btrim((select display_name from public.profiles where id = p_uid)), ''), 'عضو بر عنخ');
$$;
revoke all on function public._member_name(uuid) from public, anon, authenticated;

create or replace function public.submit_community_article(p_title text, p_body text, p_topic text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_title text := nullif(btrim(coalesce(p_title,'')), '');
  v_body text := nullif(btrim(coalesce(p_body,'')), '');
  v_topic text := nullif(btrim(coalesce(p_topic,'')), '');
  v_id uuid;
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if v_title is null or length(v_title) < 5 or length(v_title) > 140 then
    raise exception 'طول العنوان غير صالح'; end if;
  if v_body is null or length(v_body) < 50 or length(v_body) > 20000 then
    raise exception 'طول المقال غير صالح'; end if;
  if v_topic is null or length(v_topic) > 30 then raise exception 'تصنيف غير صالح'; end if;
  if v_title ~* '(https?://|www\.)' or v_body ~* '(https?://|www\.)' then
    raise exception 'الروابط غير مسموحة'; end if;
  if (select count(*) from public.community_articles
      where member_id = v_uid and created_at > now() - interval '1 day') >= 2 then
    raise exception 'وصلت للحد الأقصى اليومي للمقالات'; end if;
  insert into public.community_articles (member_id, author_name, title, body, topic)
  values (v_uid, public._member_name(v_uid), v_title, v_body, v_topic)
  returning id into v_id;
  insert into public.member_activity (member_id, kind, target) values (v_uid, 'article', v_id::text);
  return v_id;
end; $$;

create or replace function public.start_community_discussion(p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_title text := nullif(btrim(coalesce(p_title,'')), '');
  v_body text := nullif(btrim(coalesce(p_body,'')), '');
  v_id uuid;
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if v_title is null or length(v_title) < 5 or length(v_title) > 140 then
    raise exception 'طول العنوان غير صالح'; end if;
  if v_body is null or length(v_body) < 3 or length(v_body) > 3000 then
    raise exception 'طول النص غير صالح'; end if;
  if v_title ~* '(https?://|www\.)' or v_body ~* '(https?://|www\.)' then
    raise exception 'الروابط غير مسموحة'; end if;
  if (select count(*) from public.community_discussions
      where member_id = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'وصلت للحد الأقصى اليومي للمناقشات'; end if;
  insert into public.community_discussions (member_id, author_name, title, body)
  values (v_uid, public._member_name(v_uid), v_title, v_body)
  returning id into v_id;
  insert into public.member_activity (member_id, kind, target) values (v_uid, 'discussion', v_id::text);
  return v_id;
end; $$;

create or replace function public.reply_to_discussion(p_discussion_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body,'')), '');
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if v_body is null or length(v_body) < 3 or length(v_body) > 2000 then
    raise exception 'طول الرد غير صالح'; end if;
  if v_body ~* '(https?://|www\.)' then raise exception 'الروابط غير مسموحة'; end if;
  if not exists (select 1 from public.community_discussions
                 where id = p_discussion_id and status = 'approved') then
    raise exception 'المناقشة غير موجودة'; end if;
  if exists (select 1 from public.community_replies
             where member_id = v_uid and created_at > now() - interval '1 minute') then
    raise exception 'مهلة قصيرة بين الردود، جرّب بعد دقيقة'; end if;
  if (select count(*) from public.community_replies
      where member_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'وصلت للحد الأقصى اليومي للردود'; end if;
  insert into public.community_replies (discussion_id, member_id, author_name, body)
  values (p_discussion_id, v_uid, public._member_name(v_uid), v_body);
  insert into public.member_activity (member_id, kind, target) values (v_uid, 'reply', p_discussion_id::text);
end; $$;

create or replace function public.report_community_content(p_target_type text, p_target_id text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason,'')), '');
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_target_type not in ('comment','article','discussion','reply') then
    raise exception 'نوع المحتوى غير صالح'; end if;
  if v_reason is null or length(v_reason) < 3 or length(v_reason) > 500 then
    raise exception 'طول سبب الإبلاغ غير صالح'; end if;
  if (select count(*) from public.community_reports
      where reporter_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'وصلت للحد الأقصى اليومي للبلاغات'; end if;
  insert into public.community_reports (target_type, target_id, reason, reporter_id)
  values (p_target_type, left(coalesce(p_target_id,''), 80), v_reason);
end; $$;

-- ========== 6) تعليقات وإعجابات الصفحات بالحساب (نسخ جديدة — القديمة تبقى لحين نشر الكود) ==========
create or replace function public.toggle_page_like(p_page_id text)
returns table(liked boolean, likes int) language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean;
  v_count int;
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_page_id is null or length(p_page_id) > 200 then raise exception 'معرّف الصفحة غير صالح'; end if;
  select exists(select 1 from public.page_likes l
                where l.page_id = p_page_id and l.member_id = v_uid) into v_exists;
  if v_exists then
    delete from public.page_likes where page_id = p_page_id and member_id = v_uid;
    delete from public.member_activity where member_id = v_uid and kind = 'like' and target = p_page_id;
  else
    insert into public.page_likes (page_id, member_id) values (p_page_id, v_uid) on conflict do nothing;
    insert into public.member_activity (member_id, kind, target) values (v_uid, 'like', p_page_id);
  end if;
  select count(*) into v_count from public.page_likes where page_id = p_page_id;
  return query select (not v_exists), v_count;
end; $$;

create or replace function public.submit_page_comment(p_page_id text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body,'')), '');
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_page_id is null or length(p_page_id) > 200 then raise exception 'معرّف الصفحة غير صالح'; end if;
  if v_body is null or length(v_body) < 3 or length(v_body) > 2000 then
    raise exception 'طول التعليق غير صالح'; end if;
  if v_body ~* '(https?://|www\.)' then raise exception 'الروابط غير مسموحة'; end if;
  if exists (select 1 from public.page_comments
             where member_id = v_uid and created_at > now() - interval '1 minute') then
    raise exception 'مهلة قصيرة بين التعليقات، جرّب بعد دقيقة'; end if;
  if (select count(*) from public.page_comments
      where member_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'وصلت للحد الأقصى اليومي للتعليقات'; end if;
  insert into public.page_comments (page_id, member_id, display_name, body, status)
  values (p_page_id, v_uid, public._member_name(v_uid), v_body, 'pending');
  insert into public.member_activity (member_id, kind, target) values (v_uid, 'comment', p_page_id);
end; $$;

-- نقاط الاختبارات (تناديها الأكاديمية بعد كل اختبار)
create or replace function public.award_quiz_points(p_correct int, p_total int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_correct is null or p_total is null or p_correct < 0 or p_total < 1 or p_correct > p_total or p_total > 100 then
    raise exception 'نتيجة غير صالحة'; end if;
  perform public._award_points(v_uid, 'quiz_answer', p_correct * 2, 40);
  perform public._award_points(v_uid, 'quiz_complete', 5, 15);
  insert into public.member_activity (member_id, kind, target) values (v_uid, 'quiz', p_correct::text || '/' || p_total::text);
  perform public._check_badges(v_uid);
end; $$;

-- تتبع وقت القراءة (نبضة من الصفحة النشطة، حد أقصى ٥ دقائق لكل نبضة)
create or replace function public.track_reading(p_seconds int, p_page_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_sec int;
begin
  if v_uid is null then return; end if;
  v_sec := least(greatest(coalesce(p_seconds, 0), 0), 300);
  if v_sec < 30 then return; end if;
  perform public._award_points(v_uid, 'reading', floor(v_sec / 300.0)::int, 12);
  if p_page_id is not null and length(p_page_id) <= 200 then
    insert into public.member_activity (member_id, kind, target) values (v_uid, 'read', p_page_id);
  end if;
end; $$;

-- قوائم القراءة: حفظ/تحديث ملاحظة، وحذف
create or replace function public.save_reading_item(p_page_id text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_note text := left(coalesce(p_note, ''), 500);
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_page_id is null or length(p_page_id) > 200 then raise exception 'معرّف الصفحة غير صالح'; end if;
  if v_note ~* '(https?://|www\.)' then raise exception 'الروابط غير مسموحة'; end if;
  insert into public.member_reading_list (member_id, page_id, note)
  values (v_uid, p_page_id, v_note)
  on conflict (member_id, page_id) do update set note = excluded.note;
  insert into public.member_activity (member_id, kind, target) values (v_uid, 'favorite', p_page_id);
end; $$;

create or replace function public.remove_reading_item(p_page_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  delete from public.member_reading_list where member_id = v_uid and page_id = p_page_id;
  delete from public.member_activity where member_id = v_uid and kind = 'favorite' and target = p_page_id;
end; $$;

grant execute on function public.submit_community_article(text,text,text) to authenticated;
grant execute on function public.start_community_discussion(text,text) to authenticated;
grant execute on function public.reply_to_discussion(uuid,text) to authenticated;
grant execute on function public.report_community_content(text,text,text) to authenticated;
grant execute on function public.toggle_page_like(text) to authenticated;
grant execute on function public.submit_page_comment(text,text) to authenticated;
grant execute on function public.award_quiz_points(int,int) to authenticated;
grant execute on function public.track_reading(int,text) to authenticated;
grant execute on function public.save_reading_item(text,text) to authenticated;
grant execute on function public.remove_reading_item(text) to authenticated;

-- ========== 7) صور الأعضاء (المخزن مقروء بالرابط، لكن الظهور في الملفات والبطاقات بعد موافقة الإدارة فقط) ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 512000, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists avatars_upload_own on storage.objects;
drop policy if exists avatars_upload_own on storage.objects;
create policy avatars_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ========== 7b) نسخ مصححة من دوال الإعجاب والتعليق والإبلاغ ==========
-- 2) الإبلاغ كان يفشل لأن قيمة معرّف المُبلِّغ كانت ناقصة في الإدراج

create or replace function public.toggle_page_like(p_page_id text)
returns table(liked boolean, likes int) language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean;
  v_count int;
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_page_id is null or length(p_page_id) > 200 then raise exception 'معرّف الصفحة غير صالح'; end if;
  select exists(select 1 from public.page_likes l
                where l.page_id = p_page_id and l.member_id = v_uid) into v_exists;
  if v_exists then
    delete from public.page_likes where page_id = p_page_id and member_id = v_uid;
    delete from public.member_activity where member_id = v_uid and kind = 'like' and target = p_page_id;
  else
    insert into public.page_likes (page_id, member_id, visitor_hash)
    values (p_page_id, v_uid, 'member:' || v_uid::text)
    on conflict do nothing;
    insert into public.member_activity (member_id, kind, target) values (v_uid, 'like', p_page_id);
  end if;
  select count(*) into v_count from public.page_likes where page_id = p_page_id;
  return query select (not v_exists), v_count;
end; $$;

create or replace function public.submit_page_comment(p_page_id text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body,'')), '');
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_page_id is null or length(p_page_id) > 200 then raise exception 'معرّف الصفحة غير صالح'; end if;
  if v_body is null or length(v_body) < 3 or length(v_body) > 2000 then
    raise exception 'طول التعليق غير صالح'; end if;
  if v_body ~* '(https?://|www\.)' then raise exception 'الروابط غير مسموحة'; end if;
  if exists (select 1 from public.page_comments
             where member_id = v_uid and created_at > now() - interval '1 minute') then
    raise exception 'مهلة قصيرة بين التعليقات، جرّب بعد دقيقة'; end if;
  if (select count(*) from public.page_comments
      where member_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'وصلت للحد الأقصى اليومي للتعليقات'; end if;
  insert into public.page_comments (page_id, member_id, display_name, body, status, visitor_hash)
  values (p_page_id, v_uid, public._member_name(v_uid), v_body, 'pending', 'member:' || v_uid::text);
  insert into public.member_activity (member_id, kind, target) values (v_uid, 'comment', p_page_id);
end; $$;

create or replace function public.report_community_content(p_target_type text, p_target_id text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason,'')), '');
begin
  if v_uid is null then raise exception 'يلزم تسجيل الدخول'; end if;
  if p_target_type not in ('comment','article','discussion','reply') then
    raise exception 'نوع المحتوى غير صالح'; end if;
  if v_reason is null or length(v_reason) < 3 or length(v_reason) > 500 then
    raise exception 'طول سبب الإبلاغ غير صالح'; end if;
  if (select count(*) from public.community_reports
      where reporter_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'وصلت للحد الأقصى اليومي للبلاغات'; end if;
  insert into public.community_reports (target_type, target_id, reason, reporter_id)
  values (p_target_type, left(coalesce(p_target_id,''), 80), v_reason, v_uid);
end; $$;

grant execute on function public.toggle_page_like(text) to authenticated;
grant execute on function public.submit_page_comment(text,text) to authenticated;
grant execute on function public.report_community_content(text,text,text) to authenticated;

-- ========== 8) إصلاحات ما بعد الاختبار الحي (28 نوفمبر 2026) ==========
-- (أ) النسخ القديمة من الإعجاب والتعليق بدون حساب: حُذفت بموافقة جمال (واتساب 08:22:58)
drop function if exists public.toggle_page_like(text, text);
drop function if exists public.submit_page_comment(text, text, text, text);

-- (ب) سياسة قراءة على حاوية الصور: ضرورية لرفع الصورة بخيار upsert (كود الموقع) ولحذف العضو لصورته
drop policy if exists avatars_read_own on storage.objects;
create policy avatars_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

