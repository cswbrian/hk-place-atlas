-- Phase 0 schema

CREATE TABLE features (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  name_en       TEXT NOT NULL,
  name_zh       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL,
  start_year    INTEGER,
  start_month   INTEGER,
  start_day     INTEGER,
  start_circa   INTEGER NOT NULL DEFAULT 0,
  end_year      INTEGER,
  end_month     INTEGER,
  end_day       INTEGER,
  end_circa     INTEGER NOT NULL DEFAULT 0,
  lng           REAL,
  lat           REAL,
  body          TEXT NOT NULL,
  touched       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_by    TEXT
);
CREATE INDEX features_kind ON features (kind);
CREATE INDEX features_bbox ON features (lng, lat);
CREATE INDEX features_year ON features (kind, start_year, end_year, status);
CREATE INDEX features_touched ON features (touched);

CREATE TABLE edges (
  id          TEXT PRIMARY KEY,
  from_type   TEXT NOT NULL,
  from_id     TEXT NOT NULL,
  to_type     TEXT NOT NULL,
  to_id       TEXT NOT NULL,
  rel_type    TEXT NOT NULL,
  note        TEXT,
  valid_from  TEXT,
  valid_to    TEXT,
  UNIQUE (from_type, from_id, to_type, to_id, rel_type)
);
CREATE INDEX edges_from ON edges (from_type, from_id);
CREATE INDEX edges_to ON edges (to_type, to_id);

CREATE TABLE slug_history (
  old_slug    TEXT PRIMARY KEY,
  feature_id  TEXT NOT NULL REFERENCES features(id)
);

CREATE TABLE users (
  sub         TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE audit_log (
  id          TEXT PRIMARY KEY,
  at          TEXT NOT NULL,
  actor_sub   TEXT,
  actor_email TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  before_json TEXT,
  after_json  TEXT
);
CREATE INDEX audit_entity ON audit_log (entity_type, entity_id, at);
