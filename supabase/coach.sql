-- ODDO Coach database: accounts, cloud backup, groups, community and subscriptions.
-- Run once in the Supabase SQL Editor (paste everything, click Run). Safe to re-run.
-- Replaces the old pact schema; it leaves old tables alone.

-- ---------- accounts ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '' check (char_length(name) <= 30),
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists handle text unique check (handle ~ '^[a-z0-9_.]{3,20}$');
alter table public.profiles add column if not exists lang text not null default 'de' check (lang in ('de', 'en', 'tr'));
alter table public.profiles add column if not exists city text check (char_length(city) <= 40);
alter table public.profiles add column if not exists streak int not null default 0;
alter table public.profiles add column if not exists today_done int not null default 0;
alter table public.profiles add column if not exists today_all int not null default 0;
alter table public.profiles add column if not exists today_date date;
alter table public.profiles add column if not exists founder_no int unique;

-- The whole app state as a backup, so a new phone or a reinstall gets everything back.
create table if not exists public.app_state (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Paid plans. Only the payment webhook (service role) writes here.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  tier text not null check (tier in ('pro', 'ultimate')),
  status text not null,
  founder boolean not null default false,
  ls_subscription_id text unique,
  renews_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions add column if not exists ends_at timestamptz;
-- Where the plan was bought: lemonsqueezy (web), apple or google (in the app, through RevenueCat).
alter table public.subscriptions add column if not exists source text not null default 'lemonsqueezy';
alter table public.subscriptions add column if not exists store_id text;

-- ---------- groups ----------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  invite_code text not null unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
-- Friend groups hold 30 people. Challenge groups (campus or gym challenges) that Onur creates hold many more.
alter table public.groups add column if not exists max_members int not null default 30;
create table if not exists public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists public.group_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null default 'text' check (kind in ('text', 'nudge', 'cheer')),
  body text not null check (char_length(body) between 1 and 500),
  to_user uuid references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists group_messages_group on public.group_messages (group_id, created_at desc);

-- ---------- community ----------
create table if not exists public.follows (
  follower uuid not null default auth.uid() references auth.users on delete cascade,
  followee uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create table if not exists public.blocks (
  blocker uuid not null default auth.uid() references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  primary key (blocker, blocked)
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('day', 'run', 'pr', 'photo')),
  -- What the card shows (day number, ticks, km, percentile …), written by the app.
  card jsonb not null default '{}',
  body text check (char_length(body) <= 500),
  image text,
  visibility text not null default 'friends' check (visibility in ('friends', 'public')),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists posts_time on public.posts (created_at desc);
create table if not exists public.likes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (post_id, user_id)
);
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users on delete cascade,
  post_id uuid references public.posts on delete cascade,
  comment_id bigint references public.comments on delete cascade,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

-- ---------- helpers ----------
create or replace function public.in_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid())
$$;
-- People you share a group with or follow count as friends.
create or replace function public.is_friend(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select u = auth.uid()
    or exists (select 1 from follows where follower = auth.uid() and followee = u)
    or exists (select 1 from group_members a join group_members b on a.group_id = b.group_id where a.user_id = auth.uid() and b.user_id = u)
$$;
create or replace function public.blocked_either(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = auth.uid() and blocked = u) or (blocker = u and blocked = auth.uid()))
$$;
create or replace function public.can_see_post(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from posts where id = p and not hidden and not public.blocked_either(user_id) and (visibility = 'public' or public.is_friend(user_id)))
$$;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.app_state enable row level security;
alter table public.subscriptions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- Names, streaks and today's score are what the community and groups show.
drop policy if exists "profiles: self and crew read" on public.profiles;
drop policy if exists "profiles: signed in read" on public.profiles;
create policy "profiles: signed in read" on public.profiles for select to authenticated using (not public.blocked_either(id));
drop policy if exists "profiles: self write" on public.profiles;
create policy "profiles: self write" on public.profiles for insert with check (id = auth.uid() and founder_no is null);
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and founder_no is not distinct from (select founder_no from public.profiles where id = auth.uid()));

drop policy if exists "app_state: own" on public.app_state;
create policy "app_state: own" on public.app_state for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "subscriptions: own read" on public.subscriptions;
create policy "subscriptions: own read" on public.subscriptions for select using (user_id = auth.uid());

drop policy if exists "groups: members read" on public.groups;
create policy "groups: members read" on public.groups for select using (public.in_group(id));
drop policy if exists "group_members: group read" on public.group_members;
create policy "group_members: group read" on public.group_members for select using (public.in_group(group_id));
drop policy if exists "group_messages: group read" on public.group_messages;
create policy "group_messages: group read" on public.group_messages for select using (public.in_group(group_id));
drop policy if exists "group_messages: group write" on public.group_messages;
-- In challenge groups (more than 30 places) only the creator writes.
create policy "group_messages: group write" on public.group_messages for insert with check (
  user_id = auth.uid() and public.in_group(group_id)
  and exists (select 1 from public.groups g where g.id = group_id and (g.max_members <= 30 or g.created_by = auth.uid()))
);

drop policy if exists "follows: read" on public.follows;
create policy "follows: read" on public.follows for select to authenticated using (true);
drop policy if exists "follows: own" on public.follows;
create policy "follows: own" on public.follows for insert with check (follower = auth.uid());
drop policy if exists "follows: own delete" on public.follows;
create policy "follows: own delete" on public.follows for delete using (follower = auth.uid());

drop policy if exists "blocks: own" on public.blocks;
create policy "blocks: own" on public.blocks for all using (blocker = auth.uid()) with check (blocker = auth.uid());

drop policy if exists "posts: visible read" on public.posts;
create policy "posts: visible read" on public.posts for select using (user_id = auth.uid() or public.can_see_post(id));
drop policy if exists "posts: own insert" on public.posts;
create policy "posts: own insert" on public.posts for insert with check (user_id = auth.uid() and not hidden);
drop policy if exists "posts: own delete" on public.posts;
create policy "posts: own delete" on public.posts for delete using (user_id = auth.uid());

drop policy if exists "likes: visible read" on public.likes;
create policy "likes: visible read" on public.likes for select using (public.can_see_post(post_id));
drop policy if exists "likes: own" on public.likes;
create policy "likes: own" on public.likes for insert with check (user_id = auth.uid() and public.can_see_post(post_id));
drop policy if exists "likes: own delete" on public.likes;
create policy "likes: own delete" on public.likes for delete using (user_id = auth.uid());

