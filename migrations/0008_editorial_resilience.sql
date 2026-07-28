DROP INDEX IF EXISTS admin_proposals_source_url_idx;
DROP INDEX IF EXISTS admin_proposals_canonical_source_idx;
DROP INDEX IF EXISTS admin_proposals_content_fingerprint_idx;

CREATE INDEX IF NOT EXISTS admin_proposals_source_url_lookup_idx
  ON admin_proposals(source_url, created_at DESC)
  WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS admin_proposals_canonical_source_lookup_idx
  ON admin_proposals(canonical_source_url, created_at DESC)
  WHERE canonical_source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS admin_proposals_content_fingerprint_lookup_idx
  ON admin_proposals(content_fingerprint, created_at DESC)
  WHERE content_fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS editorial_run_locks (
  lock_key TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS editorial_dedupe_claims (
  claim_key TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS editorial_dedupe_claims_expiry_idx
  ON editorial_dedupe_claims(expires_at);

CREATE TABLE IF NOT EXISTS thread_editorial_metadata (
  thread_id TEXT PRIMARY KEY,
  proposal_id TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  classification_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (thread_id) REFERENCES guest_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES admin_proposals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS thread_tags (
  thread_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'editorial',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (thread_id, tag),
  FOREIGN KEY (thread_id) REFERENCES guest_threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS thread_tags_tag_created_idx
  ON thread_tags(tag, created_at DESC);
