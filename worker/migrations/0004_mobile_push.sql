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
