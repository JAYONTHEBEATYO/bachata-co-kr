CREATE TABLE IF NOT EXISTS poster_analyses (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  uploader_hash TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('events', 'promotion')),
  content_type TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  result_json TEXT NOT NULL DEFAULT '{}',
  ocr_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS poster_analyses_owner_created_idx
  ON poster_analyses(uploader_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS poster_analyses_object_status_idx
  ON poster_analyses(object_key, uploader_hash, category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS poster_analyses_status_created_idx
  ON poster_analyses(status, created_at DESC);
