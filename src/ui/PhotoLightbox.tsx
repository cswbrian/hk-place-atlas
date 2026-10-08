import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { fetchSearch } from '../api/features'
import { deletePhotoTag, originalPath, savePhotoTag, updatePhoto } from '../api/photos'
import type { Feature, FeatureKind } from '../domain/feature'
import { copy, displayNames, type SiteLocale } from '../domain/locale'
import {
  formatPhotoTaken,
  normalizePhotoTaken,
  photoDetailText,
  photoDetailUrlHost,
  photoMetaComplete,
  photoMetaIssues,
  type Photo,
} from '../domain/photo'
import { dragTagPoint, imageClickFraction, pinLabelPosition, type PhotoTag } from '../domain/photoTag'
import {
  photoDraftAllowsPaging,
  photoDraftCanFinish,
  photoDraftCloseKind,
  photoDraftShouldPersistMeta,
} from '../domain/photoUploadSession'
import { fts5Query, hanNeedle } from '../domain/search'
import { Button } from './Button'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './icons'
import { YearField } from './YearField'

function canSearchPlaces(query: string): boolean {
  return fts5Query(query) != null || hanNeedle(query) != null
}

type Draft = {
  x: number
  y: number
  query: string
}

type TagDrag = {
  tagId: string
  x: number
  y: number
  startX: number
  startY: number
  moved: boolean
}

type Props = {
  photos: Photo[]
  index: number
  locale: SiteLocale
  placeFeatureId: string
  placeName: string
  userSub: string | null
  signInHref: string
  draftSession?: boolean
  onClose: () => void
  onDone?: () => void
  onDiscard?: () => void | Promise<void>
  onIndex: (index: number) => void
  onOpenPlace: (slug: string, kind: FeatureKind) => void
  onCreatePlace: (request: {
    nameEn: string
    lng: number
    lat: number
    commit: (featureId: string) => Promise<void>
  }) => void
  onTags: (photoId: string, tags: PhotoTag[]) => void
  onPhotoUpdate: (photo: Photo) => void
  onDelete?: (photo: Photo) => Promise<void>
}

function tagMessage(code: string, text: (typeof copy)[SiteLocale]): string {
  if (code === 'place' || code === 'not found') return text.tagMissing
  if (code === 'rate limited') return text.photoRate
  if (code === 'unauthorized') return text.signInToTag
  return text.tagFailed
}

function metaMessage(code: string, text: (typeof copy)[SiteLocale]): string {
  if (code === 'source') return text.photoSourceRequired
  if (code === 'sourceUrl') return text.photoUrlRequired
  if (code === 'year') return text.photoYearInvalid
  if (code === 'rate limited') return text.photoRate
  if (code === 'forbidden' || code === 'unauthorized') return text.signInToTag
  return text.photoFailed
}

function withTag(tags: PhotoTag[], tag: PhotoTag): PhotoTag[] {
  const rest = tags.filter((item) => item.featureId !== tag.featureId)
  return [...rest, tag]
}

