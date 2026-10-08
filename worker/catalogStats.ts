export const STAT_PLACES = 'places'
export const STAT_PHOTOS = 'photos'

export const READ_CATALOG_STATS_SQL = `SELECT key, value FROM catalog_stats
WHERE key IN ('${STAT_PLACES}', '${STAT_PHOTOS}')`

export const BUMP_CATALOG_STAT_SQL = 'UPDATE catalog_stats SET value = value + ? WHERE key = ?'

export function countsFromStatRows(
  rows: Array<{ key: string; value: number }>,
): { places: number; photos: number } {
  let places = 0
  let photos = 0
  for (const row of rows) {
    if (row.key === STAT_PLACES) places = row.value
    else if (row.key === STAT_PHOTOS) photos = row.value
  }
  return { places, photos }
}

/** Reset counters from live COUNT(*) — for migrations/seed scripts, not the hot path. */
export const RESYNC_CATALOG_STATS_SQL = `INSERT INTO catalog_stats (key, value)
SELECT 'places', COUNT(*) FROM features
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
INSERT INTO catalog_stats (key, value)
SELECT 'photos', COUNT(*) FROM photos
ON CONFLICT(key) DO UPDATE SET value = excluded.value;`

export async function readCatalogCounts(db: D1Database): Promise<{ places: number; photos: number }> {
  const { results } = await db.prepare(READ_CATALOG_STATS_SQL).all<{ key: string; value: number }>()
  return countsFromStatRows(results ?? [])
}

export async function bumpCatalogStat(db: D1Database, key: string, delta: number): Promise<void> {
  await db.prepare(BUMP_CATALOG_STAT_SQL).bind(delta, key).run()
}
