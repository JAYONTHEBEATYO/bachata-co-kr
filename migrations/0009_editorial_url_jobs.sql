CREATE TABLE IF NOT EXISTS editorial_url_jobs (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  canonical_source_url TEXT NOT NULL,
  source_platform TEXT NOT NULL
    CHECK(source_platform IN ('youtube', 'instagram', 'reddit', 'web')),
  content_kind TEXT NOT NULL
    CHECK(content_kind IN ('video', 'article')),
  source_title TEXT NOT NULL DEFAULT '',
  source_author TEXT NOT NULL DEFAULT '',
  source_handle TEXT NOT NULL DEFAULT '',
  source_description TEXT NOT NULL DEFAULT '',
  source_thumbnail_url TEXT,
  source_asset_url TEXT,
  reuse_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK(reuse_status IN ('permission_granted', 'permission_review', 'restricted', 'not_required')),
  permission_reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'analyzing'
    CHECK(status IN (
      'analyzing',
      'awaiting_rights',
      'awaiting_source',
      'localization_queued',
      'localizing',
      'rendering',
      'ready',
      'failed',
      'cancelled'
    )),
  generated_image_key TEXT,
  generated_image_url TEXT,
  output_asset_url TEXT,
  output_stream_id TEXT,
  proposal_id TEXT,
  project_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  claimed_by TEXT,
  claim_expires_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (proposal_id) REFERENCES admin_proposals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS editorial_url_jobs_status_created_idx
  ON editorial_url_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS editorial_url_jobs_source_created_idx
  ON editorial_url_jobs(canonical_source_url, created_at DESC);

CREATE INDEX IF NOT EXISTS editorial_url_jobs_proposal_idx
  ON editorial_url_jobs(proposal_id);

CREATE INDEX IF NOT EXISTS editorial_url_jobs_claim_idx
  ON editorial_url_jobs(status, claim_expires_at);
