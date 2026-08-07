CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);
