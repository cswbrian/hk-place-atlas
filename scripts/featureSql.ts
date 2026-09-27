import type { Feature } from '../src/domain/feature.ts'
import { featureToRow, type FeatureRow } from '../src/domain/featureQuery.ts'

const BATCH = 40

function sqlLiteral(value: string | number | null): string {
  if (value == null) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  return `'${value.replaceAll("'", "''")}'`
}

function rowValues(row: FeatureRow): string {
  return `(${[
    sqlLiteral(row.id),
    sqlLiteral(row.kind),
    sqlLiteral(row.slug),
    sqlLiteral(row.name_en),
    sqlLiteral(row.name_zh),
    sqlLiteral(row.status),
    sqlLiteral(row.start_year),
    sqlLiteral(row.start_month),
    sqlLiteral(row.start_day),
    sqlLiteral(row.start_circa),
    sqlLiteral(row.end_year),
    sqlLiteral(row.end_month),
    sqlLiteral(row.end_day),
    sqlLiteral(row.end_circa),
    sqlLiteral(row.lng),
    sqlLiteral(row.lat),
    sqlLiteral(row.body),
    sqlLiteral(row.touched),
    sqlLiteral(row.created_at),
    sqlLiteral(row.updated_at),
    sqlLiteral(row.created_by),
    sqlLiteral(row.updated_by),
  ].join(',')})`
}

const COLUMNS = `id, kind, slug, name_en, name_zh, status,
      start_year, start_month, start_day, start_circa,
      end_year, end_month, end_day, end_circa,
      lng, lat, body, touched, created_at, updated_at, created_by, updated_by`

export function featureInsertSql(features: Feature[]): string {
  const lines = ['DELETE FROM features;']
  for (let i = 0; i < features.length; i += BATCH) {
    const chunk = features.slice(i, i + BATCH).map((feature) => rowValues(featureToRow(feature)))
    lines.push(`INSERT INTO features (${COLUMNS}) VALUES\n${chunk.join(',\n')};`)
  }
  return `${lines.join('\n')}\n`
}