export function PhotoLightbox({
  photos,
  index,
  locale,
  placeFeatureId,
  placeName,
  userSub,
  signInHref,
  draftSession = false,
  onClose,
  onDone,
  onDiscard,
  onIndex,
  onOpenPlace,
  onCreatePlace,
  onTags,
  onPhotoUpdate,
  onDelete,
}: Props) {
  const text = copy[locale]
  const signedIn = Boolean(userSub)
  const photo = photos[index]
  const allowsPaging = photoDraftAllowsPaging(draftSession)
  const canFinishDraft = photoDraftCanFinish({
    placeFeatureId,
    tags: photo?.tags,
  })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [results, setResults] = useState<Feature[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTags, setShowTags] = useState(true)
  const [source, setSource] = useState('')
  const [caption, setCaption] = useState('')
  const [photographer, setPhotographer] = useState('')
  const [license, setLicense] = useState('')
  const [year, setYear] = useState('')
  const [circa, setCirca] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [metaError, setMetaError] = useState<string | null>(null)
  const [metaSaved, setMetaSaved] = useState(false)
  const [metaPending, setMetaPending] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [cursorHint, setCursorHint] = useState<{ left: number; top: number } | null>(null)
  const cursorHintRef = useRef<HTMLDivElement>(null)
  const [editingTags, setEditingTags] = useState(draftSession && signedIn)
  const [drag, setDrag] = useState<TagDrag | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  function placeCursorHint(event: ReactMouseEvent<HTMLElement>) {
    if (!editingTags || draft || drag) {
      setCursorHint(null)
      return
    }
    const gap = 14
    const pad = 8
    const tip = cursorHintRef.current
    const width = tip?.offsetWidth || 200
    const height = tip?.offsetHeight || 36
    let left = event.clientX + gap
    let top = event.clientY + gap
    if (left + width > window.innerWidth - pad) left = event.clientX - width - gap
    if (top + height > window.innerHeight - pad) top = event.clientY - height - gap
    if (left < pad) left = pad
    if (top < pad) top = pad
    setCursorHint({ left, top })
  }

  const needsLocate = Boolean(
    placeFeatureId &&
      photo &&
      !(photo.tags ?? []).some((tag) => tag.featureId === placeFeatureId),
  )
  const canEditMeta = Boolean(userSub && photo && userSub === photo.createdBy)

  useEffect(() => {
    setDraft(null)
    setResults([])
    setError(null)
    setMetaError(null)
    setMetaSaved(false)
    setCursorHint(null)
    setEditingTags(draftSession && signedIn)
    setDrag(null)
    const current = photos[index]
    const incomplete = Boolean(
      current && userSub && userSub === current.createdBy && !photoMetaComplete(current),
    )
    setEditingMeta(incomplete)
  }, [photo?.id, userSub])

  useEffect(() => {
    if (!photo || editingMeta) return
    setSource(photo.source)
    setCaption(photo.caption)
    setPhotographer(photo.photographer)
    setLicense(photo.license)
    setYear(photo.year != null ? String(photo.year) : '')
    setCirca(photo.circa)
    setSourceUrl(photo.sourceUrl)
  }, [
    photo?.id,
    photo?.source,
    photo?.caption,
    photo?.photographer,
    photo?.license,
    photo?.year,
    photo?.circa,
    photo?.sourceUrl,
    editingMeta,
  ])

  useEffect(() => {
    if (!draft || !signedIn || needsLocate) return
    const query = draft.query.trim()
    if (!query || !canSearchPlaces(query)) {
      setResults([])
      setSearching(false)
      return
    }
    let cancel = false
    setSearching(true)
    const timer = window.setTimeout(() => {
      void fetchSearch(query)
        .then((rows) => {
          if (cancel) return
          setResults(rows)
          setSearching(false)
        })
        .catch(() => {
          if (cancel) return
          setResults([])
          setSearching(false)
          setError(text.tagSearchFailed)
        })
    }, 250)
    return () => {
      cancel = true
      window.clearTimeout(timer)
    }
  }, [draft, signedIn, needsLocate, text.tagSearchFailed])

  async function requestClose() {
    if (photoDraftCloseKind(draftSession) === 'confirm-discard') {
      if (!window.confirm(text.discardPhotoConfirm)) return false
      await onDiscard?.()
      return true
    }
    onClose()
    return true
  }

  async function deleteCurrent() {
    if (!photo || !onDelete || !window.confirm(text.deletePhotoConfirm)) return
    setError(null)
    try {
      await onDelete(photo)
    } catch (err) {
      setError(metaMessage(err instanceof Error ? err.message : '', text))
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (event.key === 'Escape') {
        if (draft) setDraft(null)
        else if (editingTags && !draftSession) setEditingTags(false)
        else void requestClose()
        return
      }
      if (typing || !allowsPaging) return
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (event.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [allowsPaging, draft, draftSession, editingTags, index, onClose, onDiscard, onIndex, photos.length, text.discardPhotoConfirm])

  if (!photo) return null

  async function pinAt(featureId: string, point: { x: number; y: number }) {
    setError(null)
    try {
      const tag = await savePhotoTag({
        photoId: photo.id,
        featureId,
        x: point.x,
        y: point.y,
      })
      onTags(photo.id, withTag(photo.tags ?? [], tag))
      setShowTags(true)
      setDraft(null)
      setResults([])
    } catch (err) {
      setError(tagMessage(err instanceof Error ? err.message : '', text))
    }
  }

  async function choose(feature: Feature, point: Draft) {
    await pinAt(feature.id, point)
  }

  async function remove(tag: PhotoTag) {
    if (!window.confirm(text.removeTagConfirm)) return
    setError(null)
    try {
      await deletePhotoTag(photo.id, tag.id)
      onTags(photo.id, (photo.tags ?? []).filter((item) => item.id !== tag.id))
    } catch (err) {
      setError(tagMessage(err instanceof Error ? err.message : '', text))
    }
  }

  async function move(tag: PhotoTag, point: { x: number; y: number }) {
    const before = photo.tags ?? []
    setError(null)
    onTags(photo.id, withTag(before, { ...tag, ...point }))
    try {
      const saved = await savePhotoTag({ photoId: photo.id, featureId: tag.featureId, ...point })
      onTags(photo.id, withTag(before, saved))
    } catch (err) {
      onTags(photo.id, before)
      setError(tagMessage(err instanceof Error ? err.message : '', text))
    }
  }

  function dragTo(event: ReactPointerEvent<HTMLElement>, tag: PhotoTag) {
    const img = imgRef.current
    if (!drag || drag.tagId !== tag.id || !img) return
    const rect = img.getBoundingClientRect()
    const point = dragTagPoint(
      tag,
      { x: drag.startX, y: drag.startY },
      { x: event.clientX, y: event.clientY },
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      { width: img.naturalWidth, height: img.naturalHeight },
    )
    const moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4
    setDrag({ ...drag, ...(point ?? {}), moved })
  }

  function stopEditingTags() {
    setEditingTags(false)
    setDraft(null)
    setResults([])
    setError(null)
    setCursorHint(null)
  }

  async function saveMeta() {
    const issues = photoMetaIssues({
      source,
      caption,
      photographer,
      license,
      sourceUrl,
      year,
      circa,
    })
    if (issues.length > 0) {
      setMetaError(metaMessage(issues[0]!, text))
      setMetaSaved(false)
      return
    }
    const taken = normalizePhotoTaken({ year, circa })
    if ('error' in taken) {
      setMetaError(metaMessage('year', text))
      setMetaSaved(false)
      return
    }
    setMetaPending(true)
    setMetaError(null)
    setMetaSaved(false)
    try {
      const saved = await updatePhoto({
        id: photo.id,
        source,
        caption,
        photographer,
        license,
        year: taken.year,
        circa: taken.circa,
        sourceUrl,
      })
      onPhotoUpdate({ ...saved, tags: photo.tags ?? saved.tags ?? [] })
      setMetaSaved(true)
      setEditingMeta(false)
    } catch (err) {
      setMetaError(metaMessage(err instanceof Error ? err.message : '', text))
    } finally {
      setMetaPending(false)
    }
  }

  async function finishDraft() {
    if (!canFinishDraft || !photo) return
    const payload = { source, caption, photographer, license, sourceUrl, year, circa }
    if (!photoDraftShouldPersistMeta(payload)) {
      const issue = photoMetaIssues(payload)[0]
      if (issue) setMetaError(metaMessage(issue, text))
      setMetaSaved(false)
      onDone?.()
      return
    }
    const taken = normalizePhotoTaken({ year, circa })
    if ('error' in taken) return
    setMetaPending(true)
    setMetaError(null)
    setMetaSaved(false)
    try {
      const saved = await updatePhoto({
        id: photo.id,
        source,
        caption,
        photographer,
        license,
        year: taken.year,
        circa: taken.circa,
        sourceUrl,
      })
      onPhotoUpdate({ ...saved, tags: photo.tags ?? saved.tags ?? [] })
      onDone?.()
    } catch (err) {
      setMetaError(metaMessage(err instanceof Error ? err.message : '', text))
    } finally {
      setMetaPending(false)
    }
  }

  async function onMetaSubmit(event: FormEvent) {
    event.preventDefault()
    if (draftSession) {
      await finishDraft()
      return
    }
    await saveMeta()
  }

  function cancelMeta() {
    setSource(photo.source)
    setCaption(photo.caption)
    setPhotographer(photo.photographer)
    setLicense(photo.license)
    setYear(photo.year != null ? String(photo.year) : '')
    setCirca(photo.circa)
    setSourceUrl(photo.sourceUrl)
    setMetaError(null)
    setMetaSaved(false)
    setEditingMeta(
      Boolean(userSub && userSub === photo.createdBy && !photoMetaComplete(photo)),
    )
  }

  const query = draft?.query.trim() ?? ''
  const searchable = canSearchPlaces(query)
  const showCreate = Boolean(
    draft && signedIn && !needsLocate && searchable && !searching && results.length === 0 && !error,
  )
  const showShortHint = Boolean(draft && signedIn && !needsLocate && query && !searchable)
  const takenLabel = formatPhotoTaken(photo.year, photo.circa)
  const draftMetaIssue = draftSession
    ? photoMetaIssues({ source, caption, photographer, license, sourceUrl, year, circa })[0]
    : undefined
  const shownMetaError = metaError ?? (draftMetaIssue ? metaMessage(draftMetaIssue, text) : null)

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.source || text.photos}>
      <div className="lightbox-bar">
        {allowsPaging ? (
          <>
            <button
              type="button"
              className="lightbox-icon"
              disabled={index === 0}
              aria-label={text.photoPrev}
              title={text.photoPrev}
              onClick={() => onIndex(index - 1)}
            >
              <ChevronLeftIcon />
            </button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              className="lightbox-icon"
              disabled={index >= photos.length - 1}
              aria-label={text.photoNext}
              title={text.photoNext}
              onClick={() => onIndex(index + 1)}
            >
              <ChevronRightIcon />
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="lightbox-icon"
          aria-label={text.photoClose}
          title={text.photoClose}
          onClick={() => void requestClose()}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="lightbox-body">
        <div className="lightbox-main">
          <div className="lightbox-stage">
            <div className="lightbox-tag-actions">
              {!editingTags ? (
                <Button
                  variant="ghost"
                  className={`lightbox-tag-toggle${showTags ? ' is-on' : ''}`}
                  aria-pressed={showTags}
                  onClick={() => setShowTags((current) => !current)}
                >
                  {showTags ? text.hideTags : text.showTags}
                </Button>
              ) : null}
              {!signedIn ? (
                <a className="lightbox-tag-toggle" href={signInHref}>
                  {text.signInToTag}
                </a>
              ) : editingTags ? (
                draftSession ? null : (
                  <Button variant="ghost" className="lightbox-tag-toggle is-on" onClick={stopEditingTags}>
                    {text.doneEditingTags}
                  </Button>
                )
              ) : (
                <Button
                  variant="ghost"
                  className="lightbox-tag-toggle"
                  onClick={() => {
                    setShowTags(true)
                    setEditingTags(true)
                  }}
                >
                  {text.editTags}
                </Button>
              )}
            </div>
            <div
              className={`lightbox-photo${editingTags ? ' is-editing' : ''}`}
              onMouseMove={placeCursorHint}
              onMouseLeave={() => setCursorHint(null)}
            >
              <img
                ref={imgRef}
                src={originalPath(photo.id)}
                alt={photo.caption || photo.source}
                onClick={(event) => {
                  if (!editingTags) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  const point = imageClickFraction(
                    { x: event.clientX, y: event.clientY },
                    { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight },
                  )
                  if (!point) return
                  setError(null)
                  setResults([])
                  setCursorHint(null)
                  if (needsLocate) {
                    void pinAt(placeFeatureId, point)
                    return
                  }
                  setDraft({ ...point, query: '' })
                }}
              />
              {editingTags && !draft ? (
                <div
                  ref={cursorHintRef}
                  className={`lightbox-cursor-hint${cursorHint ? ' is-visible' : ''}`}
                  style={
                    cursorHint
                      ? { left: cursorHint.left, top: cursorHint.top }
                      : { left: -9999, top: -9999 }
                  }
                  aria-hidden="true"
                >
                  <p>{needsLocate ? text.locatePlaceHint : text.tagHint}</p>
                  {needsLocate ? <p>{placeName}</p> : null}
                </div>
              ) : null}
              {showTags
                ? (photo.tags ?? []).map((tag) => {
                    const name = displayNames(tag, locale).title
                    const dragging = drag?.tagId === tag.id
                    const at = dragging ? drag : tag
                    return (
                      <div
                        key={tag.id}
                        className={`photo-pin${dragging ? ' is-dragging' : ''}`}
                        style={pinLabelPosition(at.x, at.y)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="photo-pin-name"
                          onPointerDown={(event) => {
                            if (!editingTags || event.button !== 0) return
                            event.currentTarget.setPointerCapture(event.pointerId)
                            setDraft(null)
                            setDrag({
                              tagId: tag.id,
                              x: tag.x,
                              y: tag.y,
                              startX: event.clientX,
                              startY: event.clientY,
                              moved: false,
                            })
                          }}
                          onPointerMove={(event) => dragTo(event, tag)}
                          onPointerUp={() => {
                            if (!drag || !dragging) return
                            setDrag(null)
                            if (drag.moved) void move(tag, { x: drag.x, y: drag.y })
                          }}
                          onPointerCancel={() => setDrag(null)}
                          onClick={() => {
                            if (editingTags) return
                            void requestClose().then((closed) => {
                              if (closed) onOpenPlace(tag.slug, tag.kind as FeatureKind)
                            })
                          }}
                        >
                          {name}
                        </button>
                        {editingTags ? (
                          <button
                            type="button"
                            className="photo-pin-remove"
                            aria-label={text.removeTag}
                            onClick={() => void remove(tag)}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    )
                  })
                : null}
              {draft && editingTags && !needsLocate ? (
                <form
                  className="pin-search"
                  style={pinLabelPosition(draft.x, draft.y)}
                  onSubmit={(event) => event.preventDefault()}
                >
                  <input
                    autoFocus
                    value={draft.query}
                    aria-label={text.tagSearch}
                    placeholder={text.tagSearch}
                    onChange={(event) => {
                      setError(null)
                      setDraft({ ...draft, query: event.target.value })
                    }}
                  />
                  {showShortHint ? <p className="pin-search-hint">{text.tagQueryShort}</p> : null}
                  {results.map((feature) => {
                    const name = displayNames(feature, locale)
                    return (
                      <Button key={feature.id} onClick={() => void choose(feature, draft)}>
                        {name.title}
                        {name.secondary ? <span className="pin-search-secondary"> {name.secondary}</span> : null}
                      </Button>
                    )
                  })}
                  {showCreate ? (
                    <Button
                      onClick={() => {
                        const point = draft
                        onCreatePlace({
                          nameEn: query,
                          lng: photo.lng,
                          lat: photo.lat,
                          commit: async (featureId) => {
                            try {
                              const tag = await savePhotoTag({
                                photoId: photo.id,
                                featureId,
                                x: point.x,
                                y: point.y,
                              })
                              onTags(photo.id, withTag(photo.tags ?? [], tag))
                              setShowTags(true)
                              setDraft(null)
                              setResults([])
                            } catch (err) {
                              setError(tagMessage(err instanceof Error ? err.message : '', text))
                            }
                          },
                        })
                      }}
                    >
                      {text.createPlace}
                    </Button>
                  ) : null}
                </form>
              ) : null}
            </div>
          </div>
          <div className={`lightbox-caption${error ? ' has-error' : ''}`}>
            {editingTags ? (
              <div className="lightbox-caption-static">
                <p className="lightbox-hint">{needsLocate ? text.locatePlaceHint : text.tagHint}</p>
                {needsLocate ? <p className="lightbox-hint">{placeName}</p> : null}
              </div>
            ) : null}
            {error ? <p className="error">{error}</p> : null}
          </div>
        </div>
        <aside className="lightbox-aside" aria-label={text.photoDetails}>
          <div className="lightbox-aside-head">
            <h3>{text.photoDetails}</h3>
            {canEditMeta && !editingMeta ? (
              <Button
                variant="link"
                onClick={() => {
                  setMetaError(null)
                  setMetaSaved(false)
                  setEditingMeta(true)
                }}
              >
                {text.edit}
              </Button>
            ) : null}
          </div>
          {canEditMeta && editingMeta ? (
            <form className="lightbox-meta" onSubmit={(event) => void onMetaSubmit(event)}>
              <label>
                {text.photoSource}
                <input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  required={!draftSession}
                />
              </label>
              <label>
                {text.photoCaption}
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} />
              </label>
              <div className="date-row">
                <YearField
                  label={text.photoTakenYear}
                  year={year}
                  circa={circa}
                  onYear={setYear}
                  onCirca={setCirca}
                  yearPlaceholder={text.year}
                  circaLabel={text.circa}
                />
              </div>
              <label>
                {text.photoPhotographer}
                <input value={photographer} onChange={(event) => setPhotographer(event.target.value)} />
              </label>
              <label>
                {text.photoLicense}
                <input value={license} onChange={(event) => setLicense(event.target.value)} />
              </label>
              <label>
                {text.photoSourceUrl}
                <input
                  type="url"
                  inputMode="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://"
                  required={!draftSession}
                />
              </label>
              {shownMetaError ? <p className="error">{shownMetaError}</p> : null}
              <div className="row form-actions">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={metaPending || (draftSession && !canFinishDraft)}
                  title={draftSession && !canFinishDraft ? text.locatePlaceHint : undefined}
                >
                  {draftSession ? text.photoDone : text.save}
                </Button>
                <Button variant="ghost" onClick={cancelMeta} disabled={metaPending}>
                  {text.cancel}
                </Button>
              </div>
            </form>
          ) : (
            <div className="lightbox-meta">
              <dl className="lightbox-details">
                <div>
                  <dt>{text.photoSource}</dt>
                  <dd>
                    {photoMetaComplete(photo) ? (
                      <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                        {photoDetailText(photo.source)}
                      </a>
                    ) : (
                      photoDetailText(photo.source)
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{text.photoCaption}</dt>
                  <dd>{photoDetailText(photo.caption)}</dd>
                </div>
                <div>
                  <dt>{text.photoTakenYear}</dt>
                  <dd>{photoDetailText(takenLabel)}</dd>
                </div>
                <div>
                  <dt>{text.photoPhotographer}</dt>
                  <dd>{photoDetailText(photo.photographer)}</dd>
                </div>
                <div>
                  <dt>{text.photoLicense}</dt>
                  <dd>{photoDetailText(photo.license)}</dd>
                </div>
                <div>
                  <dt>{text.photoSourceUrl}</dt>
                  <dd>
                    {photo.sourceUrl.trim() ? (
                      <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                        {photoDetailUrlHost(photo.sourceUrl)}
                      </a>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
              </dl>
              {metaSaved ? <p className="lightbox-hint">{text.photoSaved}</p> : null}
              {canEditMeta && onDelete && !draftSession ? (
                <Button variant="link" className="lightbox-delete" onClick={() => void deleteCurrent()}>
                  {text.deletePhoto}
                </Button>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>,
    document.body,
  )
}
