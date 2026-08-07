CREATE TABLE smash_logs (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    smashed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_smash_logs_restaurant ON smash_logs(restaurant_id);
