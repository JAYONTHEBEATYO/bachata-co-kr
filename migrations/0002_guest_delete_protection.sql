CREATE TABLE IF NOT EXISTS guest_auth_attempts (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK(target_type IN ('thread', 'comment')),
  target_id TEXT NOT NULL,
  requester_hash TEXT NOT NULL,
  succeeded INTEGER NOT NULL DEFAULT 0 CHECK(succeeded IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS guest_auth_attempts_requester_created_idx
  ON guest_auth_attempts(requester_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS guest_auth_attempts_target_created_idx
  ON guest_auth_attempts(target_type, target_id, created_at DESC);
