CREATE TABLE crew_balls (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    shell_color TEXT,
    core_color TEXT,
    tagline TEXT,
    photo TEXT,
    background TEXT,
    sound TEXT,
    heal_mode INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
