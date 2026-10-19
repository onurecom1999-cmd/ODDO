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
create policy "group_messages: group write" on public.group_messages for insert with check (user_id = auth.uid() and public.in_group(group_id));

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
  if (select count(*) from group_members where group_id = g.id) >= 30 then raise exception 'group full'; end if;
  if (select count(*) from group_members where user_id = auth.uid()) >= 10 then raise exception 'too many groups'; end if;
  insert into group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end $$;

create or replace function public.leave_group(p_group uuid) returns void
language sql security definer set search_path = public as $$
  delete from group_members where group_id = p_group and user_id = auth.uid()
$$;

-- Weekly ranking: perfect days and workouts since Monday, from the backups.
create or replace function public.group_week(p_group uuid)
returns table (user_id uuid, name text, streak int, today_done int, today_all int, today_date date)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.streak, p.today_done, p.today_all, p.today_date
  from group_members m join profiles p on p.id = m.user_id
  where m.group_id = p_group and public.in_group(p_group)
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
