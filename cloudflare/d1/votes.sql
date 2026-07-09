create table if not exists thread_vote_totals (
  target_type text not null,
  target_id text not null,
  score integer not null default 0,
  downvotes integer not null default 0,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (target_type, target_id)
);

create table if not exists thread_votes (
  target_type text not null,
  target_id text not null,
  ip_hash text not null,
  direction integer not null check(direction in (-1, 1)),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (target_type, target_id, ip_hash)
);

create index if not exists thread_votes_target_idx on thread_votes(target_type, target_id);

create table if not exists comment_votes (
  comment_id text not null,
  ip_hash text not null,
  direction integer not null check(direction in (-1, 1)),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (comment_id, ip_hash)
);

create index if not exists comment_votes_comment_idx on comment_votes(comment_id);
