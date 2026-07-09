create table if not exists guest_threads (
  id text primary key,
  title text not null,
  body text not null,
  category text not null default 'questions',
  link_url text,
  guest_id text not null,
  ip_prefix text not null default '비공개',
  ip_hash text,
  edit_key_hash text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  score integer not null default 0,
  downvotes integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists guest_threads_created_idx on guest_threads(created_at desc);
create index if not exists guest_threads_category_created_idx on guest_threads(category, created_at desc);
create index if not exists guest_threads_status_idx on guest_threads(status);
create index if not exists guest_threads_ip_created_idx on guest_threads(ip_hash, created_at);
