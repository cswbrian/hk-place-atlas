import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import type { Feature } from '../src/domain/feature.ts'
import { featureToRow } from '../src/domain/featureQuery.ts'
import { featuresFromBdbiar, parseBdbiarCsv } from './bdbiar.ts'
import { featureInsertSql } from './featureSql.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const csvPath = join(root, 'BDBIAR_BDBIAR_converted.csv')
const catalogPath = join(root, 'public', 'catalog.geojson')

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const hit = process.argv.find((arg) => arg.startsWith(prefix))
  if (hit) return hit.slice(prefix.length)
  const i = process.argv.indexOf(`--${name}`)
  if (i >= 0) return process.argv[i + 1]
  return undefined
}

function findLocalD1(dir: string): string | null {
  const found: { path: string; mtime: number }[] = []
  function walk(current: string) {
    let names: string[]
    try {
      names = readdirSync(current)
    } catch {
      return
    }
    for (const name of names) {
      const path = join(current, name)
      let stat
      try {
        stat = statSync(path)
      } catch {
        continue
      }
      if (stat.isDirectory()) walk(path)
      else if (
        name.endsWith('.sqlite') &&
        name !== 'metadata.sqlite' &&
        !name.includes('-shm') &&
        !name.includes('-wal')
      ) {
        found.push({ path, mtime: stat.mtimeMs })
      }
    }
  }
  walk(dir)
  found.sort((a, b) => b.mtime - a.mtime)
  return found[0]?.path ?? null
}

function catalogGeojson(features: Feature[]) {
  return {
    type: 'FeatureCollection' as const,
    features: features.flatMap((feature) => {
      if (feature.lng == null || feature.lat == null) return []
      return [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [feature.lng, feature.lat] },
          properties: {
            id: feature.id,
            slug: feature.slug,
            kind: feature.kind,
            status: feature.status,
            startYear: feature.start?.year ?? null,
            endYear: feature.end?.year ?? null,
            nameEn: feature.nameEn,
            nameZh: feature.nameZh,
          },
        },
      ]
    }),
  }
}

function insertFeatures(db: DatabaseSync, features: Feature[]) {
  db.exec('DELETE FROM features')
  const insert = db.prepare(
    `INSERT INTO features (
      id, kind, slug, name_en, name_zh, status,
      start_year, start_month, start_day, start_circa,
      end_year, end_month, end_day, end_circa,
      lng, lat, body, touched, created_at, updated_at, created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
  db.exec('BEGIN')
  for (const feature of features) {
    const row = featureToRow(feature)
    insert.run(
      row.id,
      row.kind,
      row.slug,
      row.name_en,
      row.name_zh,
      row.status,
      row.start_year,
      row.start_month,
      row.start_day,
      row.start_circa,
      row.end_year,
      row.end_month,
      row.end_day,
      row.end_circa,
      row.lng,
      row.lat,
      row.body,
      row.touched,
      row.created_at,
      row.updated_at,
      row.created_by,
      row.updated_by,
    )
  }
  db.exec('COMMIT')
}

const sample = Number(argValue('sample') ?? '0')
const remote = process.argv.includes('--remote')
const csv = readFileSync(csvPath, 'utf8')
let features = featuresFromBdbiar(parseBdbiarCsv(csv))
if (sample > 0) features = features.slice(0, sample)
console.log(`seed ${features.length} features`)

mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(catalogPath, JSON.stringify(catalogGeojson(features)))
console.log(`wrote ${catalogPath}`)

if (remote) {
  const sqlPath = join(root, '.wrangler', 'seed-remote.sql')
  mkdirSync(join(root, '.wrangler'), { recursive: true })
  writeFileSync(sqlPath, featureInsertSql(features))
  console.log(`wrote ${sqlPath}`)
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'hk-atlas', '--remote', `--file=${sqlPath}`, '--yes'],
    { cwd: root, stdio: 'inherit' },
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const dbPath = findLocalD1(join(root, '.wrangler', 'state', 'v3', 'd1'))
if (!dbPath) {
  if (!remote) {
    console.log('No local D1 yet. Run `npx wrangler d1 migrations apply hk-atlas --local` then re-run seed.')
  }
  process.exit(0)
}

const db = new DatabaseSync(dbPath)
insertFeatures(db, features)
db.close()
console.log(`inserted into ${dbPath}`)
