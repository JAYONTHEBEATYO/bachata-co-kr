CREATE TABLE IF NOT EXISTS guest_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'questions',
  link_url TEXT,
  guest_id TEXT NOT NULL,
  ip_prefix TEXT NOT NULL DEFAULT '비공개',
  ip_hash TEXT,
  edit_key_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  score INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS guest_threads_created_idx ON guest_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS guest_threads_category_created_idx ON guest_threads(category, created_at DESC);
CREATE INDEX IF NOT EXISTS guest_threads_status_idx ON guest_threads(status);
CREATE INDEX IF NOT EXISTS guest_threads_ip_created_idx ON guest_threads(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  parent_id TEXT,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  score INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  ip_prefix TEXT,
  author_password_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS comments_thread_created_idx ON comments(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS comments_thread_status_idx ON comments(thread_id, status);
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments(parent_id);
CREATE INDEX IF NOT EXISTS comments_status_idx ON comments(status);
CREATE INDEX IF NOT EXISTS comments_ip_created_idx ON comments(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS comment_votes (
  comment_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  direction INTEGER NOT NULL CHECK(direction IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (comment_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS comment_votes_comment_idx ON comment_votes(comment_id);

CREATE TABLE IF NOT EXISTS thread_vote_totals (
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (target_type, target_id)
);

CREATE TABLE IF NOT EXISTS thread_votes (
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  direction INTEGER NOT NULL CHECK(direction IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (target_type, target_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS thread_votes_target_idx ON thread_votes(target_type, target_id);

CREATE TABLE IF NOT EXISTS thread_awards (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  award_type TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS thread_awards_thread_idx ON thread_awards(thread_id);
CREATE INDEX IF NOT EXISTS thread_awards_ip_created_idx ON thread_awards(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK(target_type IN ('thread', 'guestThread', 'comment')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  detail TEXT,
  reporter_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS reports_target_idx ON reports(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS reports_reporter_created_idx ON reports(reporter_hash, created_at);

CREATE TABLE IF NOT EXISTS upload_events (
  id TEXT PRIMARY KEY,
  uploader_hash TEXT NOT NULL,
  object_key TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS upload_events_hash_created_idx ON upload_events(uploader_hash, created_at);
