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
