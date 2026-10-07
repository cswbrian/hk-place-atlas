import { parseApiRoute, type ApiRoute } from '../src/api/router'
import { featureRowToFeature, featureToRow, parseBbox, type Bbox, type FeatureRow } from '../src/domain/featureQuery'
import { slugify } from '../src/domain/feature'
import {
  clearCookie,
  cookieValue,
  OAUTH_COOKIE,
  readSession,
  SESSION_COOKIE,
  setCookie,
  signSession,
  type Session,
} from '../src/domain/session'
import { parseAuditRow, revertPlan } from '../src/domain/audit'
import { SEARCH_FETCH, SEARCH_LIMIT, fts5Query, hanNeedle, mergeSearchIds } from '../src/domain/search'
import { RECENT_LIMIT, recentItemFromRow, recentListSql } from '../src/domain/recent'
import { publicReadCacheSeconds, type PublicRead } from './publicCache'
import {
  CSDI_WFS,
  GIS_CACHE_SECONDS,
  LANDSD_ROOT,
  clampGisBbox,
  csdiBuildingsUrl,
  landsdParcelUrl,
  landsdSearchUrl,
  parseParcelKind,
  parseSearchText,
} from '../src/domain/gis'
import { featurePublicPath, placesPageRedirect } from '../src/domain/locale'
import {
  aboutSeoHead,
  browserOrigin,
  canonicalHostRedirect,
  featureSeoHead,
  gtagSnippet,
  homeSeoHead,
  injectSeoHead,
  llmsTxt,
  notFoundSeoHead,
  parseSeoPath,
  parseSitemapPath,
  robotsTxt,
  rootPathRedirect,
  sitemapIndexXml,
  sitemapPageCount,
  sitemapXml,
  SITEMAP_FEATURE_PAGE,
  type SeoPath,
  type SitemapFeature,
} from '../src/domain/seo'
import {
  applyWikiWrite,
  checkIfMatch,
  parseFeatureWrite,
  rateLimitOk,
  wikiCanDelete,
  wikiSlug,
} from '../src/domain/wiki'
import { clampLotBbox, wgsToHk80 } from '../src/ui/lots/hk80'
import {
  PHOTO_MAX_BYTES,
  normalizePhotoTaken,
  photoMetaIssues,
  type Photo,
} from '../src/domain/photo'
import {
  DELETE_PHOTO_TAGS,
  DELETE_PLACE_TAGS,
  PHOTO_TAG_UPSERT,
  attachPhotoTags,
  imageMediaType,
  photoListFilter,
  photoTagIssues,
  type PhotoTag,
} from '../src/domain/photoTag'
import { createPhoto, removePhoto, type PhotoBucket, type StoredPhoto } from './photos'

type ImageHandle = {
  transform(options: { width: number }): ImageHandle
  output(options: { format: string; quality?: number }): Promise<{ response(): Response }>
}

type ImagesBinding = {
  info(stream: ReadableStream): Promise<{ format?: string }>
  input(source: ReadableStream | ArrayBuffer): ImageHandle
}

export type Env = {
  DB: D1Database
  ASSETS?: Fetcher
  PHOTOS?: R2Bucket
  IMAGES?: ImagesBinding
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  SESSION_SECRET?: string
  PUBLIC_ORIGIN?: string
  GA_MEASUREMENT_ID?: string
}

const LIST_CAP = 500
const SESSION_DAYS = 30 * 24 * 3600

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

async function spaShell(env: Env, request: Request): Promise<string> {
  if (!env.ASSETS) return '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
  const asset = await env.ASSETS.fetch(new URL('/index.html', request.url))
  return asset.text()
}

function gaId(request: Request, env: Env): string | undefined {
  const url = new URL(request.url)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return undefined
  return env.GA_MEASUREMENT_ID
}

async function handleSeoPage(request: Request, env: Env, seo: SeoPath): Promise<Response> {
  const origin = publicOrigin(request, env)
  const shell = await spaShell(env, request)
  const measurementId = gaId(request, env)
  if (seo.type === 'home') return html(injectSeoHead(shell, homeSeoHead(origin, seo.locale), measurementId))
  if (seo.type === 'about') return html(injectSeoHead(shell, aboutSeoHead(origin, seo.locale), measurementId))
  const row = await env.DB.prepare('SELECT * FROM features WHERE slug = ?').bind(seo.slug).first<FeatureRow>()
  if (!row) return html(injectSeoHead(shell, notFoundSeoHead(origin, seo.locale), measurementId), 404)
  const feature = featureRowToFeature(row)
  const group = feature.kind === 'event' ? 'event' : 'place'
  if (group !== seo.group) {
    return Response.redirect(`${origin}${featurePublicPath(seo.locale, feature.kind, feature.slug)}`, 301)
  }
  return html(injectSeoHead(shell, featureSeoHead(feature, origin, seo.locale), measurementId))
}

function publicOrigin(request: Request, env: Env): string {
  return browserOrigin(request.url, env.PUBLIC_ORIGIN, {
    ip: request.headers.get('cf-connecting-ip'),
    ray: request.headers.get('cf-ray'),
  })
}

function redirect(location: string, status = 301): Response {
  return new Response(null, { status, headers: { location } })
}

function textPlain(body: string, contentType = 'text/plain; charset=utf-8'): Response {
  return new Response(body, { status: 200, headers: { 'content-type': contentType } })
}

