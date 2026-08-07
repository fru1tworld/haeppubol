CREATE TABLE restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT,
    hours TEXT,
    note TEXT,
    closed INTEGER NOT NULL DEFAULT 0,
    distance_from_station TEXT NOT NULL DEFAULT '',
    price_range TEXT NOT NULL DEFAULT '',
    available_modes TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    map_url TEXT,
    delivery_apps TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
