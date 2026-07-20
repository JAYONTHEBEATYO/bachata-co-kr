CREATE TABLE IF NOT EXISTS stream_videos (
  id TEXT PRIMARY KEY,
  uploader_hash TEXT NOT NULL,
  original_name TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  thread_id TEXT,
  status TEXT NOT NULL DEFAULT 'pendingupload',
  ready_to_stream INTEGER NOT NULL DEFAULT 0,
  duration_seconds REAL,
  playback_url TEXT,
  thumbnail_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS stream_videos_uploader_created_idx
ON stream_videos(uploader_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS stream_videos_status_idx
ON stream_videos(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS stream_videos_thread_idx
ON stream_videos(thread_id);