async function handleSitemap(env: Env, origin: string, pathname: string): Promise<Response | null> {
  const parsed = parseSitemapPath(pathname)
  if (!parsed) return null
  const countRow = await env.DB.prepare('SELECT COUNT(*) AS n FROM features').first<{ n: number }>()
  const featureCount = countRow?.n ?? 0
  const pages = sitemapPageCount(featureCount)
  if (parsed.type === 'index') {
    if (pages === 1) {
      const { results } = await env.DB.prepare(
        'SELECT kind, slug FROM features ORDER BY slug LIMIT ?',
      )
        .bind(SITEMAP_FEATURE_PAGE)
        .all<SitemapFeature>()
      return textPlain(sitemapXml(origin, results ?? []), 'application/xml; charset=utf-8')
    }
    return textPlain(sitemapIndexXml(origin, pages), 'application/xml; charset=utf-8')
  }
  if (parsed.page < 0 || parsed.page >= pages) return json({ error: 'not found' }, 404)
  const { results } = await env.DB.prepare(
    'SELECT kind, slug FROM features ORDER BY slug LIMIT ? OFFSET ?',
  )
    .bind(SITEMAP_FEATURE_PAGE, parsed.page * SITEMAP_FEATURE_PAGE)
    .all<SitemapFeature>()
  return textPlain(
    sitemapXml(origin, results ?? [], { includeHomes: parsed.page === 0 }),
    'application/xml; charset=utf-8',
  )
}

async function sessionFrom(request: Request, env: Env): Promise<Session | null> {
  if (!env.SESSION_SECRET) return null
  return readSession(cookieValue(request.headers.get('cookie'), SESSION_COOKIE), env.SESSION_SECRET)
}

async function requireSession(request: Request, env: Env): Promise<Session | Response> {
  const session = await sessionFrom(request, env)
  if (!session) return json({ error: 'unauthorized' }, 401)
  return session
}

async function rateLimited(env: Env, sub: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM audit_log WHERE actor_sub = ? AND at >= ?',
  )
    .bind(sub, since)
    .first<{ n: number }>()
  return !rateLimitOk((row?.n ?? 0) + 1)
}

async function audit(
  env: Env,
  actor: Session,
  action: string,
  entityId: string,
  before: unknown,
  after: unknown,
  entityType = 'feature',
) {
  await env.DB.prepare(
    `INSERT INTO audit_log (id, at, actor_sub, actor_email, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      new Date().toISOString(),
      actor.sub,
      actor.email,
      action,
      entityType,
      entityId,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    )
    .run()
}

async function upsertUser(env: Env, sub: string, email: string) {
  await env.DB.prepare(
    `INSERT INTO users (sub, email, created_at) VALUES (?, ?, ?)
     ON CONFLICT(sub) DO UPDATE SET email = excluded.email`,
  )
    .bind(sub, email, new Date().toISOString())
    .run()
}

async function saveFeatureRow(env: Env, feature: ReturnType<typeof featureToRow>, isNew: boolean) {
  const values = [
    feature.id,
    feature.kind,
    feature.slug,
    feature.name_en,
    feature.name_zh,
    feature.status,
    feature.start_year,
    feature.start_month,
    feature.start_day,
    feature.start_circa,
    feature.end_year,
    feature.end_month,
    feature.end_day,
    feature.end_circa,
    feature.lng,
    feature.lat,
    feature.body,
    feature.touched,
    feature.created_at,
    feature.updated_at,
    feature.created_by,
    feature.updated_by,
  ]
  if (isNew) {
    await env.DB.prepare(
      `INSERT INTO features (
        id, kind, slug, name_en, name_zh, status,
        start_year, start_month, start_day, start_circa,
        end_year, end_month, end_day, end_circa,
        lng, lat, body, touched, created_at, updated_at, created_by, updated_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(...values)
      .run()
    return
  }
  await env.DB.prepare(
    `UPDATE features SET
      kind=?, slug=?, name_en=?, name_zh=?, status=?,
      start_year=?, start_month=?, start_day=?, start_circa=?,
      end_year=?, end_month=?, end_day=?, end_circa=?,
      lng=?, lat=?, body=?, touched=?, updated_at=?, updated_by=?
     WHERE id=?`,
  )
    .bind(
      feature.kind,
      feature.slug,
      feature.name_en,
      feature.name_zh,
      feature.status,
      feature.start_year,
      feature.start_month,
      feature.start_day,
      feature.start_circa,
      feature.end_year,
      feature.end_month,
      feature.end_day,
      feature.end_circa,
      feature.lng,
      feature.lat,
      feature.body,
      feature.touched,
      feature.updated_at,
      feature.updated_by,
      feature.id,
    )
    .run()
}

async function listInBbox(request: Request, env: Env, touchedOnly: boolean): Promise<Response> {
  const url = new URL(request.url)
  const bbox = parseBbox(url.searchParams.get('bbox'))
  if (!bbox) return json({ error: 'bbox is required' }, 400)
  const kind = url.searchParams.get('kind')
  let sql = 'SELECT * FROM features WHERE lng >= ? AND lng <= ? AND lat >= ? AND lat <= ?'
  const binds: (string | number)[] = [bbox.west, bbox.east, bbox.south, bbox.north]
  if (touchedOnly) sql += ' AND touched = 1'
  if (kind) {
    sql += ' AND kind = ?'
    binds.push(kind)
  }
  sql += ' LIMIT ?'
  binds.push(LIST_CAP)
  const { results } = await env.DB.prepare(sql).bind(...binds).all<FeatureRow>()
  return json((results ?? []).map(featureRowToFeature))
}

async function handleAuthGoogle(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.SESSION_SECRET) return json({ error: 'auth not configured' }, 503)
  const url = new URL(request.url)
  const returnTo = url.searchParams.get('return') || '/hk'
  const nonce = crypto.randomUUID()
  const origin = publicOrigin(request, env)
  const redirectUri = `${origin}/api/auth/callback`
  const state = await signSession(
    { sub: nonce, email: returnTo, exp: Math.floor(Date.now() / 1000) + 600 },
    env.SESSION_SECRET,
  )
  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  google.searchParams.set('client_id', env.GOOGLE_CLIENT_ID)
  google.searchParams.set('redirect_uri', redirectUri)
  google.searchParams.set('response_type', 'code')
  google.searchParams.set('scope', 'openid email profile')
  google.searchParams.set('state', state)
  google.searchParams.set('prompt', 'select_account')
  const secure = origin.startsWith('https:')
  return new Response(null, {
    status: 302,
    headers: {
      location: google.toString(),
      'set-cookie': setCookie(OAUTH_COOKIE, nonce, 600, secure),
    },
  })
}

