-- Place photos. feature_id stays nullable so a later standalone photo needs no schema change.
-- This version's API still requires a place.

CREATE TABLE photos (
  id            TEXT PRIMARY KEY,
  feature_id    TEXT,
  lng           REAL NOT NULL,
  lat           REAL NOT NULL,
  source        TEXT NOT NULL,
  remarks       TEXT NOT NULL,
  source_url    TEXT NOT NULL,
  original_key  TEXT NOT NULL,
  map_key       TEXT NOT NULL,
  panel_key     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  created_by    TEXT NOT NULL
);
CREATE INDEX photos_feature ON photos (feature_id);
CREATE INDEX photos_bbox ON photos (lng, lat);
