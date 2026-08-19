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
