-- Pins of atlas places on a photo. Existing photo rows are unchanged.

CREATE TABLE photo_tags (
  id          TEXT PRIMARY KEY,
  photo_id    TEXT NOT NULL,
  feature_id  TEXT NOT NULL,
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  created_at  TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  UNIQUE (photo_id, feature_id)
);
CREATE INDEX photo_tags_feature ON photo_tags (feature_id);