drop policy if exists "comments: visible read" on public.comments;
create policy "comments: visible read" on public.comments for select using (public.can_see_post(post_id) and not public.blocked_either(user_id));
drop policy if exists "comments: own" on public.comments;
create policy "comments: own" on public.comments for insert with check (user_id = auth.uid() and public.can_see_post(post_id));
drop policy if exists "comments: own or post owner delete" on public.comments;
create policy "comments: own or post owner delete" on public.comments for delete using (
  user_id = auth.uid() or exists (select 1 from posts where id = post_id and posts.user_id = auth.uid())
);

drop policy if exists "reports: own insert" on public.reports;
create policy "reports: own insert" on public.reports for insert with check (reporter = auth.uid());

-- ---------- group functions (codes and the size limit hold) ----------
create or replace function public.create_group(p_name text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g groups; code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from group_members where user_id = auth.uid()) >= 10 then raise exception 'too many groups'; end if;
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '') into code from generate_series(1, 6);
    exit when not exists (select 1 from groups where invite_code = code);
  end loop;
  insert into groups (name, invite_code, created_by) values (trim(p_name), code, auth.uid()) returning * into g;
  insert into group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end $$;

create or replace function public.join_group(p_code text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from groups where invite_code = upper(trim(p_code));
  if g.id is null then raise exception 'group not found'; end if;
  if exists (select 1 from group_members where group_id = g.id and user_id = auth.uid()) then return g; end if;
  if (select count(*) from group_members where group_id = g.id) >= g.max_members then raise exception 'group full'; end if;
  if (select count(*) from group_members where user_id = auth.uid()) >= 10 then raise exception 'too many groups'; end if;
  insert into group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end $$;

create or replace function public.leave_group(p_group uuid) returns void
language sql security definer set search_path = public as $$
  delete from group_members where group_id = p_group and user_id = auth.uid()
$$;

-- Weekly ranking: perfect days and workouts since Monday, from the backups.
-- Big challenge groups return the best 50 by streak, plus the person asking.
create or replace function public.group_week(p_group uuid)
returns table (user_id uuid, name text, streak int, today_done int, today_all int, today_date date)
language sql stable security definer set search_path = public as $$
  (select p.id, p.name, p.streak, p.today_done, p.today_all, p.today_date
   from group_members m join profiles p on p.id = m.user_id
   where m.group_id = p_group and public.in_group(p_group)
   order by p.streak desc, p.today_done desc limit 50)
  union
  select p.id, p.name, p.streak, p.today_done, p.today_all, p.today_date
  from profiles p where p.id = auth.uid() and public.in_group(p_group)
$$;

-- Founder program: the first 100 accounts that claim it get a number.
create or replace function public.claim_founder() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select founder_no into n from profiles where id = auth.uid();
  if n is not null then return n; end if;
  perform pg_advisory_xact_lock(4242);
  select coalesce(max(founder_no), 0) + 1 into n from profiles;
  if n > 100 then return null; end if;
  update profiles set founder_no = n where id = auth.uid();
  return n;
end $$;

grant execute on function public.create_group(text), public.join_group(text), public.leave_group(uuid), public.group_week(uuid),
  public.claim_founder(), public.in_group(uuid), public.is_friend(uuid), public.blocked_either(uuid), public.can_see_post(uuid) to authenticated;

-- ---------- images ----------
-- Progress photos: private, own folder only.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
drop policy if exists "photos: own folder" on storage.objects;
create policy "photos: own folder" on storage.objects for all
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
-- Post images: readable by link (random names), written only into your own folder.
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;
drop policy if exists "posts: own folder write" on storage.objects;
create policy "posts: own folder write" on storage.objects for insert
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "posts: own folder delete" on storage.objects;
create policy "posts: own folder delete" on storage.objects for delete
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- creator templates ----------
-- Onur's library of video templates. Only the analysis is stored (hook, cuts, angles, mood), never the video.
-- Make yourself an admin once (your own login email):
--   insert into public.admins select id from auth.users where email = 'DEINE-EMAIL' on conflict do nothing;
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

create table if not exists public.video_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  template jsonb not null,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);
alter table public.video_templates enable row level security;
drop policy if exists "video_templates: read" on public.video_templates;
create policy "video_templates: read" on public.video_templates for select to authenticated using (true);
drop policy if exists "video_templates: admin write" on public.video_templates;
create policy "video_templates: admin write" on public.video_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant execute on function public.is_admin() to authenticated;

