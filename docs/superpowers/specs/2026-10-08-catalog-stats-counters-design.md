# Catalog stats counters

Stop paying a full-table `COUNT(*)` on every `/api/counts` cache miss. Keep a small key/value counter table bumped on create/delete, and serve counts from that.

## Goal

Welcome-panel place/photo totals stay roughly right (minutes–hours of lag is fine) while D1 rows-read for counts stays O(number of stat keys), not O(catalog size).

Out of scope: frontend copy changes, new stats beyond `places` / `photos`, Durable Object / KV, scheduled reconcile (optional later).

## Problem

`GET /api/counts` runs:

```sql
SELECT
  (SELECT COUNT(*) FROM features) AS places,
  (SELECT COUNT(*) FROM photos) AS photos
```

Live remote baseline (2026-10-08): **38,503 places**, **10 photos** → ~**38,513 rows read** per miss. Cache API already caches the response for 5 minutes per colo; misses still scale with catalog size.

## Schema

```sql
CREATE TABLE catalog_stats (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

INSERT INTO catalog_stats (key, value)
SELECT 'places', COUNT(*) FROM features;

INSERT INTO catalog_stats (key, value)
SELECT 'photos', COUNT(*) FROM photos;
```

Seed pays the expensive `COUNT(*)` **once** at migration time. Expected remote seed values at design lock: `places=38503`, `photos=10` (recompute in the migration SQL so local DBs get their own totals).

Adding a future stat is a new row (and a bump on its write path), not an `ALTER TABLE`.

## Read path

`handleCounts`:

```sql
SELECT key, value FROM catalog_stats
WHERE key IN ('places', 'photos')
```

Map rows into `{ places, photos }`. Missing keys → `0` (should not happen after a successful migration).

Keep Cache API via `cachedRead`. Raise `/api/counts` TTL from **5 minutes → 1 hour** in `publicReadCacheSeconds`.

API shape and client (`fetchCounts`, welcome `catalogCountLine`) unchanged.

## Write path

Bump only when the catalog size changes:

| Event | Key | Delta |
|---|---|---|
| New feature (`saveFeatureRow(..., true)` / create) | `places` | `+1` |
| Delete feature (`handleDelete`, audit revert delete) | `places` | `-1` |
| Restore missing feature via audit revert (insert) | `places` | `+1` |
| New photo | `photos` | `+1` |
| Delete photo | `photos` | `-1` |
| Edit feature / edit photo / tag changes | — | no change |

Helper (conceptual):

```sql
UPDATE catalog_stats SET value = value + ? WHERE key = ?
```

Prefer running the bump in the same success path as the insert/delete (same request; `batch()` when practical). Do not bump on failed auth / validation / conflict paths.

Scripts that insert/delete features or photos outside these handlers (e.g. `npm run seed`) must either bump `catalog_stats` or re-seed from `COUNT(*)` after the run.

## Drift

Counters can drift if a write path is missed. Acceptable for v1 given low write volume and “roughly right” freshness. Optional later: rare reconcile that resets keys from `COUNT(*)`. Not required for this change.

## Testing

- Migration: after apply, `catalog_stats` has `places` / `photos` matching `COUNT(*)` on the same DB.
- `handleCounts`: returns seeded values without scanning `features`/`photos` (assert query shape or mock).
- Create place → `places` +1; delete place → `places` -1.
- Create photo → `photos` +1; delete photo → `photos` -1.
- Update place / photo metadata → counters unchanged.
- Audit revert that deletes or re-inserts a feature adjusts `places`.
- Cache TTL for counts route is 3600 seconds.

## Rollout

1. Add migration `0008_catalog_stats.sql` (create + seed).
2. Apply remote (`npm run migrate:remote`) — one-time full count.
3. Ship worker changes that read/bump `catalog_stats` and use 1h cache.
4. No client deploy required beyond whatever ships with the worker/assets bundle.
