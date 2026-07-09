type D1PreparedStatementLike = {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  run: () => Promise<unknown>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatementLike;
};

const safeRun = async (db: D1DatabaseLike, query: string) => {
  try {
    await db.prepare(query).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column|already exists/i.test(message)) throw error;
  }
};

export const ensureCommunityTables = async (db: D1DatabaseLike) => {
  await safeRun(db, `create table if not exists guest_threads (
    id text primary key,
    title text not null,
    body text not null,
    category text not null default 'questions',
    link_url text,
    guest_id text not null,
    ip_prefix text not null default 'private',
    ip_hash text,
    edit_key_hash text not null,
    status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
    score integer not null default 0,
    downvotes integer not null default 0,
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);
  await safeRun(db, "create index if not exists guest_threads_created_idx on guest_threads(created_at desc)");
  await safeRun(db, "create index if not exists guest_threads_category_created_idx on guest_threads(category, created_at desc)");
  await safeRun(db, "create index if not exists guest_threads_status_idx on guest_threads(status)");
  await safeRun(db, "create index if not exists guest_threads_ip_created_idx on guest_threads(ip_hash, created_at)");
  await safeRun(db, "alter table guest_threads add column downvotes integer not null default 0");
  await safeRun(db, "alter table guest_threads add column ip_prefix text not null default 'private'");
  await safeRun(db, "alter table guest_threads add column ip_hash text");

  await safeRun(db, `create table if not exists comments (
    id text primary key,
    thread_id text not null,
    parent_id text,
    author_name text not null default 'anonymous',
    body text not null,
    status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
    score integer not null default 0,
    ip_hash text,
    ip_prefix text,
    author_password_hash text,
    user_agent text,
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`);
  await safeRun(db, "create index if not exists comments_thread_created_idx on comments(thread_id, created_at asc)");
  await safeRun(db, "create index if not exists comments_thread_status_idx on comments(thread_id, status)");
  await safeRun(db, "create index if not exists comments_parent_idx on comments(parent_id)");
  await safeRun(db, "create index if not exists comments_status_idx on comments(status)");
  await safeRun(db, "create index if not exists comments_ip_created_idx on comments(ip_hash, created_at)");
  await safeRun(db, "alter table comments add column ip_prefix text");
  await safeRun(db, "alter table comments add column author_password_hash text");
  await safeRun(db, "alter table comments add column user_agent text");

  await safeRun(db, `create table if not exists comment_votes (
    comment_id text not null,
    ip_hash text not null,
    direction integer not null check(direction in (-1, 1)),
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    primary key (comment_id, ip_hash)
  )`);
  await safeRun(db, "create index if not exists comment_votes_comment_idx on comment_votes(comment_id)");
};