-- ---------- trainers and their clients ----------
-- A trainer shares a code; a client joins with it. Everything goes through the functions below,
-- so the tables themselves stay closed (row level security on, no policies).
create table if not exists public.coaches (
  user_id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  max_clients int not null default 20,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.coach_clients (
  client_id uuid primary key references auth.users on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.coach_plans (
  client_id uuid primary key references auth.users on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  sessions jsonb not null,
  note text not null default '' check (char_length(note) <= 500),
  updated_at timestamptz not null default now()
);
create table if not exists public.coach_messages (
  id bigint generated always as identity primary key,
  coach_id uuid not null references public.coaches on delete cascade,
  client_id uuid not null references auth.users on delete cascade,
  from_coach boolean not null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_pair on public.coach_messages (coach_id, client_id, id);
alter table public.coaches enable row level security;
alter table public.coach_clients enable row level security;
alter table public.coach_plans enable row level security;
alter table public.coach_messages enable row level security;

create or replace function public.is_client_of(p_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from coach_clients where client_id = p_client and coach_id = auth.uid())
$$;

create or replace function public.become_coach(p_name text) returns public.coaches
language plpgsql security definer set search_path = public as $$
declare c coaches; v text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from coaches where user_id = auth.uid();
  if c.user_id is not null then
    update coaches set name = trim(p_name), active = true where user_id = auth.uid() returning * into c;
    return c;
  end if;
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '') into v from generate_series(1, 6);
    exit when not exists (select 1 from coaches where code = v);
  end loop;
  insert into coaches (user_id, name, code) values (auth.uid(), trim(p_name), v) returning * into c;
  return c;
end $$;

-- Everything the app needs at start: my trainer profile, my own trainer and the plan they wrote for me.
create or replace function public.coach_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'coach', (select jsonb_build_object('name', name, 'code', code, 'max', max_clients, 'active', active) from coaches where user_id = auth.uid()),
    'mine', (select jsonb_build_object('id', c.user_id, 'name', c.name, 'active', c.active) from coach_clients k join coaches c on c.user_id = k.coach_id where k.client_id = auth.uid()),
    'plan', (select jsonb_build_object('sessions', p.sessions, 'note', p.note, 'at', p.updated_at) from coach_plans p
             join coach_clients k on k.client_id = p.client_id and k.coach_id = p.coach_id where p.client_id = auth.uid()))
$$;

create or replace function public.join_coach(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c coaches;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from coaches where code = upper(trim(p_code)) and active;
  if c.user_id is null then raise exception 'coach not found'; end if;
  if c.user_id = auth.uid() then raise exception 'own code'; end if;
  if not exists (select 1 from coach_clients where client_id = auth.uid() and coach_id = c.user_id)
     and (select count(*) from coach_clients where coach_id = c.user_id) >= c.max_clients then
    raise exception 'coach full';
  end if;
  insert into coach_clients (client_id, coach_id) values (auth.uid(), c.user_id)
    on conflict (client_id) do update set coach_id = excluded.coach_id, created_at = now();
  return jsonb_build_object('id', c.user_id, 'name', c.name);
end $$;

create or replace function public.leave_coach() returns void
language sql security definer set search_path = public as $$
  delete from coach_clients where client_id = auth.uid();
  delete from coach_plans where client_id = auth.uid();
$$;

create or replace function public.remove_client(p_client uuid) returns void
language sql security definer set search_path = public as $$
  delete from coach_plans where client_id = p_client and coach_id = auth.uid();
  delete from coach_clients where client_id = p_client and coach_id = auth.uid();
$$;

-- The trainer's client list with each client's day and the last backup time.
create or replace function public.coach_overview()
returns table (client_id uuid, name text, streak int, today_done int, today_all int, today_date date, synced_at timestamptz, last_msg timestamptz, last_from_coach boolean)
language sql stable security definer set search_path = public as $$
  select k.client_id, coalesce(p.name, ''), coalesce(p.streak, 0), coalesce(p.today_done, 0), coalesce(p.today_all, 0), p.today_date, s.updated_at,
         m.created_at, m.from_coach
  from coach_clients k
  left join profiles p on p.id = k.client_id
  left join app_state s on s.user_id = k.client_id
  left join lateral (select created_at, from_coach from coach_messages x where x.coach_id = k.coach_id and x.client_id = k.client_id order by id desc limit 1) m on true
  where k.coach_id = auth.uid()
  order by k.created_at
$$;

-- A client's backup (log, plan, progress), only for their own trainer.
create or replace function public.coach_client_state(p_client uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select s.data from app_state s where s.user_id = p_client and public.is_client_of(p_client)
$$;

create or replace function public.set_client_plan(p_client uuid, p_sessions jsonb, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_client_of(p_client) then raise exception 'not your client'; end if;
  if jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) not between 1 and 7 or length(p_sessions::text) > 20000 then
    raise exception 'bad plan';
  end if;
  insert into coach_plans (client_id, coach_id, sessions, note, updated_at)
  values (p_client, auth.uid(), p_sessions, left(coalesce(p_note, ''), 500), now())
  on conflict (client_id) do update set coach_id = excluded.coach_id, sessions = excluded.sessions, note = excluded.note, updated_at = now();
end $$;

-- Chat between a trainer and one client. p_other is the client (for the trainer) or the trainer (for the client).
create or replace function public.coach_chat(p_other uuid)
returns table (id bigint, from_coach boolean, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select m.id, m.from_coach, m.body, m.created_at from coach_messages m
    where (m.coach_id = auth.uid() and m.client_id = p_other and public.is_client_of(p_other))
       or (m.client_id = auth.uid() and m.coach_id = p_other and exists (select 1 from coach_clients where client_id = auth.uid() and coach_id = p_other))
    order by m.id desc limit 100
  ) t order by id
$$;

create or replace function public.coach_send(p_other uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_client_of(p_other) then
    insert into coach_messages (coach_id, client_id, from_coach, body) values (auth.uid(), p_other, true, trim(p_body));
  elsif exists (select 1 from coach_clients where client_id = auth.uid() and coach_id = p_other) then
    insert into coach_messages (coach_id, client_id, from_coach, body) values (p_other, auth.uid(), false, trim(p_body));
  else
    raise exception 'not connected';
  end if;
end $$;

grant execute on function public.is_client_of(uuid), public.become_coach(text), public.coach_me(), public.join_coach(text), public.leave_coach(),
  public.remove_client(uuid), public.coach_overview(), public.coach_client_state(uuid), public.set_client_plan(uuid, jsonb, text),
  public.coach_chat(uuid), public.coach_send(uuid, text) to authenticated;

-- ---------- studios (gyms): members, check-in, crowd, classes ----------
-- An owner creates a studio and shares its code; members join with it. Memberships are paid in the studio;
-- the studio only records until when one is valid. Everything goes through functions, the tables stay closed.
create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  city text not null default '' check (char_length(city) <= 40),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  capacity int not null default 100 check (capacity between 1 and 5000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.studio_staff (
  studio_id uuid not null references public.studios on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'trainer')),
  primary key (studio_id, user_id)
);
create table if not exists public.studio_members (
  studio_id uuid not null references public.studios on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  member_until date,
  joined_at timestamptz not null default now(),
  primary key (studio_id, user_id)
);
create table if not exists public.studio_checkins (
  id bigint generated always as identity primary key,
  studio_id uuid not null references public.studios on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  at timestamptz not null default now(),
  by_user uuid references auth.users on delete set null
);
create index if not exists studio_checkins_time on public.studio_checkins (studio_id, at desc);
-- A member's check-in code: 6 digits, valid for 2 minutes, shown as QR and as digits.
create table if not exists public.studio_passes (
  user_id uuid primary key references auth.users on delete cascade,
  code text not null,
  expires_at timestamptz not null
);
create table if not exists public.studio_classes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  trainer text not null default '' check (char_length(trainer) <= 40),
  starts_at timestamptz not null,
  minutes int not null default 60 check (minutes between 10 and 240),
  capacity int not null default 15 check (capacity between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists studio_classes_time on public.studio_classes (studio_id, starts_at);
create table if not exists public.studio_bookings (
  class_id uuid not null references public.studio_classes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
alter table public.studios enable row level security;
alter table public.studio_staff enable row level security;
alter table public.studio_members enable row level security;
alter table public.studio_checkins enable row level security;
alter table public.studio_passes enable row level security;
alter table public.studio_classes enable row level security;
alter table public.studio_bookings enable row level security;

create or replace function public.is_studio_staff(p_studio uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from studio_staff where studio_id = p_studio and user_id = auth.uid())
$$;
create or replace function public.is_studio_member(p_studio uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from studio_members where studio_id = p_studio and user_id = auth.uid())
$$;
-- People in the studio now: check-ins of the last 90 minutes.
create or replace function public.studio_crowd(p_studio uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(distinct user_id)::int from studio_checkins where studio_id = p_studio and at > now() - interval '90 minutes'
$$;

create or replace function public.create_studio(p_name text, p_city text, p_capacity int) returns public.studios
language plpgsql security definer set search_path = public as $$
declare s studios; v text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from studios where owner = auth.uid()) >= 3 then raise exception 'too many studios'; end if;
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '') into v from generate_series(1, 6);
    exit when not exists (select 1 from studios where code = v) and not exists (select 1 from coaches where code = v);
  end loop;
  insert into studios (owner, name, city, code, capacity)
  values (auth.uid(), trim(p_name), trim(coalesce(p_city, '')), v, greatest(1, least(5000, coalesce(p_capacity, 100)))) returning * into s;
  insert into studio_staff (studio_id, user_id, role) values (s.id, auth.uid(), 'admin');
  return s;
end $$;

create or replace function public.update_studio(p_studio uuid, p_name text, p_city text, p_capacity int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_studio_staff(p_studio) then raise exception 'not staff'; end if;
  update studios set name = trim(p_name), city = trim(coalesce(p_city, '')), capacity = greatest(1, least(5000, p_capacity)) where id = p_studio;
end $$;

create or replace function public.join_studio(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s studios;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into s from studios where code = upper(trim(p_code)) and active;
  if s.id is null then raise exception 'studio not found'; end if;
  if not exists (select 1 from studio_members where studio_id = s.id and user_id = auth.uid())
     and (select count(*) from studio_members where user_id = auth.uid()) >= 3 then raise exception 'too many studios'; end if;
  insert into studio_members (studio_id, user_id) values (s.id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('id', s.id, 'name', s.name);
end $$;

create or replace function public.leave_studio(p_studio uuid) returns void
language sql security definer set search_path = public as $$
  delete from studio_bookings b using studio_classes c where b.class_id = c.id and c.studio_id = p_studio and b.user_id = auth.uid() and c.starts_at > now();
  delete from studio_members where studio_id = p_studio and user_id = auth.uid();
$$;

-- The member's view: each studio with crowd, membership and the classes of the next 7 days.
create or replace function public.studio_home() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name, 'city', s.city, 'capacity', s.capacity, 'crowd', public.studio_crowd(s.id),
    'member_until', m.member_until,
    'last_visit', (select max(at) from studio_checkins c where c.studio_id = s.id and c.user_id = auth.uid()),
    'classes', (select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'title', k.title, 'trainer', k.trainer, 'starts_at', k.starts_at,
                  'minutes', k.minutes, 'capacity', k.capacity,
                  'booked', (select count(*) from studio_bookings b where b.class_id = k.id),
                  'mine', exists (select 1 from studio_bookings b where b.class_id = k.id and b.user_id = auth.uid()))
                  order by k.starts_at), '[]'::jsonb)
                from studio_classes k where k.studio_id = s.id and k.starts_at > now() - interval '30 minutes' and k.starts_at < now() + interval '7 days')
  ) order by m.joined_at), '[]'::jsonb)
  from studio_members m join studios s on s.id = m.studio_id and s.active
  where m.user_id = auth.uid()
$$;

create or replace function public.my_pass() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text; e timestamptz;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select code, expires_at into c, e from studio_passes where user_id = auth.uid() and expires_at > now() + interval '20 seconds';
  if c is null then
    loop
      c := lpad((floor(random() * 1000000))::int::text, 6, '0');
      exit when not exists (select 1 from studio_passes where code = c and expires_at > now());
    end loop;
    e := now() + interval '2 minutes';
    insert into studio_passes (user_id, code, expires_at) values (auth.uid(), c, e)
      on conflict (user_id) do update set code = excluded.code, expires_at = excluded.expires_at;
  end if;
  return jsonb_build_object('code', c, 'expires_at', e);
end $$;

-- Staff checks a member in with the code from their phone (scanned QR or typed digits).
create or replace function public.studio_checkin(p_studio uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid; m studio_members; n text;
begin
  if not public.is_studio_staff(p_studio) then raise exception 'not staff'; end if;
  select user_id into u from studio_passes where code = regexp_replace(p_code, '\D', '', 'g') and expires_at > now();
  if u is null then return jsonb_build_object('status', 'invalid'); end if;
  select coalesce(nullif(name, ''), '?') into n from profiles where id = u;
  select * into m from studio_members where studio_id = p_studio and user_id = u;
  if m.user_id is null then return jsonb_build_object('status', 'not_member', 'name', n); end if;
  if m.member_until is not null and m.member_until < current_date then
    return jsonb_build_object('status', 'expired', 'name', n, 'member_until', m.member_until, 'user_id', u);
  end if;
  if exists (select 1 from studio_checkins where studio_id = p_studio and user_id = u and at > now() - interval '30 minutes') then
    return jsonb_build_object('status', 'already', 'name', n, 'member_until', m.member_until);
  end if;
  insert into studio_checkins (studio_id, user_id, by_user) values (p_studio, u, auth.uid());
  delete from studio_passes where user_id = u;
  return jsonb_build_object('status', 'ok', 'name', n, 'member_until', m.member_until);
end $$;

-- The business side: studios I run, and one studio's numbers.
create or replace function public.my_studios() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'city', s.city, 'code', s.code, 'capacity', s.capacity, 'role', f.role) order by s.created_at), '[]'::jsonb)
  from studio_staff f join studios s on s.id = f.studio_id where f.user_id = auth.uid()
