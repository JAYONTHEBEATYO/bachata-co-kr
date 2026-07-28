CREATE TABLE IF NOT EXISTS editorial_automation_settings (
  id TEXT PRIMARY KEY CHECK(id = 'ai_content'),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  cadence_hours INTEGER NOT NULL DEFAULT 24 CHECK(cadence_hours BETWEEN 6 AND 168),
  preferred_hour_kst INTEGER NOT NULL DEFAULT 9 CHECK(preferred_hour_kst BETWEEN 0 AND 23),
  candidate_limit INTEGER NOT NULL DEFAULT 2 CHECK(candidate_limit BETWEEN 1 AND 4),
  duplicate_window_days INTEGER NOT NULL DEFAULT 90 CHECK(duplicate_window_days BETWEEN 7 AND 365),
  feedback_lookback INTEGER NOT NULL DEFAULT 30 CHECK(feedback_lookback BETWEEN 5 AND 100),
  next_run_at TEXT,
  last_started_at TEXT,
  last_completed_at TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

INSERT OR IGNORE INTO editorial_automation_settings (
  id,
  enabled,
  cadence_hours,
  preferred_hour_kst,
  candidate_limit,
  duplicate_window_days,
  feedback_lookback,
  next_run_at
) VALUES (
  'ai_content',
  1,
  24,
  9,
  2,
  90,
  30,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+24 hours')
);

ALTER TABLE admin_proposals ADD COLUMN canonical_source_url TEXT;
ALTER TABLE admin_proposals ADD COLUMN content_fingerprint TEXT;
ALTER TABLE admin_proposals ADD COLUMN classification_json TEXT NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS admin_proposals_canonical_source_idx
  ON admin_proposals(canonical_source_url)
  WHERE proposal_type = 'content' AND canonical_source_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS admin_proposals_content_fingerprint_idx
  ON admin_proposals(content_fingerprint)
  WHERE proposal_type = 'content' AND content_fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS editorial_feedback (
  proposal_id TEXT PRIMARY KEY,
  decision TEXT NOT NULL DEFAULT 'saved'
    CHECK(decision IN ('saved', 'denied', 'published', 'approved', 'applied')),
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  labels_json TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  original_title TEXT NOT NULL DEFAULT '',
  final_title TEXT NOT NULL DEFAULT '',
  original_category TEXT NOT NULL DEFAULT '',
  final_category TEXT NOT NULL DEFAULT '',
  original_tags_json TEXT NOT NULL DEFAULT '[]',
  final_tags_json TEXT NOT NULL DEFAULT '[]',
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (proposal_id) REFERENCES admin_proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS editorial_feedback_updated_idx
  ON editorial_feedback(updated_at DESC);
