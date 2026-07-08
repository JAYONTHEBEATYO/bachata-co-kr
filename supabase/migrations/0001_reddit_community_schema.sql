create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  karma integer not null default 0,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  color text not null default '#ff5a3d',
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete restrict,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'Bachata Korea',
  slug text not null,
  title text not null,
  excerpt text not null,
  body text not null,
  flair text not null default '토론',
  link_url text,
  video_id text,
  image_url text,
  source_links jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'removed')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, slug)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'member',
  body text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('thread', 'comment')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  title text not null,
  url text not null,
  host text,
  status text not null default 'active' check (status in ('active', 'needs_review', 'blocked', 'archived')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.ai_drafts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  suggested_community_id uuid references public.communities(id) on delete set null,
  suggested_flair text not null default '토론',
  title text not null,
  summary text not null,
  body text not null,
  confidence text not null default '확인 필요',
  status text not null default 'review' check (status in ('review', 'approved', 'rejected', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

create or replace view public.thread_feed as
select
  t.id,
  t.slug,
  t.title,
  t.excerpt,
  t.body,
  t.flair,
  t.author_name,
  t.created_at,
  t.video_id,
  t.image_url,
  t.source_links,
  t.tags,
  t.status,
  t.pinned,
  c.slug as community_slug,
  c.name as community_name,
  coalesce(sum(case when v.target_type = 'thread' and v.value = 1 then 1 else 0 end), 0)::integer as upvotes,
  coalesce(sum(case when v.target_type = 'thread' and v.value = -1 then 1 else 0 end), 0)::integer as downvotes,
  (
    coalesce(sum(case when v.target_type = 'thread' and v.value = 1 then 1 else 0 end), 0)
    - coalesce(sum(case when v.target_type = 'thread' and v.value = -1 then 1 else 0 end), 0)
  )::integer as score,
  (
    select count(*)::integer
    from public.comments cm
    where cm.thread_id = t.id and cm.status = 'published'
  ) as comment_count
from public.threads t
join public.communities c on c.id = t.community_id
left join public.votes v on v.target_id = t.id
group by t.id, c.slug, c.name;

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.threads enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.sources enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.moderation_logs enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "communities are public" on public.communities for select using (true);
create policy "published threads are public" on public.threads for select using (status = 'published');
create policy "published comments are public" on public.comments for select using (status = 'published');
create policy "authenticated users create threads" on public.threads for insert with check (auth.uid() is not null);
create policy "authenticated users create comments" on public.comments for insert with check (auth.uid() is not null);
create policy "authenticated users vote" on public.votes for insert with check (auth.uid() = user_id);
create policy "authenticated users update their vote" on public.votes for update using (auth.uid() = user_id);
create policy "moderators read sources" on public.sources for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('moderator', 'admin'))
);
create policy "moderators read drafts" on public.ai_drafts for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('moderator', 'admin'))
);
create policy "moderators read logs" on public.moderation_logs for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('moderator', 'admin'))
);

create index if not exists threads_community_created_idx on public.threads (community_id, created_at desc);
create index if not exists threads_status_created_idx on public.threads (status, created_at desc);
create index if not exists comments_thread_created_idx on public.comments (thread_id, created_at asc);
create index if not exists votes_target_idx on public.votes (target_type, target_id);
