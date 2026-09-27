-- Wiki write rate-limit lookups

CREATE INDEX IF NOT EXISTS audit_actor ON audit_log (actor_sub, at);
