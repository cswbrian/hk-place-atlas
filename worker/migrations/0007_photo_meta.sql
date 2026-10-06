-- Caption rename + taken year/circa + credit/license. Rebuild so remarks is gone.

CREATE TABLE photos_new (
  id            TEXT PRIMARY KEY,
  feature_id    TEXT,
  lng           REAL NOT NULL,
  lat           REAL NOT NULL,
  source        TEXT NOT NULL,
  caption       TEXT NOT NULL DEFAULT '',
  photographer  TEXT NOT NULL DEFAULT '',
  license       TEXT NOT NULL DEFAULT '',
  year          INTEGER,
  circa         INTEGER NOT NULL DEFAULT 0,
  source_url    TEXT NOT NULL,
  original_key  TEXT NOT NULL,
  map_key       TEXT NOT NULL,
  panel_key     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  created_by    TEXT NOT NULL
);

INSERT INTO photos_new (
  id, feature_id, lng, lat, source, caption, photographer, license, year, circa,
  source_url, original_key, map_key, panel_key, created_at, created_by
)
SELECT
  id, feature_id, lng, lat, source, remarks, '', '', NULL, 0,
  source_url, original_key, map_key, panel_key, created_at, created_by
FROM photos;

DROP TABLE photos;
ALTER TABLE photos_new RENAME TO photos;
CREATE INDEX photos_feature ON photos (feature_id);
CREATE INDEX photos_bbox ON photos (lng, lat);
