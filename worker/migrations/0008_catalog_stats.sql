-- Running totals for welcome-panel catalog counts (avoid COUNT(*) on hot path).

CREATE TABLE catalog_stats (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT INTO catalog_stats (key, value)
SELECT 'places', COUNT(*) FROM features;

INSERT INTO catalog_stats (key, value)
SELECT 'photos', COUNT(*) FROM photos;