$$;

create or replace function public.studio_overview(p_studio uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_studio_staff(p_studio) then jsonb_build_object(
    'crowd', public.studio_crowd(p_studio),
    'today', (select count(*) from studio_checkins where studio_id = p_studio and at >= date_trunc('day', now())),
    'week', (select count(*) from studio_checkins where studio_id = p_studio and at >= now() - interval '7 days'),
    'members', (select count(*) from studio_members where studio_id = p_studio),
    'expiring', (select count(*) from studio_members where studio_id = p_studio and member_until between current_date and current_date + 7),
    'expired', (select count(*) from studio_members where studio_id = p_studio and member_until < current_date),
    'recent', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
       select jsonb_build_object('name', coalesce(nullif(p.name, ''), '?'), 'at', c.at) x
       from studio_checkins c left join profiles p on p.id = c.user_id
       where c.studio_id = p_studio order by c.at desc limit 8) r)
  ) end
$$;

create or replace function public.studio_member_list(p_studio uuid)
returns table (user_id uuid, name text, member_until date, joined_at timestamptz, last_visit timestamptz, visits_30 int, streak int)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.name, ''), m.member_until, m.joined_at,
         (select max(at) from studio_checkins c where c.studio_id = m.studio_id and c.user_id = m.user_id),
         (select count(*)::int from studio_checkins c where c.studio_id = m.studio_id and c.user_id = m.user_id and c.at > now() - interval '30 days'),
         coalesce(p.streak, 0)
  from studio_members m left join profiles p on p.id = m.user_id
  where m.studio_id = p_studio and public.is_studio_staff(p_studio)
  order by coalesce(p.name, '')
$$;

