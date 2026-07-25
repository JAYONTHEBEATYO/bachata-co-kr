CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN (0, 1)),
  display_name TEXT NOT NULL,
  handle TEXT NOT NULL,
  avatar_url TEXT,
  avatar_preset TEXT NOT NULL DEFAULT 'bachata-step',
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  dance_years INTEGER,
  preferred_styles TEXT NOT NULL DEFAULT '[]',
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member', 'moderator', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users(google_sub);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_idx ON users(handle);
CREATE INDEX IF NOT EXISTS users_status_created_idx ON users(status, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at);

ALTER TABLE guest_threads ADD COLUMN user_id TEXT;
ALTER TABLE comments ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS guest_threads_user_created_idx
  ON guest_threads(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS comments_user_created_idx
  ON comments(user_id, created_at DESC);