async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const origin = publicOrigin(request, env)
  const secure = origin.startsWith('https:')
  const fail = () =>
    new Response(null, {
      status: 302,
      headers: { location: `${origin}/hk`, 'set-cookie': clearCookie(OAUTH_COOKIE, secure) },
    })
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SESSION_SECRET) return fail()
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const nonce = cookieValue(request.headers.get('cookie'), OAUTH_COOKIE)
    const parsed = await readSession(state, env.SESSION_SECRET)
    if (!code || !parsed || !nonce || parsed.sub !== nonce) return fail()
    const redirectUri = `${origin}/api/auth/callback`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) return fail()
    const tokens = (await tokenRes.json()) as { access_token?: string }
    if (!tokens.access_token) return fail()
    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userRes.ok) return fail()
    const profile = (await userRes.json()) as { sub?: string; email?: string }
    if (!profile.sub || !profile.email) return fail()
    try {
      await upsertUser(env, profile.sub, profile.email)
    } catch (error) {
      console.error('upsertUser failed', error)
    }
    const session = await signSession(
      { sub: profile.sub, email: profile.email, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS },
      env.SESSION_SECRET,
    )
    const headers = new Headers({ location: parsed.email.startsWith('/') ? parsed.email : `/${parsed.email}` })
    headers.append('set-cookie', clearCookie(OAUTH_COOKIE, secure))
    headers.append('set-cookie', setCookie(SESSION_COOKIE, session, SESSION_DAYS, secure))
    return new Response(null, { status: 302, headers })
  } catch (error) {
    console.error('auth callback failed', error)
    return fail()
  }
}

async function handleWrite(request: Request, env: Env, slug: string | null): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'invalid body' }, 400)
  }
  const write = parseFeatureWrite(payload)
  if ('error' in write) return json({ error: write.error }, 400)
  const now = new Date().toISOString()
  if (slug) {
    const row = await env.DB.prepare('SELECT * FROM features WHERE slug = ?').bind(slug).first<FeatureRow>()
    if (!row) return json({ error: 'not found' }, 404)
    const existing = featureRowToFeature(row)
    const match = checkIfMatch(existing.updatedAt, request.headers.get('If-Match'))
    if (match === 'missing') return json({ error: 'If-Match required' }, 428)
    if (match === 'conflict') return json({ error: 'conflict' }, 412)
    const feature = applyWikiWrite(existing, write, session, existing.id, existing.slug, now)
    await saveFeatureRow(env, featureToRow(feature), false)
    await audit(env, session, 'put', feature.id, existing, feature)
    return json(feature)
  }
  const { results } = await env.DB.prepare('SELECT slug FROM features WHERE slug = ? OR slug LIKE ?')
    .bind(slugify(write.nameEn, write.start?.year), `${slugify(write.nameEn, write.start?.year)}-%`)
    .all<{ slug: string }>()
  const used = new Set((results ?? []).map((item) => item.slug))
  const nextSlug = wikiSlug(write.nameEn, write.start?.year, used)
  const feature = applyWikiWrite(null, write, session, `wiki-${crypto.randomUUID()}`, nextSlug, now)
  await saveFeatureRow(env, featureToRow(feature), true)
  await audit(env, session, 'put', feature.id, null, feature)
  return json(feature, 201)
}

async function handleDelete(request: Request, env: Env, slug: string): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  const row = await env.DB.prepare('SELECT * FROM features WHERE slug = ?').bind(slug).first<FeatureRow>()
  if (!row) return json({ error: 'not found' }, 404)
  const existing = featureRowToFeature(row)
  if (!wikiCanDelete(existing.id)) return json({ error: 'seed rows cannot be deleted' }, 403)
  const match = checkIfMatch(existing.updatedAt, request.headers.get('If-Match'))
  if (match === 'missing') return json({ error: 'If-Match required' }, 428)
  if (match === 'conflict') return json({ error: 'conflict' }, 412)
  await env.DB.prepare(DELETE_PLACE_TAGS).bind(existing.id).run()
  await env.DB.prepare('DELETE FROM features WHERE id = ?').bind(existing.id).run()
  await audit(env, session, 'delete', existing.id, existing, null)
  return json({ ok: true })
}