create or replace function public.studio_set_member_until(p_studio uuid, p_user uuid, p_until date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_studio_staff(p_studio) then raise exception 'not staff'; end if;
  update studio_members set member_until = p_until where studio_id = p_studio and user_id = p_user;
end $$;

create or replace function public.studio_remove_member(p_studio uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_studio_staff(p_studio) then raise exception 'not staff'; end if;
  delete from studio_members where studio_id = p_studio and user_id = p_user;
end $$;

create or replace function public.studio_add_class(p_studio uuid, p_title text, p_trainer text, p_starts timestamptz, p_minutes int, p_capacity int) returns uuid
language plpgsql security definer set search_path = public as $$
declare i uuid;
begin
  if not public.is_studio_staff(p_studio) then raise exception 'not staff'; end if;
  insert into studio_classes (studio_id, title, trainer, starts_at, minutes, capacity)
  values (p_studio, trim(p_title), trim(coalesce(p_trainer, '')), p_starts, p_minutes, p_capacity) returning id into i;
  return i;
end $$;

create or replace function public.studio_delete_class(p_class uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from studio_classes c where c.id = p_class and public.is_studio_staff(c.studio_id);
end $$;

create or replace function public.studio_class_list(p_studio uuid)
returns table (id uuid, title text, trainer text, starts_at timestamptz, minutes int, capacity int, booked int, names text[])
language sql stable security definer set search_path = public as $$
  select k.id, k.title, k.trainer, k.starts_at, k.minutes, k.capacity,
         (select count(*)::int from studio_bookings b where b.class_id = k.id),
         (select coalesce(array_agg(coalesce(nullif(p.name, ''), '?') order by b.created_at), '{}') from studio_bookings b left join profiles p on p.id = b.user_id where b.class_id = k.id)
  from studio_classes k
  where k.studio_id = p_studio and public.is_studio_staff(p_studio) and k.starts_at > now() - interval '1 day' and k.starts_at < now() + interval '14 days'
  order by k.starts_at
$$;

create or replace function public.book_class(p_class uuid) returns void
language plpgsql security definer set search_path = public as $$
declare k studio_classes;
begin
  select * into k from studio_classes where id = p_class for update;
  if k.id is null or not public.is_studio_member(k.studio_id) then raise exception 'not found'; end if;
  if k.starts_at < now() then raise exception 'too late'; end if;
  if exists (select 1 from studio_bookings where class_id = p_class and user_id = auth.uid()) then return; end if;
  if (select count(*) from studio_bookings where class_id = p_class) >= k.capacity then raise exception 'class full'; end if;
  insert into studio_bookings (class_id, user_id) values (p_class, auth.uid());
end $$;

create or replace function public.unbook_class(p_class uuid) returns void
language sql security definer set search_path = public as $$
  delete from studio_bookings where class_id = p_class and user_id = auth.uid()
$$;

grant execute on function public.is_studio_staff(uuid), public.is_studio_member(uuid), public.studio_crowd(uuid),
  public.create_studio(text, text, int), public.update_studio(uuid, text, text, int), public.join_studio(text), public.leave_studio(uuid),
  public.studio_home(), public.my_pass(), public.studio_checkin(uuid, text), public.my_studios(), public.studio_overview(uuid),
  public.studio_member_list(uuid), public.studio_set_member_until(uuid, uuid, date), public.studio_remove_member(uuid, uuid),
  public.studio_add_class(uuid, text, text, timestamptz, int, int), public.studio_delete_class(uuid), public.studio_class_list(uuid),
  public.book_class(uuid), public.unbook_class(uuid) to authenticated;

-- ---------- partner program: everyone earns a share of what the people they bring in pay ----------
-- Whoever brings a person in first (trainer code, studio code or a friend's invite code) is that person's partner for good.
-- The person gets Pro free for 30 days; after that, the partner earns a share of every payment, for as long as they pay.
-- Shares: the first 20 trainers and studios 50 % for their first 6 months, then by paying clients 30 % (1-9), 35 % (10-49), 40 % (50+).
-- Clips: people who post about ODDO are also paid per 1,000 views once Onur has checked the clip (see clips below).
-- Amounts are in US cents: Lemon Squeezy and RevenueCat both report USD. Only the payment webhooks write commissions.
create table if not exists public.partners (
  user_id uuid primary key references auth.users on delete cascade,
  founding boolean not null default false,
  payout text not null default '' check (char_length(payout) <= 200),
  created_at timestamptz not null default now()
);
-- A free Pro month for the person who invited a friend, added when that friend pays for the first time.
alter table public.partners add column if not exists bonus_until timestamptz;
create table if not exists public.referrals (
  user_id uuid primary key references auth.users on delete cascade,
  partner_id uuid not null references auth.users on delete cascade,
  kind text not null,
  free_until timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  check (user_id <> partner_id)
);
create index if not exists referrals_partner on public.referrals (partner_id);
alter table public.referrals drop constraint if exists referrals_kind_check;
alter table public.referrals add constraint referrals_kind_check check (kind in ('coach', 'studio', 'friend'));
-- Every person's own invite code (7 letters and digits, so it never looks like a 6-digit trainer or studio code).
create table if not exists public.invite_codes (
  user_id uuid primary key references auth.users on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{7}$'),
  created_at timestamptz not null default now()
);
alter table public.invite_codes enable row level security;
-- When the reminder email before the end of the free month went out.
alter table public.referrals add column if not exists reminded_at timestamptz;
create table if not exists public.commissions (
  id bigint generated always as identity primary key,
  partner_id uuid not null references auth.users on delete cascade,
  user_id uuid references auth.users on delete set null,
  event_key text not null unique,
  source text not null,
  net_cents int not null,
  rate numeric(4, 2) not null,
  amount_cents int not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'void', 'paid')),
  created_at timestamptz not null default now(),
  -- 30 days to cover refunds before the money can be paid out.
  available_at timestamptz not null default now() + interval '30 days',
  paid_at timestamptz
);
create index if not exists commissions_partner on public.commissions (partner_id, created_at desc);
alter table public.partners enable row level security;
alter table public.referrals enable row level security;
alter table public.commissions enable row level security;

create or replace function public.add_partner(p uuid) returns void
language sql security definer set search_path = public as $$
  insert into partners (user_id, founding) values (p, (select count(*) from partners) < 20) on conflict do nothing
$$;
create or replace function public.on_coach_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform public.add_partner(new.user_id); return new; end $$;
create or replace function public.on_studio_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform public.add_partner(new.owner); return new; end $$;
create or replace function public.on_client_joined() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into referrals (user_id, partner_id, kind) values (new.client_id, new.coach_id, 'coach') on conflict do nothing;
  return new;
end $$;
create or replace function public.on_member_joined() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  select owner into o from studios where id = new.studio_id;
  if o is not null and o <> new.user_id then
    insert into referrals (user_id, partner_id, kind) values (new.user_id, o, 'studio') on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists partner_coach on public.coaches;
create trigger partner_coach after insert on public.coaches for each row execute function public.on_coach_created();
drop trigger if exists partner_studio on public.studios;
create trigger partner_studio after insert on public.studios for each row execute function public.on_studio_created();
drop trigger if exists referral_client on public.coach_clients;
create trigger referral_client after insert or update of coach_id on public.coach_clients for each row execute function public.on_client_joined();
drop trigger if exists referral_member on public.studio_members;
create trigger referral_member after insert on public.studio_members for each row execute function public.on_member_joined();

-- Trainers, studios and their people from before the partner program.
insert into partners (user_id, founding, created_at)
  select u, false, min(at) from (select user_id u, created_at at from coaches union all select owner, created_at from studios) x group by u
  on conflict do nothing;
update partners set founding = true where user_id in (select user_id from partners order by created_at limit 20) and not founding
  and (select count(*) from partners where founding) < 20;
insert into referrals (user_id, partner_id, kind, created_at) select client_id, coach_id, 'coach', created_at from coach_clients on conflict do nothing;
insert into referrals (user_id, partner_id, kind, created_at)
  select m.user_id, s.owner, 'studio', m.joined_at from studio_members m join studios s on s.id = m.studio_id where s.owner <> m.user_id
  on conflict do nothing;

create or replace function public.sub_live(s subscriptions) returns boolean
language sql stable as $$
  select s.status in ('on_trial', 'active', 'past_due') or (s.status = 'cancelled' and s.ends_at > now())
$$;
create or replace function public.partner_active(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from coaches where user_id = p and active) or exists (select 1 from studios where owner = p and active)
      or exists (select 1 from invite_codes where user_id = p)
$$;
create or replace function public.partner_paying(p uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from referrals r join subscriptions s on s.user_id = r.user_id where r.partner_id = p and public.sub_live(s)
$$;
create or replace function public.partner_rate(p uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select case when pa.founding and pa.created_at > now() - interval '6 months' then 0.50
              when n >= 50 then 0.40 when n >= 10 then 0.35 else 0.30 end
  from partners pa, lateral (select public.partner_paying(p) n) x where pa.user_id = p
$$;

-- Called by the payment webhooks for each paid invoice. Returns the commission in cents (0 when none is due).
create or replace function public.credit_commission(p_user uuid, p_key text, p_source text, p_net_cents int, p_currency text) returns int
language plpgsql security definer set search_path = public as $$
declare r referrals; rate numeric; amt int;
begin
  select * into r from referrals where user_id = p_user;
  if r.user_id is null or p_net_cents <= 0 or not public.partner_active(r.partner_id) then return 0; end if;
  perform public.add_partner(r.partner_id);
  rate := public.partner_rate(r.partner_id);
  insert into commissions (partner_id, user_id, event_key, source, net_cents, rate, amount_cents, currency)
    values (r.partner_id, p_user, p_key, p_source, p_net_cents, rate, floor(p_net_cents * rate), upper(coalesce(p_currency, 'USD')))
    on conflict (event_key) do nothing returning amount_cents into amt;
  -- A friend's first payment also gives the person who invited them a free Pro month.
  if amt is not null and r.kind = 'friend'
     and (select count(*) from commissions where user_id = p_user and source <> 'clip') = 1 then
    update partners set bonus_until = greatest(coalesce(bonus_until, now()), now()) + interval '30 days' where user_id = r.partner_id;
  end if;
  return coalesce(amt, 0);
end $$;
-- A refunded payment takes its commission back, unless it was already paid out.
create or replace function public.void_commission(p_key text) returns void
language sql security definer set search_path = public as $$
  update commissions set status = 'void' where event_key = p_key and status = 'pending'
$$;

-- Every new person gets one Pro week for free, without a card. Nothing is charged afterwards: Free simply continues.
create table if not exists public.pro_trials (
  user_id uuid primary key references auth.users on delete cascade,
  until timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.pro_trials enable row level security;
-- Starts the Pro week once per account and returns when it ends.
create or replace function public.start_trial() returns timestamptz
language sql security definer set search_path = public as $$
  insert into pro_trials (user_id, until) select auth.uid(), now() + interval '7 days' where auth.uid() is not null
  on conflict (user_id) do nothing;
  select until from pro_trials where user_id = auth.uid();
$$;
revoke execute on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

-- What the app needs about a person's free Pro: as a partner, in the free month after joining one, or in the Pro week.
create or replace function public.partner_perks() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'partner', exists (select 1 from coaches where user_id = auth.uid() and active)
               or exists (select 1 from studio_staff t join studios s on s.id = t.studio_id and s.active where t.user_id = auth.uid()),
    'free_until', (select max(u) from (select free_until u from referrals where user_id = auth.uid()
                   union all select bonus_until from partners where user_id = auth.uid()
                   union all select until from pro_trials where user_id = auth.uid()) x where u > now()),
    'via', (select coalesce((select name from coaches where user_id = r.partner_id and r.kind = 'coach'),
                            (select name from studios where owner = r.partner_id and r.kind = 'studio' order by created_at limit 1),
                            (select name from profiles where id = r.partner_id and r.kind = 'friend'))
            from referrals r where r.user_id = auth.uid() and r.free_until > now()),
    'bonus', exists (select 1 from partners where user_id = auth.uid() and bonus_until > now()),
    'week', exists (select 1 from pro_trials where user_id = auth.uid() and until > now()),
    'week_over', exists (select 1 from pro_trials where user_id = auth.uid() and until <= now()))
$$;

-- The partner's earnings page.
create or replace function public.partner_earnings() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'founding', pa.founding and pa.created_at > now() - interval '6 months',
    'founding_until', case when pa.founding then pa.created_at + interval '6 months' end,
    'rate', public.partner_rate(pa.user_id),
    'paying', public.partner_paying(pa.user_id),
    'trial', (select count(*) from referrals r where r.partner_id = pa.user_id and r.free_until > now()
              and not exists (select 1 from subscriptions s where s.user_id = r.user_id and public.sub_live(s))),
    'people', (select count(*) from referrals r where r.partner_id = pa.user_id),
    'month_cents', (select coalesce(sum(amount_cents), 0) from commissions c where c.partner_id = pa.user_id and c.status <> 'void'
                    and c.created_at >= date_trunc('month', now())),
    'pending_cents', (select coalesce(sum(amount_cents), 0) from commissions c where c.partner_id = pa.user_id and c.status = 'pending' and c.available_at > now()),
    'available_cents', (select coalesce(sum(amount_cents), 0) from commissions c where c.partner_id = pa.user_id and c.status = 'pending' and c.available_at <= now()),
    'paid_cents', (select coalesce(sum(amount_cents), 0) from commissions c where c.partner_id = pa.user_id and c.status = 'paid'),
    'payout', pa.payout,
    'recent', (select coalesce(jsonb_agg(x order by x.at desc), '[]'::jsonb) from (
                 select case when c.source = 'clip' then 'clip' else coalesce(nullif(p.name, ''), '?') end as name, c.source = 'clip' as clip,
                        c.amount_cents as cents, c.currency, c.status, c.created_at as at,
                        c.available_at <= now() as ready
                 from commissions c left join profiles p on p.id = c.user_id
                 where c.partner_id = pa.user_id order by c.created_at desc limit 20) x))
  from partners pa where pa.user_id = auth.uid()
$$;

create or replace function public.set_payout(p_text text) returns void
language sql security definer set search_path = public as $$
  update partners set payout = left(trim(p_text), 200) where user_id = auth.uid()
$$;

-- For Onur: who is owed money this month, and marking it paid after the transfer.
create or replace function public.admin_payouts()
returns table (partner_id uuid, name text, payout text, available_cents int, pending_cents int, paid_cents int)
language sql stable security definer set search_path = public as $$
  select pa.user_id,
         coalesce((select name from coaches where user_id = pa.user_id), (select name from studios where owner = pa.user_id order by created_at limit 1),
                  (select name from profiles where id = pa.user_id), ''),
         pa.payout,
         coalesce(sum(c.amount_cents) filter (where c.status = 'pending' and c.available_at <= now()), 0)::int,
         coalesce(sum(c.amount_cents) filter (where c.status = 'pending' and c.available_at > now()), 0)::int,
         coalesce(sum(c.amount_cents) filter (where c.status = 'paid'), 0)::int
  from partners pa left join commissions c on c.partner_id = pa.user_id
  where public.is_admin()
  group by pa.user_id, pa.payout
  having coalesce(sum(c.amount_cents) filter (where c.status <> 'void'), 0) > 0
  order by 4 desc
$$;
create or replace function public.admin_mark_paid(p_partner uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  update commissions set status = 'paid', paid_at = now() where partner_id = p_partner and status = 'pending' and available_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- invite codes: every person can bring friends in and earn the same share ----------
-- The person's own code, made on first use. Becoming a partner this way never counts toward the 20 founding places.
create or replace function public.my_invite() returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text; tries int := 0;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select code into c from invite_codes where user_id = auth.uid();
  while c is null loop
    tries := tries + 1;
    if tries > 20 then raise exception 'no code'; end if;
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 7));
    begin
      insert into invite_codes (user_id, code) values (auth.uid(), c);
    exception when unique_violation then
      -- Someone else has this code (try again), or a parallel call already made this person's code.
      select code into c from invite_codes where user_id = auth.uid();
    end;
  end loop;
  insert into partners (user_id, founding) values (auth.uid(), false) on conflict do nothing;
  return jsonb_build_object('code', c);
end $$;

-- A friend's code: one free Pro month, and the friend earns a share of what this person pays later.
-- Only for people without a partner yet and without a paid plan, so nobody switches codes to game it.
create or replace function public.redeem_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o uuid; n text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select user_id into o from invite_codes where code = upper(trim(p_code));
  if o is null then raise exception 'code not found'; end if;
  if o = auth.uid() then raise exception 'own code'; end if;
  if exists (select 1 from referrals where user_id = auth.uid()) then raise exception 'already referred'; end if;
  if exists (select 1 from subscriptions s where s.user_id = auth.uid() and public.sub_live(s)) then raise exception 'already paying'; end if;
  insert into referrals (user_id, partner_id, kind) values (auth.uid(), o, 'friend');
  -- Give a week, get a week: the inviter gets 7 more days of Pro for each of their first 12 friends.
  if (select count(*) from referrals where partner_id = o and kind = 'friend') <= 12 then
    insert into pro_trials (user_id, until) values (o, now() + interval '7 days')
    on conflict (user_id) do update set until = greatest(pro_trials.until, now()) + interval '7 days';
  end if;
  select name into n from profiles where id = o;
  return jsonb_build_object('name', coalesce(n, ''));
end $$;

-- ---------- clips: paid per 1,000 views ----------
-- People submit the link; Onur checks it about 7 days after posting and enters the views. The payout then waits 30 days
-- like any commission (a clip deleted before then is taken back). Rates in US cents per 1,000 views, like all payouts:
-- 110 (about 1 euro), 45 for Turkish audiences; +50 % when the app is shown in use; from 5,000 views; at most 33,000 per clip.
create table if not exists public.clips (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  url text not null unique check (url ~* '^https://([a-z0-9-]+\.)*(tiktok\.com|instagram\.com|youtube\.com|youtu\.be)/'),
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  views int,
  turkish boolean not null default false,
  app_use boolean not null default false,
  amount_cents int not null default 0,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists clips_user on public.clips (user_id, created_at desc);
create index if not exists clips_open on public.clips (status, created_at) where status = 'submitted';
alter table public.clips enable row level security;

create or replace function public.submit_clip(p_url text) returns public.clips
language plpgsql security definer set search_path = public as $$
declare r public.clips; u text := trim(p_url);
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select count(*) from clips where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then raise exception 'too many'; end if;
  if exists (select 1 from clips where url = u) then raise exception 'already submitted'; end if;
  perform public.my_invite();
  insert into clips (user_id, url) values (auth.uid(), u) returning * into r;
  return r;
end $$;

create or replace function public.my_clips() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'url', url, 'status', status, 'views', views, 'cents', amount_cents,
                                                'note', note, 'at', created_at) order by created_at desc), '[]'::jsonb)
  from (select * from clips where user_id = auth.uid() order by created_at desc limit 30) c
