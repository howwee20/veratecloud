CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  cost_usd REAL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS messages_session_created ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS messages_thread_created ON messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  model TEXT NOT NULL,
  reserved_usd REAL NOT NULL DEFAULT 0,
  actual_usd REAL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS budget (
  id TEXT PRIMARY KEY,
  spent_usd REAL NOT NULL DEFAULT 0,
  reserved_usd REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO budget (id, spent_usd, reserved_usd) VALUES ('shared', 0, 0);

CREATE TABLE IF NOT EXISTS runtime_state (
  id TEXT PRIMARY KEY,
  paused INTEGER NOT NULL DEFAULT 0,
  pause_reason TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO runtime_state (id, paused) VALUES ('global', 0);

CREATE TABLE IF NOT EXISTS rate_windows (
  bucket TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bucket, fingerprint)
);

CREATE INDEX IF NOT EXISTS rate_windows_updated ON rate_windows(updated_at);

CREATE TABLE IF NOT EXISTS cloud_jobs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'work',
  status TEXT NOT NULL DEFAULT 'queued',
  model_id TEXT NOT NULL,
  model_route TEXT NOT NULL DEFAULT 'openai',
  privacy_mode TEXT NOT NULL DEFAULT 'private',
  permission_profile TEXT NOT NULL DEFAULT 'ask',
  permission_scope TEXT,
  workspace TEXT NOT NULL DEFAULT 'PolySwap Cloud',
  acceptance_criteria TEXT NOT NULL DEFAULT '[]',
  estimated_usd REAL NOT NULL DEFAULT 0,
  budget_usd REAL NOT NULL DEFAULT 0,
  actual_usd REAL NOT NULL DEFAULT 0,
  background INTEGER NOT NULL DEFAULT 1,
  runner_id TEXT,
  checkpoint_id TEXT,
  result_summary TEXT,
  receipt_status TEXT,
  receipt_evidence TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS cloud_jobs_session_updated ON cloud_jobs(session_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS cloud_jobs_status_created ON cloud_jobs(status, created_at);

CREATE TABLE IF NOT EXISTS cloud_job_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  evidence TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cloud_job_events_job_id ON cloud_job_events(job_id, id);

CREATE TABLE IF NOT EXISTS cloud_job_approvals (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS cloud_job_approvals_job_id ON cloud_job_approvals(job_id, created_at);

CREATE TABLE IF NOT EXISTS cloud_push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cloud_push_subscriptions_session
ON cloud_push_subscriptions(session_id, updated_at DESC);