async function handleAuditList(env: Env, featureId: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, at, actor_email, action, entity_type, entity_id, before_json, after_json
     FROM audit_log
     WHERE (entity_type = 'feature' AND entity_id = ?)
        OR (
          entity_type = 'photo'
          AND (
            json_extract(after_json, '$.featureId') = ?
            OR json_extract(before_json, '$.featureId') = ?
          )
        )
     ORDER BY at DESC LIMIT 50`,
  )
    .bind(featureId, featureId, featureId)
    .all()
  const entries = (results ?? []).flatMap((row) => {
    const parsed = parseAuditRow(row)
    return 'error' in parsed ? [] : [parsed]
  })
  return json(entries)
}

async function handleAuditRevert(request: Request, env: Env, id: string): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  const row = await env.DB.prepare('SELECT * FROM audit_log WHERE id = ?').bind(id).first()
  if (!row) return json({ error: 'not found' }, 404)
  const parsed = parseAuditRow(row)
  if ('error' in parsed) return json({ error: parsed.error }, 400)
  const plan = revertPlan(parsed)
  if ('error' in plan) return json({ error: plan.error }, plan.error.includes('seed') ? 403 : 400)
  const now = new Date().toISOString()
  const current = await env.DB.prepare('SELECT * FROM features WHERE id = ?')
    .bind(plan.feature.id)
    .first<FeatureRow>()
  if (plan.type === 'delete') {
    if (!current) return json({ deleted: true })
    const existing = featureRowToFeature(current)
    const match = checkIfMatch(existing.updatedAt, request.headers.get('If-Match'))
    if (match === 'missing') return json({ error: 'If-Match required' }, 428)
    if (match === 'conflict') return json({ error: 'conflict' }, 412)
    await env.DB.prepare(DELETE_PLACE_TAGS).bind(existing.id).run()
    await env.DB.prepare('DELETE FROM features WHERE id = ?').bind(existing.id).run()
    await audit(env, session, 'revert', existing.id, existing, null)
    return json({ deleted: true })
  }
  const restored = { ...plan.feature, updatedAt: now, updatedBy: session.sub }
  if (current) {
    const existing = featureRowToFeature(current)
    const match = checkIfMatch(existing.updatedAt, request.headers.get('If-Match'))
    if (match === 'missing') return json({ error: 'If-Match required' }, 428)
    if (match === 'conflict') return json({ error: 'conflict' }, 412)
    await saveFeatureRow(env, featureToRow(restored), false)
    await audit(env, session, 'revert', restored.id, existing, restored)
  } else {
    await saveFeatureRow(env, featureToRow(restored), true)
    await audit(env, session, 'revert', restored.id, null, restored)
  }
  return json(restored)
}

function likePattern(needle: string): string {
  return `%${needle.replaceAll('%', '').replaceAll('_', '')}%`
}

async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const raw = url.searchParams.get('q') ?? ''
  const fts = fts5Query(raw)
  const han = hanNeedle(raw)
  if (!fts && !han) return json([])
  const kind = url.searchParams.get('kind')

  const ftsIds: string[] = []
  if (fts) {
    const sql = kind
      ? `SELECT features.id AS id FROM features_fts JOIN features ON features.id = features_fts.id
         WHERE features_fts MATCH ? AND features.kind = ? ORDER BY rank LIMIT ?`
      : `SELECT features.id AS id FROM features_fts JOIN features ON features.id = features_fts.id
         WHERE features_fts MATCH ? ORDER BY rank LIMIT ?`
    const binds = kind ? [fts, kind, SEARCH_FETCH] : [fts, SEARCH_FETCH]
    try {
      const { results } = await env.DB.prepare(sql).bind(...binds).all<{ id: string }>()
      for (const row of results ?? []) ftsIds.push(row.id)
    } catch {
      /* index missing or MATCH rejected */
    }
  }

  const hanIds: string[] = []
  if (han) {
    const like = likePattern(han)
    const sql = kind
      ? 'SELECT id FROM features WHERE (name_zh LIKE ? OR name_en LIKE ?) AND kind = ? LIMIT ?'
      : 'SELECT id FROM features WHERE name_zh LIKE ? OR name_en LIKE ? LIMIT ?'
    const binds = kind ? [like, like, kind, SEARCH_FETCH] : [like, like, SEARCH_FETCH]
    const { results } = await env.DB.prepare(sql).bind(...binds).all<{ id: string }>()
    for (const row of results ?? []) hanIds.push(row.id)
  }

  const ids = mergeSearchIds(ftsIds, hanIds, SEARCH_FETCH)
  if (!ids.length) return json([])
  const placeholders = ids.map(() => '?').join(',')
  const { results } = await env.DB.prepare(`SELECT * FROM features WHERE id IN (${placeholders})`).bind(...ids).all<FeatureRow>()
  const byId = new Map((results ?? []).map((row) => [row.id, featureRowToFeature(row)]))
  const features = ids.flatMap((id) => {
    const feature = byId.get(id)
    return feature ? [feature] : []
  })
  return json(features.slice(0, SEARCH_LIMIT))
}

async function serveCached(
  request: Request,
  ctx: ExecutionContext,
  maxAge: number,
  load: () => Promise<Response>,
  cacheEpoch?: string,
): Promise<Response> {
  const url = new URL(request.url)
  url.searchParams.sort()
  if (cacheEpoch) url.searchParams.set('__cache', cacheEpoch)
  const key = new Request(url.toString(), { method: 'GET' })
  const hit = await caches.default.match(key)
  if (hit) return hit
  const fresh = await load()
  if (fresh.status !== 200) return fresh
  const headers = new Headers(fresh.headers)
  headers.set('cache-control', `public, max-age=${maxAge}`)
  const response = new Response(fresh.body, { status: fresh.status, headers })
  ctx.waitUntil(caches.default.put(key, response.clone()))
  return response
}

function cachedRead(
  request: Request,
  ctx: ExecutionContext,
  route: PublicRead,
  load: () => Promise<Response>,
): Promise<Response> {
  const maxAge = publicReadCacheSeconds(route, request.method)
  if (!maxAge) return load()
  // Bump when sitemap URL shape changes so Cache API does not keep stale chunks.
  const cacheEpoch = route.type === 'sitemap' ? 'locale-hk' : undefined
  return serveCached(request, ctx, maxAge, load, cacheEpoch)
}

async function handleRecent(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(recentListSql())
    .bind(RECENT_LIMIT)
    .all<{
      slug: string
      kind: string
      name_en: string
      name_zh: string
      start_year: number | null
      end_year: number | null
      updated_at: string
    }>()
  return json({ features: (results ?? []).map(recentItemFromRow) })
}

async function handleCounts(env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM features) AS places,
       (SELECT COUNT(*) FROM photos) AS photos`,
  ).first<{ places: number; photos: number }>()
  return json({ places: row?.places ?? 0, photos: row?.photos ?? 0 })
}

