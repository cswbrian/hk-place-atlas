import type { Feature } from './feature'
import { parseFeatureWrite, wikiCanDelete } from './wiki'

export type AuditAction = 'put' | 'delete' | 'revert'

export type AuditEntry = {
  id: string
  at: string
  actorEmail: string
  action: AuditAction
  entityType: 'feature' | 'photo'
  entityId: string
  before: Feature | null
  after: Feature | null
}

export type RevertPlan =
  | { type: 'restore'; feature: Feature }
  | { type: 'delete'; feature: Feature }
  | { error: string }

const ACTIONS: AuditAction[] = ['put', 'delete', 'revert']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseFeatureSnapshot(value: unknown): Feature | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.slug !== 'string') return null
  const parsed = parseFeatureWrite(value)
  if ('error' in parsed) return null
  return {
    ...parsed,
    id: value.id,
    slug: value.slug,
    touched: value.touched === true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
    createdBy: typeof value.createdBy === 'string' ? value.createdBy : undefined,
    updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : undefined,
  }
}

function parseJsonFeature(raw: unknown): Feature | null {
  if (raw == null || raw === '') return null
  if (typeof raw !== 'string') return parseFeatureSnapshot(raw)
  try {
    return parseFeatureSnapshot(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function parseAuditRow(row: unknown): AuditEntry | { error: string } {
  if (!isRecord(row) || typeof row.id !== 'string' || typeof row.entity_id !== 'string') {
    return { error: 'invalid audit row' }
  }
  if (!ACTIONS.includes(row.action as AuditAction)) return { error: 'invalid action' }
  return {
    id: row.id,
    at: typeof row.at === 'string' ? row.at : '',
    actorEmail: typeof row.actor_email === 'string' ? row.actor_email : '',
    action: row.action as AuditAction,
    entityType: row.entity_type === 'photo' ? 'photo' : 'feature',
    entityId: row.entity_id,
    before: parseJsonFeature(row.before_json),
    after: parseJsonFeature(row.after_json),
  }
}

export function revertPlan(entry: AuditEntry): RevertPlan {
  if (entry.action === 'delete') {
    if (!entry.before) return { error: 'nothing to restore' }
    return { type: 'restore', feature: entry.before }
  }
  if (entry.before) return { type: 'restore', feature: entry.before }
  if (!entry.after) return { error: 'nothing to revert' }
  if (!wikiCanDelete(entry.after.id)) return { error: 'seed rows cannot be deleted' }
  return { type: 'delete', feature: entry.after }
}
