create table if not exists comments (
  id text primary key,
  thread_id text not null,
  parent_id text,
  author_name text not null default '익명',
  body text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  score integer not null default 0,
  ip_hash text,
  ip_prefix text,
  author_password_hash text,
  user_agent text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists comments_thread_created_idx on comments(thread_id, created_at asc);
create index if not exists comments_parent_idx on comments(parent_id);
create index if not exists comments_status_idx on comments(status);
create index if not exists comments_ip_created_idx on comments(ip_hash, created_at);
