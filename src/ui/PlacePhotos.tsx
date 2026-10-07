import { useEffect, useRef, useState } from 'react'
import { deletePhoto, fetchPhotos, uploadPhoto } from '../api/photos'
import { copy, type SiteLocale } from '../domain/locale'
import {
  formatPhotoTaken,
  mergeSitePhotos,
  photoMetaComplete,
  photoUploadIssues,
  thumbPath,
  type Photo,
} from '../domain/photo'
import type { FeatureKind } from '../domain/feature'
import type { PhotoTag } from '../domain/photoTag'
import { PhotoLightbox } from './PhotoLightbox'

type Props = {
  featureId?: string
  featureIds?: string[]
  placeName: string
  canUpload: boolean
  userSub: string | null
  locale: SiteLocale
  signInHref: string
  onNeedSignIn?: () => void
  requestPick?: boolean
  onRequestPickConsumed?: () => void
  onOpenPlace: (slug: string, kind: FeatureKind) => void
  onCreatePlace: (request: {
    nameEn: string
    lng: number
    lat: number
    commit: (featureId: string) => Promise<void>
  }) => void
  onChange?: () => void
}

function photoMessage(code: string, text: (typeof copy)[SiteLocale]): string {
  if (code === 'place') return text.photoPlace
  if (code === 'file') return text.photoFile
  if (code === 'rate limited') return text.photoRate
  return text.photoFailed
}

export function PlacePhotos({
  featureId,
  featureIds,
  placeName,
  canUpload,
  userSub,
  locale,
  signInHref,
  onNeedSignIn,
  requestPick = false,
  onRequestPickConsumed,
  onOpenPlace,
  onCreatePlace,
  onChange,
}: Props) {
  const text = copy[locale]
  const ids = featureIds ?? (featureId ? [featureId] : [])
  const idsKey = ids.join('\0')
  const homeFeatureId = featureId ?? ''
  const allowUpload = Boolean(canUpload && featureId)
  const fileInput = useRef<HTMLInputElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    if (ids.length === 0) {
      setPhotos([])
      return () => {
        cancel = true
      }
    }
    void Promise.all(ids.map((id) => fetchPhotos({ featureId: id }).catch(() => [] as Photo[])))
      .then((lists) => {
        if (!cancel) setPhotos(mergeSitePhotos(lists))
      })
      .catch(() => {
        if (!cancel) setPhotos([])
      })
    return () => {
      cancel = true
    }
  }, [idsKey])

  useEffect(() => {
    if (!requestPick || !userSub || !allowUpload) return
    fileInput.current?.click()
    addButton.current?.focus()
    onRequestPickConsumed?.()
  }, [requestPick, userSub, allowUpload, onRequestPickConsumed])

  async function onPicked(file: File | null) {
    if (!file || !featureId) return
    const issues = photoUploadIssues({
      featureId,
      byteLength: file.size,
      placeFound: allowUpload,
      placeLng: allowUpload ? 0 : null,
      placeLat: allowUpload ? 0 : null,
    })
    if (issues.length > 0) {
      setError(photoMessage(issues[0]!, text))
      return
    }
    setPending(true)
    setError(null)
    try {
      const saved = await uploadPhoto({ featureId, file })
      const next = { ...saved, tags: saved.tags ?? [] }
      setPhotos((current) => [next, ...current])
      setDraftId(next.id)
      setOpenId(next.id)
      onChange?.()
    } catch (err) {
      setError(photoMessage(err instanceof Error ? err.message : '', text))
    } finally {
      setPending(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function remove(photo: Photo) {
    if (!window.confirm(text.deletePhotoConfirm)) return
    setError(null)
    try {
      await deletePhoto(photo.id)
      setPhotos((current) => current.filter((item) => item.id !== photo.id))
      if (openId === photo.id) setOpenId(null)
      if (draftId === photo.id) setDraftId(null)
      onChange?.()
    } catch (err) {
      setError(photoMessage(err instanceof Error ? err.message : '', text))
    }
  }

  async function discardDraft() {
    if (!draftId) return
    setError(null)
    try {
      await deletePhoto(draftId)
      setPhotos((current) => current.filter((item) => item.id !== draftId))
      setDraftId(null)
      setOpenId(null)
      onChange?.()
    } catch (err) {
      setError(photoMessage(err instanceof Error ? err.message : '', text))
    }
  }

  const openIndex = photos.findIndex((photo) => photo.id === openId)
  const draftSession = Boolean(draftId && openId === draftId)

  function setTags(photoId: string, tags: PhotoTag[]) {
    setPhotos((current) => current.map((photo) => (photo.id === photoId ? { ...photo, tags } : photo)))
  }

  function setPhoto(updated: Photo) {
    setPhotos((current) => current.map((photo) => (photo.id === updated.id ? updated : photo)))
  }

  return (
    <section className="place-photos" aria-label={text.photos}>
      <h3>{text.photos}</h3>
      {photos.length === 0 ? <p className="muted">{text.photoNote}</p> : null}
      <ul className="photo-list">
        {photos.map((photo) => {
          const taken = formatPhotoTaken(photo.year, photo.circa)
          const complete = photoMetaComplete(photo)
          return (
            <li key={photo.id} className="photo-card">
              <button type="button" className="photo-thumb" onClick={() => setOpenId(photo.id)}>
                <img
                  src={thumbPath(photo.id, 'panel')}
                  alt={photo.caption || photo.source || text.photos}
                />
              </button>
              {complete ? null : <p className="muted">{text.photoIncomplete}</p>}
              {taken ? <p className="muted">{taken}</p> : null}
              {photo.caption ? <p className="muted">{photo.caption}</p> : null}
              {userSub && userSub === photo.createdBy ? (
                <button
                  type="button"
                  className="photo-delete"
                  aria-label={text.deletePhoto}
                  title={text.deletePhoto}
                  onClick={() => void remove(photo)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6"
                    />
                  </svg>
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
      {allowUpload ? (
        <>
          {userSub ? (
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                void onPicked(file)
              }}
            />
          ) : null}
          <button
            ref={addButton}
            type="button"
            disabled={pending}
            onClick={() => {
              if (!userSub) {
                onNeedSignIn?.()
                return
              }
              fileInput.current?.click()
            }}
          >
            {pending ? text.uploadPhoto : text.addPhoto}
          </button>
        </>
      ) : null}
      {featureId && !allowUpload ? <p className="muted">{text.photoPlace}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {openIndex >= 0 ? (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          locale={locale}
          placeFeatureId={homeFeatureId}
          placeName={placeName}
          userSub={userSub}
          signInHref={signInHref}
          draftSession={draftSession}
          onClose={() => setOpenId(null)}
          onDone={() => {
            setDraftId(null)
            setOpenId(null)
          }}
          onDiscard={() => discardDraft()}
          onIndex={(index) => setOpenId(photos[index]?.id ?? null)}
          onOpenPlace={onOpenPlace}
          onCreatePlace={onCreatePlace}
          onTags={setTags}
          onPhotoUpdate={setPhoto}
        />
      ) : null}
    </section>
  )
}
