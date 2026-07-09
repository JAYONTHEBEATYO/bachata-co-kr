create table if not exists thread_awards (
  id text primary key,
  thread_id text not null,
  award_type text not null,
  guest_id text not null,
  ip_hash text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists thread_awards_thread_idx on thread_awards(thread_id, created_at desc);
create index if not exists thread_awards_ip_created_idx on thread_awards(ip_hash, created_at);
