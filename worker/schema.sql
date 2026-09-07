CREATE TABLE IF NOT EXISTS pinball_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initials TEXT NOT NULL,
  score INTEGER NOT NULL,
  build TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pinball_entries_rank
  ON pinball_entries (score DESC, created_at ASC);
