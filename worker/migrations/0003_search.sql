-- Phase 3 search index (English FTS; Chinese uses LIKE on features)

CREATE VIRTUAL TABLE features_fts USING fts5(
  id UNINDEXED,
  name_en,
  slug,
  tokenize = 'unicode61'
);

CREATE TRIGGER features_fts_ai AFTER INSERT ON features BEGIN
  INSERT INTO features_fts(id, name_en, slug) VALUES (new.id, new.name_en, new.slug);
END;

CREATE TRIGGER features_fts_ad AFTER DELETE ON features BEGIN
  DELETE FROM features_fts WHERE id = old.id;
END;

CREATE TRIGGER features_fts_au AFTER UPDATE ON features BEGIN
  DELETE FROM features_fts WHERE id = old.id;
  INSERT INTO features_fts(id, name_en, slug) VALUES (new.id, new.name_en, new.slug);
END;

INSERT INTO features_fts(id, name_en, slug) SELECT id, name_en, slug FROM features;
