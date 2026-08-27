CREATE TABLE IF NOT EXISTS playback_sessions (
  session_id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL DEFAULT 'polyswap/auto',
  desired_state TEXT NOT NULL DEFAULT 'stopped',
  requested_query TEXT,
  resolved_media TEXT,
  active_job_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  active_device_id TEXT,
  device_status TEXT,
  device_last_seen_at TEXT,
  last_applied_revision INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playback_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  revision INTEGER,
  kind TEXT NOT NULL,
  prompt TEXT,
  query TEXT,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_at TEXT
);

CREATE INDEX IF NOT EXISTS playback_commands_session
ON playback_commands(session_id, id DESC);

CREATE TABLE IF NOT EXISTS playback_pairings (
  code_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  device_id TEXT,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS playback_pairings_expiry
ON playback_pairings(expires_at);