$$;

create or replace function public.admin_clips() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'url', c.url, 'name', coalesce(p.name, ''), 'at', c.created_at,
           'month_cents', (select coalesce(sum(amount_cents), 0) from clips x where x.user_id = c.user_id and x.status = 'approved'
                           and x.decided_at >= date_trunc('month', now())))
         order by c.created_at), '[]'::jsonb)
  from clips c left join profiles p on p.id = c.user_id
  where public.is_admin() and c.status = 'submitted'
$$;

-- Onur enters the views after checking the clip. Returns the amount credited in cents (0 when rejected or under 5,000 views).
create or replace function public.admin_rate_clip(p_id bigint, p_views int, p_turkish boolean, p_app_use boolean, p_ok boolean, p_note text default '')
returns int
language plpgsql security definer set search_path = public as $$
declare c public.clips; amt int := 0; month int;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  select * into c from clips where id = p_id for update;
  if c.id is null or c.status <> 'submitted' then raise exception 'not open'; end if;
  if p_ok and coalesce(p_views, 0) >= 5000 then
    amt := floor(p_views / 1000.0 * (case when p_turkish then 45 else 110 end) * (case when p_app_use then 1.5 else 1 end));
    amt := least(amt, 33000);
    -- At most 110,000 cents (about 1,000 euros) per person and month; more needs a separate deal.
    select coalesce(sum(amount_cents), 0) into month from clips where user_id = c.user_id and status = 'approved' and decided_at >= date_trunc('month', now());
    amt := greatest(0, least(amt, 110000 - month));
  end if;
  update clips set status = case when p_ok and amt > 0 then 'approved' else 'rejected' end, views = p_views, turkish = coalesce(p_turkish, false),
         app_use = coalesce(p_app_use, false), amount_cents = amt, note = left(coalesce(p_note, ''), 200), decided_at = now()
   where id = p_id;
  if amt > 0 then
    insert into partners (user_id, founding) values (c.user_id, false) on conflict do nothing;
    insert into commissions (partner_id, user_id, event_key, source, net_cents, rate, amount_cents, currency)
      values (c.user_id, null, 'clip:' || c.id, 'clip', 0, 0, amt, 'USD');
  end if;
  return amt;
