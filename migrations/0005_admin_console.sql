ALTER TABLE guest_threads ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0 CHECK(is_pinned IN (0, 1));
ALTER TABLE guest_threads ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0 CHECK(is_featured IN (0, 1));
ALTER TABLE guest_threads ADD COLUMN moderation_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS guest_threads_pinned_created_idx
  ON guest_threads(is_pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS topic_definitions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  parent_id TEXT,
  topic_type TEXT NOT NULL DEFAULT 'subtopic' CHECK(topic_type IN ('board', 'subtopic')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#ff4f3f',
  sort_order INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'hidden', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (parent_id) REFERENCES topic_definitions(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS topic_definitions_type_order_idx
  ON topic_definitions(topic_type, status, sort_order);
CREATE INDEX IF NOT EXISTS topic_definitions_parent_order_idx
  ON topic_definitions(parent_id, status, sort_order);
CREATE INDEX IF NOT EXISTS topic_definitions_category_idx
  ON topic_definitions(category, status);

INSERT OR IGNORE INTO topic_definitions
  (id, slug, category, topic_type, name, description, color, sort_order)
VALUES
  ('board-free', 'free', 'free', 'board', '자유게시판', '바차타와 소셜에서 생긴 이야기를 편하게 나누는 곳', '#ff4f3f', 10),
  ('board-questions', 'questions', 'questions', 'board', '질문', '입문, 수업, 음악, 파트너워크에 관해 묻고 답하는 곳', '#2358d3', 20),
  ('board-video', 'video', 'video', 'board', '영상', '함께 보고 싶은 공연, 소셜, 연습 영상을 나누는 곳', '#d93f78', 30),
  ('board-events', 'events', 'events', 'board', '행사', '국내외 소셜, 워크숍, 페스티벌 소식', '#7a4fd8', 40),
  ('board-promotion', 'promotion', 'promotion', 'board', '홍보', '수업, 소셜, 공연, 팀 모집 소식', '#e14f2f', 50),
  ('board-academy-review', 'academy-review', 'academyReview', 'board', '아카데미 리뷰', '학원과 동호회 수업을 직접 경험한 후기', '#008b82', 60),
  ('board-dancer-review', 'dancer-review', 'dancerReview', 'board', '댄서 리뷰', '워크숍, 부트캠프, 소셜에서 만난 댄서 이야기', '#1c8a5a', 70),
  ('board-social-review', 'social-review', 'socialReview', 'board', '소셜 후기', '지역과 장소별 소셜 분위기와 실제 후기', '#d39416', 80),
  ('board-ama', 'ama', 'ama', 'board', '무엇이든 물어보세요', '댄서, 강사, 운영자와 편하게 묻고 답하는 곳', '#2f3540', 90);

INSERT OR IGNORE INTO topic_definitions
  (id, slug, category, parent_id, topic_type, name, description, color, sort_order)
VALUES
  ('sub-sensual', 'sensual-bachata', 'free', 'board-free', 'subtopic', '센슈얼 바차타', '센슈얼의 연결, 프레임, 움직임 이야기', '#d93f78', 10),
  ('sub-dominican', 'dominican-bachata', 'free', 'board-free', 'subtopic', '도미니칸 바차타', '리듬, 풋워크, 트레디셔널 스타일 이야기', '#d39416', 20),
  ('sub-influence', 'bachata-influence', 'free', 'board-free', 'subtopic', '바차타 인플루언스', '인플루언스 스타일과 음악 해석', '#2358d3', 30),
  ('sub-traditional', 'traditional-bachata', 'free', 'board-free', 'subtopic', '트레디셔널 바차타', '기본 리듬과 파트너워크 이야기', '#1c8a5a', 40),
  ('sub-footwork', 'footwork', 'video', 'board-video', 'subtopic', '풋워크', '샤인과 풋워크 영상 및 연습 기록', '#d39416', 10),
  ('sub-lady-style', 'lady-style', 'video', 'board-video', 'subtopic', '레이디 스타일', '레이디 스타일링 영상과 수업 후기', '#d93f78', 20),
  ('sub-men-style', 'men-style', 'video', 'board-video', 'subtopic', '맨즈 스타일', '맨즈 스타일링 영상과 수업 후기', '#2358d3', 30),
  ('sub-event-domestic', 'domestic-events', 'events', 'board-events', 'subtopic', '국내 행사', '국내 페스티벌, 워크숍, 파티', '#7a4fd8', 10),
  ('sub-event-overseas', 'overseas-events', 'events', 'board-events', 'subtopic', '해외 행사', '해외 페스티벌과 부트캠프', '#7a4fd8', 20),
  ('sub-event-review', 'event-reviews', 'events', 'board-events', 'subtopic', '행사 후기', '직접 다녀온 행사와 워크숍 후기', '#7a4fd8', 30),
  ('sub-academy-cielo', 'academy-latin-cielo', 'academyReview', 'board-academy-review', 'subtopic', '라틴씨엘로', '라틴씨엘로 수업과 소셜 후기', '#008b82', 10),
  ('sub-academy-sensuallab', 'academy-sensual-lab', 'academyReview', 'board-academy-review', 'subtopic', '센슈얼랩', '센슈얼랩 수업과 프로그램 후기', '#008b82', 20),
  ('sub-academy-everlatin', 'academy-everlatin', 'academyReview', 'board-academy-review', 'subtopic', '에버라틴', '에버라틴 수업과 소셜 후기', '#008b82', 30),
  ('sub-academy-lastdance', 'academy-last-dance', 'academyReview', 'board-academy-review', 'subtopic', '라스트댄스', '라스트댄스 수업과 소셜 후기', '#008b82', 40),
  ('sub-academy-ensueno', 'academy-ensueno', 'academyReview', 'board-academy-review', 'subtopic', '엔수에뇨', '엔수에뇨 수업과 프로그램 후기', '#008b82', 50),
  ('sub-social-gangnam', 'social-gangnam-latinbar', 'socialReview', 'board-social-review', 'subtopic', '강남 라틴바', '강남 라틴바 소셜 후기', '#d39416', 10),
  ('sub-social-bonita', 'social-hongdae-bonita', 'socialReview', 'board-social-review', 'subtopic', '홍대 보니따', '홍대 보니따 소셜 후기', '#d39416', 20),
  ('sub-social-incheon', 'social-incheon', 'socialReview', 'board-social-review', 'subtopic', '인천 소셜', '인천 지역 소셜 후기', '#d39416', 30),
  ('sub-social-busan', 'social-busan', 'socialReview', 'board-social-review', 'subtopic', '부산 소셜', '부산 지역 소셜 후기', '#d39416', 40),
  ('sub-social-daegu', 'social-daegu', 'socialReview', 'board-social-review', 'subtopic', '대구 소셜', '대구 지역 소셜 후기', '#d39416', 50),
  ('sub-social-jeju', 'social-jeju', 'socialReview', 'board-social-review', 'subtopic', '제주 소셜', '제주 지역 소셜 후기', '#d39416', 60);

CREATE TABLE IF NOT EXISTS analytics_pageviews (
  id TEXT PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  user_id TEXT,
  path TEXT NOT NULL,
  referrer_host TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL DEFAULT 'desktop' CHECK(device_type IN ('mobile', 'tablet', 'desktop', 'bot')),
  country_code TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  max_scroll INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS analytics_pageviews_started_idx
  ON analytics_pageviews(started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_pageviews_visitor_started_idx
  ON analytics_pageviews(visitor_hash, started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_pageviews_path_started_idx
  ON analytics_pageviews(path, started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_pageviews_session_started_idx
  ON analytics_pageviews(session_hash, started_at DESC);

CREATE TABLE IF NOT EXISTS content_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  last_status TEXT NOT NULL DEFAULT 'waiting' CHECK(last_status IN ('waiting', 'healthy', 'warning', 'failed', 'disabled')),
  last_run_at TEXT,
  last_success_at TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO content_sources
  (id, name, source_type, url, enabled, config_json)
VALUES
  ('source-danceinfo', '댄스인포', 'public-web', 'https://danceinfo.net/', 1, '{"scope":"국내 댄스 행사와 소식"}'),
  ('source-bchata', 'Bchata', 'public-web', 'https://bchata.vercel.app/', 1, '{"scope":"국내 바차타 정보"}'),
  ('source-simpson', '심슨 라틴스쿨', 'public-web', 'https://simspson-latinsch.netlify.app/', 1, '{"scope":"국내 라틴댄스 정보"}'),
  ('source-naver-cafe', '네이버 카페 검색', 'naver-cafe-api', 'https://openapi.naver.com/v1/search/cafearticle.json', 1, '{"storesFullText":false}'),
  ('source-daum-cafe', '다음 카페 검색', 'kakao-cafe-api', 'https://dapi.kakao.com/v2/search/cafe', 1, '{"storesFullText":false}'),
  ('source-daum-video', '다음 동영상 검색', 'kakao-video-api', 'https://dapi.kakao.com/v2/search/vclip', 1, '{"storesFullText":false}');

CREATE TABLE IF NOT EXISTS admin_proposals (
  id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL CHECK(proposal_type IN ('content', 'site_improvement')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'free',
  tags_json TEXT NOT NULL DEFAULT '[]',
  source_url TEXT,
  source_name TEXT,
  source_published_at TEXT,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  rationale TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied', 'published', 'applied')),
  created_by TEXT NOT NULL DEFAULT 'ai' CHECK(created_by IN ('ai', 'system', 'admin')),
  reviewed_by TEXT,
  review_note TEXT NOT NULL DEFAULT '',
  thread_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_at TEXT,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (thread_id) REFERENCES guest_threads(id)
);

CREATE INDEX IF NOT EXISTS admin_proposals_status_created_idx
  ON admin_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_proposals_type_status_idx
  ON admin_proposals(proposal_type, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS admin_proposals_source_url_idx
  ON admin_proposals(source_url) WHERE source_url IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_automation_runs (
  id TEXT PRIMARY KEY,
  run_type TEXT NOT NULL CHECK(run_type IN ('daily_content', 'weekly_audit', 'manual')),
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'partial', 'failed')),
  signals_count INTEGER NOT NULL DEFAULT 0,
  proposals_count INTEGER NOT NULL DEFAULT 0,
  detail_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS admin_automation_runs_started_idx
  ON admin_automation_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS admin_activity_log_created_idx
  ON admin_activity_log(created_at DESC);

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

INSERT OR IGNORE INTO site_settings(setting_key, setting_value)
VALUES
  ('editorial.daily_candidate_limit', '2'),
  ('editorial.auto_publish', 'false'),
  ('analytics.retention_days', '180'),
  ('community.guest_posting', 'true');
