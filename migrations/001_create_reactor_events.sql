CREATE TABLE IF NOT EXISTS reactor_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ts         INTEGER NOT NULL,
  kind       TEXT    NOT NULL,
  state      TEXT    NOT NULL,
  n          INTEGER NOT NULL DEFAULT 0,
  r_score    REAL    NOT NULL DEFAULT 0,
  detail     TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_reactor_events_id_desc ON reactor_events (id DESC);