end $$;

-- Taking back a clip deleted within 30 days (before its money was paid out).
create or replace function public.admin_void_clip(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  update commissions set status = 'void' where event_key = 'clip:' || p_id and status = 'pending';
  update clips set status = 'rejected', note = 'deleted' where id = p_id;
end $$;

revoke execute on function public.my_invite(), public.redeem_invite(text), public.submit_clip(text), public.my_clips(), public.admin_clips(),
  public.admin_rate_clip(bigint, int, boolean, boolean, boolean, text), public.admin_void_clip(bigint) from public, anon;
grant execute on function public.my_invite(), public.redeem_invite(text), public.submit_clip(text), public.my_clips(), public.admin_clips(),
  public.admin_rate_clip(bigint, int, boolean, boolean, boolean, text), public.admin_void_clip(bigint) to authenticated;

revoke execute on function public.add_partner(uuid), public.credit_commission(uuid, text, text, int, text), public.void_commission(text),
  public.partner_paying(uuid), public.partner_rate(uuid), public.partner_active(uuid) from public, anon, authenticated;
grant execute on function public.credit_commission(uuid, text, text, int, text), public.void_commission(text) to service_role;
grant execute on function public.partner_perks(), public.partner_earnings(), public.set_payout(text), public.admin_payouts(),
  public.admin_mark_paid(uuid) to authenticated;

-- ODDO's own product list: packaged food people added because Open Food Facts did not know its barcode.
-- Everyone can read it; the next person scanning the same barcode finds it straight away.
create table if not exists public.products (
  code text primary key check (code ~ '^[0-9]{8,14}$'),
  name text not null check (length(name) between 1 and 80),
  brand text not null default '' check (length(brand) <= 60),
  kcal100 numeric not null check (kcal100 between 0 and 950),
  protein100 numeric not null default 0 check (protein100 between 0 and 100),
  serving int check (serving between 1 and 2000),
  added_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (true);
-- Who added a product stays private: only the product columns are readable.
revoke select on public.products from anon, authenticated;
grant select (code, name, brand, kcal100, protein100, serving, created_at, updated_at) on public.products to anon, authenticated;

-- Adds a product, or corrects one the same person added before. Someone else's entry stays as it is.
create or replace function public.add_product(p_code text, p_name text, p_brand text, p_kcal numeric, p_protein numeric, p_serving int)
returns public.products
language plpgsql security definer set search_path = public as $$
declare r public.products;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into products(code, name, brand, kcal100, protein100, serving, added_by)
  values (p_code, left(trim(p_name), 80), left(trim(coalesce(p_brand, '')), 60), round(p_kcal), round(coalesce(p_protein, 0), 1),
          nullif(p_serving, 0), auth.uid())
  on conflict (code) do update set name = excluded.name, brand = excluded.brand, kcal100 = excluded.kcal100,
    protein100 = excluded.protein100, serving = excluded.serving, updated_at = now()
    where products.added_by = auth.uid()
  returning * into r;
  if r.code is null then select * into r from products where code = p_code; end if;
  return r;
end $$;
revoke execute on function public.add_product(text, text, text, numeric, numeric, int) from public, anon;
grant execute on function public.add_product(text, text, text, numeric, numeric, int) to authenticated;

-- How many of the 100 founder places are still free. Counts every founder subscription ever started, so a
-- place stays taken after cancelling. Readable without an account, for the landing page too.
create or replace function public.founder_left() returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, 100 - (select count(*) from subscriptions where founder)::int)
$$;
grant execute on function public.founder_left() to anon, authenticated;

-- Onur's growth numbers: new accounts, where they came from, trials, paying people and the best inviters.
create or replace function public.admin_growth() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return jsonb_build_object(
    'users_1', (select count(*) from auth.users where created_at > now() - interval '1 day'),
    'users_7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'users_all', (select count(*) from auth.users),
    'friends_30', (select count(*) from public.referrals where kind = 'friend' and created_at > now() - interval '30 days'),
    'partners_30', (select count(*) from public.referrals where kind in ('coach', 'studio') and created_at > now() - interval '30 days'),
    'trials_30', (select count(*) from public.pro_trials where created_at > now() - interval '30 days'),
    'paying', (select count(*) from public.subscriptions s where public.sub_live(s)),
    'founder_left', public.founder_left(),
    'clip_views_30', (select coalesce(sum(views), 0) from public.clips where status = 'approved' and decided_at > now() - interval '30 days'),
    'top', (select coalesce(jsonb_agg(x), '[]') from (
      select coalesce(nullif(p.name, ''), '?') as name, count(*) as n from public.referrals r left join public.profiles p on p.id = r.partner_id
      where r.created_at > now() - interval '30 days' group by r.partner_id, p.name order by n desc limit 5) x));
end $$;
revoke execute on function public.admin_growth() from public, anon;
grant execute on function public.admin_growth() to authenticated;


-- A challenge group for a campus or gym: like a friend group, but for up to p_max people. Only Onur creates them.
create or replace function public.admin_challenge(p_name text, p_max int) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g groups; code text;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '') into code from generate_series(1, 6);
    exit when not exists (select 1 from groups where invite_code = code);
  end loop;
  insert into groups (name, invite_code, created_by, max_members) values (trim(p_name), code, auth.uid(), least(greatest(p_max, 30), 10000)) returning * into g;
  insert into group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end $$;
revoke execute on function public.admin_challenge(text, int) from public, anon;
grant execute on function public.admin_challenge(text, int) to authenticated;