function hk80FromWgs(bbox: Bbox): [number, number, number, number] {
  const [minX, minY] = wgsToHk80(bbox.west, bbox.south)
  const [maxX, maxY] = wgsToHk80(bbox.east, bbox.north)
  return clampLotBbox(
    Math.min(minX, maxX),
    Math.min(minY, maxY),
    Math.max(minX, maxX),
    Math.max(minY, maxY),
  )
}

function gisUpstream(route: ApiRoute, url: URL): string | null {
  if (route.type === 'gisBuildings') {
    const parsed = parseBbox(url.searchParams.get('bbox'))
    const bbox = parsed ? clampGisBbox(parsed) : null
    return bbox ? csdiBuildingsUrl(bbox) : null
  }
  if (route.type === 'gisParcels') {
    const kind = parseParcelKind(url.searchParams.get('kind'))
    const parsed = parseBbox(url.searchParams.get('bbox'))
    const bbox = parsed ? clampGisBbox(parsed) : null
    return kind && bbox ? landsdParcelUrl(kind, hk80FromWgs(bbox)) : null
  }
  if (route.type === 'gisParcelSearch') {
    const kind = parseParcelKind(url.searchParams.get('kind'))
    const text = parseSearchText(url.searchParams.get('q'))
    return kind && text ? landsdSearchUrl(kind, text) : null
  }
  return null
}

function gisAllowlisted(upstream: string): boolean {
  return upstream.startsWith(`${CSDI_WFS}?`) || upstream.startsWith(`${LANDSD_ROOT}/gs/api/v1.0.0/`)
}

async function handleGis(request: Request, route: ApiRoute, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const upstream = gisUpstream(route, url)
  if (!upstream || !gisAllowlisted(upstream)) return json({ error: 'invalid gis query' }, 400)
  const cache = caches.default
  const cacheUrl = new URL(request.url)
  cacheUrl.searchParams.sort()
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' })
  const hit = await cache.match(cacheKey)
  if (hit) return hit
  const upstreamResponse = await fetch(upstream, {
    headers: { 'user-agent': 'hk-atlas/1.0' },
  })
  const headers = new Headers()
  const contentType = upstreamResponse.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  headers.set('cache-control', `public, max-age=${GIS_CACHE_SECONDS}`)
  const response = new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  })
  if (upstreamResponse.ok) ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

const PHOTO_LIST_CAP = 200

type PhotoListRow = {
  id: string
  feature_id: string
  lng: number
  lat: number
  source: string
  caption: string
  photographer: string
  license: string
  year: number | null
  circa: number
  source_url: string
  original_key: string
  map_key: string
  panel_key: string
  created_at: string
  created_by: string
}

const PHOTO_SELECT =
  'id, feature_id, lng, lat, source, caption, photographer, license, year, circa, source_url, original_key, map_key, panel_key, created_at, created_by'

