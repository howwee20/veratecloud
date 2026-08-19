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
