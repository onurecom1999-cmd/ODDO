-- ODDO database: profiles, crews, sessions and progress photos.
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  -- Training days (0 = Sunday … 6 = Saturday), so the crew can see who is due.
  days int[] not null default '{1,3,5}',
  created_at timestamptz not null default now()
);

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  invite_code text not null unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- One crew per person for now; a crew holds at most 6 people (enforced in join_crew).
create table if not exists public.crew_members (
  crew_id uuid not null references public.crews on delete cascade,
  user_id uuid not null unique references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  done_at timestamptz not null default now(),
  workout text not null,
  rescue boolean not null default false,
  sets jsonb not null default '{}'
);
create index if not exists sessions_user_done on public.sessions (user_id, done_at desc);

create or replace function public.my_crew_id() returns uuid
language sql stable security definer set search_path = public as $$
  select crew_id from crew_members where user_id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "profiles: self and crew read" on public.profiles;
create policy "profiles: self and crew read" on public.profiles for select using (
  id = auth.uid() or id in (select user_id from crew_members where crew_id = public.my_crew_id())
);
drop policy if exists "profiles: self write" on public.profiles;
create policy "profiles: self write" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update using (id = auth.uid());

drop policy if exists "crews: members read" on public.crews;
create policy "crews: members read" on public.crews for select using (id = public.my_crew_id());

drop policy if exists "crew_members: crew read" on public.crew_members;
create policy "crew_members: crew read" on public.crew_members for select using (crew_id = public.my_crew_id());

drop policy if exists "sessions: self and crew read" on public.sessions;
create policy "sessions: self and crew read" on public.sessions for select using (
  user_id = auth.uid() or user_id in (select user_id from crew_members where crew_id = public.my_crew_id())
);
drop policy if exists "sessions: self insert" on public.sessions;
create policy "sessions: self insert" on public.sessions for insert with check (user_id = auth.uid());
drop policy if exists "sessions: self delete" on public.sessions;
create policy "sessions: self delete" on public.sessions for delete using (user_id = auth.uid());

-- Crews are created and joined only through these functions, so codes and the size limit hold.
create or replace function public.create_crew(p_name text) returns public.crews
language plpgsql security definer set search_path = public as $$
declare
  c crews;
  code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from crew_members where user_id = auth.uid()) then
    raise exception 'already in a crew';
  end if;
  loop
    -- 6 characters without look-alikes (no 0/O, 1/I/L).
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31) + 1)::int, 1), '')
      into code from generate_series(1, 6);
    exit when not exists (select 1 from crews where invite_code = code);
  end loop;
  insert into crews (name, invite_code, created_by) values (trim(p_name), code, auth.uid()) returning * into c;
  insert into crew_members (crew_id, user_id) values (c.id, auth.uid());
  return c;
end $$;

create or replace function public.join_crew(p_code text) returns public.crews
language plpgsql security definer set search_path = public as $$
declare
  c crews;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from crews where invite_code = upper(trim(p_code));
  if c.id is null then raise exception 'crew not found'; end if;
  if exists (select 1 from crew_members where user_id = auth.uid()) then
    raise exception 'already in a crew';
  end if;
  if (select count(*) from crew_members where crew_id = c.id) >= 6 then
    raise exception 'crew full';
  end if;
  insert into crew_members (crew_id, user_id) values (c.id, auth.uid());
  return c;
end $$;

create or replace function public.leave_crew() returns void
language sql security definer set search_path = public as $$
  delete from crew_members where user_id = auth.uid()
$$;

grant execute on function public.create_crew(text), public.join_crew(text), public.leave_crew(), public.my_crew_id() to authenticated;

-- Progress photos for the Day-One-Film: private, each person only sees their own folder.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
drop policy if exists "photos: own folder" on storage.objects;
create policy "photos: own folder" on storage.objects for all
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