function photoBucket(env: Env): PhotoBucket | null {
  if (!env.PHOTOS || !env.IMAGES) return null
  const images = env.IMAGES
  const bucket = env.PHOTOS
  return {
    async findPlace(id) {
      return env.DB.prepare('SELECT id, lng, lat FROM features WHERE id = ?')
        .bind(id)
        .first<{ id: string; lng: number | null; lat: number | null }>()
    },
    async put(key, body, contentType) {
      await bucket.put(key, body, { httpMetadata: { contentType } })
    },
    async delete(key) {
      await bucket.delete(key)
    },
    async insert(row) {
      await env.DB.prepare(
        `INSERT INTO photos (
          id, feature_id, lng, lat, source, caption, photographer, license, year, circa,
          source_url, original_key, map_key, panel_key, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          row.id,
          row.featureId,
          row.lng,
          row.lat,
          row.source,
          row.caption,
          row.photographer,
          row.license,
          row.year,
          row.circa ? 1 : 0,
          row.sourceUrl,
          row.originalKey,
          row.mapKey,
          row.panelKey,
          row.createdAt,
          row.createdBy,
        )
        .run()
    },
    async deleteRow(id) {
      await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run()
    },
    async inspect(bytes) {
      try {
        const info = await images.info(new Blob([bytes]).stream())
        return typeof info.format === 'string' && info.format.length > 0
      } catch {
        return false
      }
    },
    async thumbnail(bytes, edge) {
      const rendered = (
        await images
          .input(new Blob([bytes]).stream())
          .transform({ width: edge })
          .output({ format: 'image/webp', quality: edge <= 96 ? 70 : 75 })
      ).response()
      if (!rendered.ok) throw new Error('thumbnail failed')
      return rendered.arrayBuffer()
    },
  }
}

function photoFromRow(row: PhotoListRow): Photo {
  return {
    id: row.id,
    featureId: row.feature_id,
    lng: row.lng,
    lat: row.lat,
    source: row.source,
    caption: row.caption,
    photographer: row.photographer,
    license: row.license,
    year: row.year,
    circa: Boolean(row.circa),
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    createdBy: row.created_by,
    tags: [],
  }
}

async function handlePhotoList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const featureId = url.searchParams.get('featureId')
  const bbox = parseBbox(url.searchParams.get('bbox'))
  if (!featureId && !bbox) return json({ error: 'featureId or bbox is required' }, 400)
  let sql = `SELECT ${PHOTO_SELECT} FROM photos WHERE 1 = 1`
  const filter = photoListFilter({ featureId, bbox })
  sql += filter.sql
  sql += ' ORDER BY created_at DESC LIMIT ?'
  const binds = [...filter.binds, PHOTO_LIST_CAP]
  const { results } = await env.DB.prepare(sql).bind(...binds).all<PhotoListRow>()
  const photos = (results ?? []).map(photoFromRow)
  const tags = await photoTagsFor(env, photos.map((photo) => photo.id))
  return json({ photos: attachPhotoTags(photos, tags) })
}

async function handlePhotoCreate(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  const store = photoBucket(env)
  if (!store) return json({ error: 'photos not configured' }, 503)
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'file' }, 400)
  }
  const file = form.get('file')
  if (!(file instanceof File) || file.size <= 0 || file.size > PHOTO_MAX_BYTES) {
    return json({ error: 'file' }, 400)
  }
  const result = await createPhoto(store, {
    id: crypto.randomUUID(),
    featureId: String(form.get('featureId') ?? ''),
    source: String(form.get('source') ?? ''),
    caption: String(form.get('caption') ?? ''),
    photographer: String(form.get('photographer') ?? ''),
    license: String(form.get('license') ?? ''),
    year: String(form.get('year') ?? ''),
    circa: form.get('circa'),
    sourceUrl: String(form.get('sourceUrl') ?? ''),
    bytes: await file.arrayBuffer(),
    createdAt: new Date().toISOString(),
    createdBy: session.sub,
  })
  if (!result.ok) return json({ error: result.error }, result.error === 'store' ? 500 : 400)
  await audit(env, session, 'put', result.photo.id, null, result.photo, 'photo')
  return json(result.photo, 201)
}

async function handlePhotoUpdate(request: Request, env: Env, id: string): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'source' }, 400)
  }
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const source = typeof record.source === 'string' ? record.source : ''
  const caption = typeof record.caption === 'string' ? record.caption : ''
  const photographer = typeof record.photographer === 'string' ? record.photographer : ''
  const license = typeof record.license === 'string' ? record.license : ''
  const sourceUrl = typeof record.sourceUrl === 'string' ? record.sourceUrl : ''
  const issues = photoMetaIssues({
    source,
    caption,
    photographer,
    license,
    sourceUrl,
    year: record.year,
    circa: record.circa,
  })
  if (issues.length > 0) return json({ error: issues[0] }, 400)
  const taken = normalizePhotoTaken({ year: record.year, circa: record.circa })
  if ('error' in taken) return json({ error: 'year' }, 400)
  const row = await env.DB.prepare(`SELECT ${PHOTO_SELECT} FROM photos WHERE id = ?`)
    .bind(id)
    .first<PhotoListRow>()
  if (!row) return json({ error: 'not found' }, 404)
  if (row.created_by !== session.sub) return json({ error: 'forbidden' }, 403)
  const before = photoFromRow(row)
  await env.DB.prepare(
    `UPDATE photos SET source = ?, caption = ?, photographer = ?, license = ?, year = ?, circa = ?, source_url = ? WHERE id = ?`,
  )
    .bind(
      source.trim(),
      caption.trim(),
      photographer.trim(),
      license.trim(),
      taken.year,
      taken.circa ? 1 : 0,
      sourceUrl.trim(),
      id,
    )
    .run()
  const updated = photoFromRow({
    ...row,
    source: source.trim(),
    caption: caption.trim(),
    photographer: photographer.trim(),
    license: license.trim(),
    year: taken.year,
    circa: taken.circa ? 1 : 0,
    source_url: sourceUrl.trim(),
  })
  const tags = await photoTagsFor(env, [id])
  const [withTags] = attachPhotoTags([updated], tags)
  await audit(env, session, 'put', id, before, withTags ?? updated, 'photo')
  return json(withTags ?? updated)
}

async function handlePhotoDelete(request: Request, env: Env, id: string): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  const store = photoBucket(env)
  if (!store) return json({ error: 'photos not configured' }, 503)
  const row = await env.DB.prepare(`SELECT ${PHOTO_SELECT} FROM photos WHERE id = ?`)
    .bind(id)
    .first<PhotoListRow>()
  if (!row) return json({ error: 'not found' }, 404)
  const stored: StoredPhoto = {
    id: row.id,
    featureId: row.feature_id,
    lng: row.lng,
    lat: row.lat,
    source: row.source,
    caption: row.caption,
    photographer: row.photographer,
    license: row.license,
    year: row.year,
    circa: Boolean(row.circa),
    sourceUrl: row.source_url,
    originalKey: row.original_key,
    mapKey: row.map_key,
    panelKey: row.panel_key,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }
  const removed = await removePhoto(store, stored, session.sub)
  if (removed === 'forbidden') return json({ error: 'forbidden' }, 403)
  await env.DB.prepare(DELETE_PHOTO_TAGS).bind(stored.id).run()
  await audit(env, session, 'delete', stored.id, photoFromRow(row), null, 'photo')
  return json({ ok: true })
}

async function handlePhotoThumb(request: Request, env: Env, id: string): Promise<Response> {
  const size = new URL(request.url).searchParams.get('size')
  if (size !== 'map' && size !== 'panel') return json({ error: 'size' }, 400)
  if (!env.PHOTOS) return json({ error: 'photos not configured' }, 503)
  const row = await env.DB.prepare('SELECT map_key, panel_key FROM photos WHERE id = ?')
    .bind(id)
    .first<{ map_key: string; panel_key: string }>()
  if (!row) return json({ error: 'not found' }, 404)
  const object = await env.PHOTOS.get(size === 'map' ? row.map_key : row.panel_key)
  if (!object) return json({ error: 'not found' }, 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  if (!headers.get('content-type')) headers.set('content-type', 'image/webp')
  return new Response(object.body, { headers })
}

type PhotoTagRow = {
  id: string
  photo_id: string
  feature_id: string
  x: number
  y: number
  name_en: string
  name_zh: string
  slug: string
  kind: string
}

function photoTagFromRow(row: PhotoTagRow): PhotoTag & { photoId: string } {
  return {
    photoId: row.photo_id,
    id: row.id,
    featureId: row.feature_id,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    slug: row.slug,
    kind: row.kind,
    x: row.x,
    y: row.y,
  }
}

async function photoTagsFor(env: Env, photoIds: string[]): Promise<(PhotoTag & { photoId: string })[]> {
  if (photoIds.length === 0) return []
  const marks = photoIds.map(() => '?').join(', ')
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.photo_id, t.feature_id, t.x, t.y, f.name_en, f.name_zh, f.slug, f.kind
     FROM photo_tags t
     JOIN features f ON f.id = t.feature_id
     WHERE t.photo_id IN (${marks})`,
  )
    .bind(...photoIds)
    .all<PhotoTagRow>()
  return (results ?? []).map(photoTagFromRow)
}

async function handlePhotoFile(_request: Request, env: Env, id: string): Promise<Response> {
  if (!env.PHOTOS) return json({ error: 'photos not configured' }, 503)
  const row = await env.DB.prepare('SELECT original_key FROM photos WHERE id = ?')
    .bind(id)
    .first<{ original_key: string }>()
  if (!row) return json({ error: 'not found' }, 404)
  const object = await env.PHOTOS.get(row.original_key)
  if (!object) return json({ error: 'not found' }, 404)
  const bytes = new Uint8Array(await object.arrayBuffer())
  const media = imageMediaType(bytes)
  if (!media) return json({ error: 'not found' }, 404)
  return new Response(bytes, {
    headers: {
      'content-type': media,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

async function handlePhotoTagCreate(request: Request, env: Env, photoId: string): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'point' }, 400)
  }
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const featureId = typeof record.featureId === 'string' ? record.featureId : ''
  const issues = photoTagIssues({ featureId, x: record.x, y: record.y })
  if (issues.includes('point')) return json({ error: 'point' }, 400)
  if (issues.includes('place')) return json({ error: 'place' }, 400)
  const photo = await env.DB.prepare('SELECT id FROM photos WHERE id = ?').bind(photoId).first<{ id: string }>()
  if (!photo) return json({ error: 'not found' }, 404)
  const feature = await env.DB.prepare(
    'SELECT id, name_en, name_zh, slug, kind FROM features WHERE id = ?',
  )
    .bind(featureId.trim())
    .first<{ id: string; name_en: string; name_zh: string; slug: string; kind: string }>()
  if (!feature) return json({ error: 'place' }, 404)
  const now = new Date().toISOString()
  const x = record.x as number
  const y = record.y as number
  await env.DB.prepare(PHOTO_TAG_UPSERT)
    .bind(crypto.randomUUID(), photoId, feature.id, x, y, now, session.sub)
    .run()
  const saved = await env.DB.prepare('SELECT id, x, y FROM photo_tags WHERE photo_id = ? AND feature_id = ?')
    .bind(photoId, feature.id)
    .first<{ id: string; x: number; y: number }>()
  if (!saved) return json({ error: 'not found' }, 404)
  const tag: PhotoTag = {
    id: saved.id,
    featureId: feature.id,
    nameEn: feature.name_en,
    nameZh: feature.name_zh,
    slug: feature.slug,
    kind: feature.kind,
    x: saved.x,
    y: saved.y,
  }
  return json(tag)
}

async function handlePhotoTagDelete(request: Request, env: Env, photoId: string, tagId: string): Promise<Response> {
  const session = await requireSession(request, env)
  if (session instanceof Response) return session
  if (await rateLimited(env, session.sub)) return json({ error: 'rate limited' }, 429)
  const tag = await env.DB.prepare('SELECT id FROM photo_tags WHERE id = ? AND photo_id = ?')
    .bind(tagId, photoId)
    .first<{ id: string }>()
  if (!tag) return json({ error: 'not found' }, 404)
  await env.DB.prepare('DELETE FROM photo_tags WHERE id = ?').bind(tagId).run()
  return json({ ok: true })
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const origin = publicOrigin(request, env)
    if (request.method === 'GET' || request.method === 'HEAD') {
      const hostRedirect = canonicalHostRedirect(request.url, origin)
      if (hostRedirect) return redirect(hostRedirect)
      const rootRedirect = rootPathRedirect(url.pathname, origin)
      if (rootRedirect) return redirect(rootRedirect)
      const placesRedirect = placesPageRedirect(url.pathname)
      if (placesRedirect) return redirect(`${origin}${placesRedirect}`)
      if (url.pathname === '/robots.txt') return textPlain(robotsTxt(origin))
      if (url.pathname === '/llms.txt') return textPlain(llmsTxt(origin))
      if (parseSitemapPath(url.pathname)) {
        return cachedRead(request, ctx, { type: 'sitemap' }, async () => {
          return (await handleSitemap(env, origin, url.pathname)) ?? json({ error: 'not found' }, 404)
        })
      }
    }
    const route = parseApiRoute(url)
    if (!route) {
      if (request.method === 'GET' || request.method === 'HEAD') {
        const seo = parseSeoPath(url.pathname)
        if (seo) return handleSeoPage(request, env, seo)
      }
      if (env.ASSETS) {
        const asset = await env.ASSETS.fetch(request)
        const measurementId = gaId(request, env)
        if (!measurementId || !asset.headers.get('content-type')?.includes('text/html')) return asset
        const body = await asset.text()
        if (body.includes('googletagmanager.com/gtag')) return html(body, asset.status)
        return html(body.replace('</head>', `${gtagSnippet(measurementId)}</head>`), asset.status)
      }
      return json({ error: 'not found' }, 404)
    }

    if (route.type === 'authGoogle' && request.method === 'GET') return handleAuthGoogle(request, env)
    if (route.type === 'authCallback' && request.method === 'GET') return handleAuthCallback(request, env)
    if (route.type === 'authLogout' && (request.method === 'GET' || request.method === 'POST')) {
      const origin = publicOrigin(request, env)
      const secure = origin.startsWith('https:')
      const returnTo = url.searchParams.get('return') || '/hk'
      return new Response(null, {
        status: 302,
        headers: {
          location: returnTo.startsWith('/') ? returnTo : '/hk',
          'set-cookie': clearCookie(SESSION_COOKIE, secure),
        },
      })
    }
    if (route.type === 'me' && request.method === 'GET') {
      const session = await sessionFrom(request, env)
      return json({
        user: session ? { sub: session.sub, email: session.email } : null,
        auth: Boolean(env.GOOGLE_CLIENT_ID && env.SESSION_SECRET),
      })
    }
    if (route.type === 'overlay' && request.method === 'GET') return listInBbox(request, env, true)
    if (route.type === 'search' && request.method === 'GET') {
      return cachedRead(request, ctx, route, () => handleSearch(request, env))
    }
    if (route.type === 'recent' && request.method === 'GET') {
      return cachedRead(request, ctx, route, () => handleRecent(env))
    }
    if (route.type === 'counts' && request.method === 'GET') {
      return cachedRead(request, ctx, route, () => handleCounts(env))
    }
    if (route.type === 'audit' && request.method === 'GET') return handleAuditList(env, route.featureId)
    if (route.type === 'auditRevert' && request.method === 'POST') return handleAuditRevert(request, env, route.id)
    if (route.type === 'list' && request.method === 'GET') return listInBbox(request, env, false)
    if (route.type === 'list' && request.method === 'PUT') return handleWrite(request, env, null)
    if (route.type === 'feature' && request.method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM features WHERE slug = ?').bind(route.slug).first<FeatureRow>()
      if (!row) return json({ error: 'not found' }, 404)
      return json(featureRowToFeature(row))
    }
    if (route.type === 'feature' && request.method === 'PUT') return handleWrite(request, env, route.slug)
    if (route.type === 'feature' && request.method === 'DELETE') return handleDelete(request, env, route.slug)
    if (route.type === 'photos' && request.method === 'GET') return handlePhotoList(request, env)
    if (route.type === 'photos' && request.method === 'POST') return handlePhotoCreate(request, env)
    if (route.type === 'photo' && request.method === 'PATCH') return handlePhotoUpdate(request, env, route.id)
    if (route.type === 'photo' && request.method === 'DELETE') return handlePhotoDelete(request, env, route.id)
    if (route.type === 'photoThumb' && request.method === 'GET') return handlePhotoThumb(request, env, route.id)
    if (route.type === 'photoFile' && request.method === 'GET') return handlePhotoFile(request, env, route.id)
    if (route.type === 'photoTags' && request.method === 'POST') return handlePhotoTagCreate(request, env, route.id)
    if (route.type === 'photoTag' && request.method === 'DELETE') {
      return handlePhotoTagDelete(request, env, route.id, route.tagId)
    }
    if (route.type === 'edges' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT * FROM edges WHERE (from_id = ? AND from_type != 'csdi_building') OR (to_id = ? AND to_type != 'csdi_building')`,
      )
        .bind(route.featureId, route.featureId)
        .all()
      return json(results ?? [])
    }
    if (
      (route.type === 'gisBuildings' || route.type === 'gisParcels' || route.type === 'gisParcelSearch')
      && request.method === 'GET'
    ) {
      return handleGis(request, route, ctx)
    }
    return json({ error: 'method not allowed' }, 405)
  },
}
