import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { fetchSearch } from '../api/features'
import { deletePhotoTag, originalPath, savePhotoTag, updatePhoto } from '../api/photos'
import type { Feature, FeatureKind } from '../domain/feature'
import { copy, displayNames, type SiteLocale } from '../domain/locale'
import {
  formatPhotoTaken,
  normalizePhotoTaken,
  photoMetaComplete,
  photoMetaIssues,
  type Photo,
} from '../domain/photo'
import { imageClickFraction, pinLabelPosition, type PhotoTag } from '../domain/photoTag'
import {
  photoDraftAllowsPaging,
  photoDraftCanFinish,
  photoDraftCloseKind,
} from '../domain/photoUploadSession'
import { fts5Query, hanNeedle } from '../domain/search'

function canSearchPlaces(query: string): boolean {
  return fts5Query(query) != null || hanNeedle(query) != null
}

type Draft = {
  x: number
  y: number
  query: string
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

  const needsLocate = Boolean(
    photo && !(photo.tags ?? []).some((tag) => tag.featureId === placeFeatureId),
  )
  const canEditMeta = Boolean(userSub && photo && userSub === photo.createdBy)

  useEffect(() => {
    setDraft(null)
    setResults([])
    setError(null)
    setMetaError(null)
    setMetaSaved(false)
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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (event.key === 'Escape') {
        if (draft) setDraft(null)
        else void requestClose()
        return
      }
      if (typing || !allowsPaging) return
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (event.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [allowsPaging, draft, draftSession, index, onClose, onDiscard, onIndex, photos.length, text.discardPhotoConfirm])

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

  async function saveMeta(event: FormEvent) {
    event.preventDefault()
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

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={photo.source || text.photos}>
      <div className="lightbox-bar">
        {allowsPaging ? (
          <>
            <button type="button" className="ghost" disabled={index === 0} onClick={() => onIndex(index - 1)}>
              {text.photoPrev}
            </button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              className="ghost"
              disabled={index >= photos.length - 1}
              onClick={() => onIndex(index + 1)}
            >
              {text.photoNext}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={`ghost lightbox-tag-toggle${showTags ? ' is-on' : ''}`}
          aria-pressed={showTags}
          onClick={() => setShowTags((current) => !current)}
        >
          {showTags ? text.hideTags : text.showTags}
        </button>
        {draftSession ? (
          <button
            type="button"
            className="primary"
            disabled={!canFinishDraft}
            title={canFinishDraft ? undefined : text.locatePlaceHint}
            onClick={() => {
              if (!canFinishDraft) return
              onDone?.()
            }}
          >
            {text.photoDone}
          </button>
        ) : null}
        <button type="button" className="ghost" onClick={() => void requestClose()}>
          {text.photoClose}
        </button>
      </div>
      <div className="lightbox-body">
        <div className="lightbox-main">
          <div className="lightbox-stage">
            <div className="lightbox-photo">
              <img
                src={originalPath(photo.id)}
                alt={photo.caption || photo.source}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const point = imageClickFraction(
                    { x: event.clientX, y: event.clientY },
                    { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight },
                  )
                  if (!point) return
                  setError(null)
                  setResults([])
                  if (!signedIn) {
                    setDraft({ ...point, query: '' })
                    return
                  }
                  if (needsLocate) {
                    void pinAt(placeFeatureId, point)
                    return
                  }
                  setDraft({ ...point, query: '' })
                }}
              />
              {showTags
                ? (photo.tags ?? []).map((tag) => {
                    const name = displayNames(tag, locale).title
                    return (
                      <div
                        key={tag.id}
                        className="photo-pin"
                        style={pinLabelPosition(tag.x, tag.y)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="photo-pin-name"
                          onClick={() => {
                            void requestClose().then((closed) => {
                              if (closed) onOpenPlace(tag.slug, tag.kind as FeatureKind)
                            })
                          }}
                        >
                          {name}
                        </button>
                        {signedIn ? (
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
              {draft && !signedIn ? (
                <div className="pin-search" style={pinLabelPosition(draft.x, draft.y)}>
                  <a href={signInHref}>{text.signInToTag}</a>
                </div>
              ) : null}
              {draft && signedIn && !needsLocate ? (
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
                      <button key={feature.id} type="button" onClick={() => void choose(feature, draft)}>
                        {name.title}
                        {name.secondary ? <span className="pin-search-secondary"> {name.secondary}</span> : null}
                      </button>
                    )
                  })}
                  {showCreate ? (
                    <button
                      type="button"
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
                    </button>
                  ) : null}
                </form>
              ) : null}
            </div>
          </div>
          <div className="lightbox-caption">
            <p className="lightbox-hint">{needsLocate ? text.locatePlaceHint : text.tagHint}</p>
            {needsLocate ? <p className="lightbox-hint">{placeName}</p> : null}
            {error ? <p className="error">{error}</p> : null}
          </div>
        </div>
        <aside className="lightbox-aside" aria-label={text.photoDetails}>
          <div className="lightbox-aside-head">
            <h3>{text.photoDetails}</h3>
            {canEditMeta && !editingMeta ? (
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  setMetaError(null)
                  setMetaSaved(false)
                  setEditingMeta(true)
                }}
              >
                {text.edit}
              </button>
            ) : null}
          </div>
          {canEditMeta && editingMeta ? (
            <form className="lightbox-meta" onSubmit={(event) => void saveMeta(event)}>
              <label>
                {text.photoSource}
                <input value={source} onChange={(event) => setSource(event.target.value)} required />
              </label>
              <label>
                {text.photoCaption}
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} />
              </label>
              <div className="date-row">
                <div>
                  <label>
                    {text.photoTakenYear}
                    <input
                      value={year}
                      onChange={(event) => setYear(event.target.value)}
                      placeholder={text.year}
                      inputMode="numeric"
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={circa}
                      onChange={(event) => setCirca(event.target.checked)}
                    />
                    {text.circa}
                  </label>
                </div>
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
                  required
                />
              </label>
              {metaError ? <p className="error">{metaError}</p> : null}
              <div className="row">
                <button type="submit" className="primary" disabled={metaPending}>
                  {text.save}
                </button>
                <button type="button" className="ghost" onClick={cancelMeta} disabled={metaPending}>
                  {text.cancel}
                </button>
              </div>
            </form>
          ) : (
            <div className="lightbox-meta">
              {photoMetaComplete(photo) ? (
                <p>
                  <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                    {photo.source}
                  </a>
                </p>
              ) : (
                <p className="muted">{text.photoIncomplete}</p>
              )}
              {takenLabel ? <p>{takenLabel}</p> : null}
              {photo.caption ? <p>{photo.caption}</p> : null}
              {photo.photographer ? <p>{photo.photographer}</p> : null}
              {photo.license ? <p className="muted">{photo.license}</p> : null}
              {metaSaved ? <p className="lightbox-hint">{text.photoSaved}</p> : null}
            </div>
          )}
        </aside>
      </div>
    </div>,
    document.body,
  )
}
