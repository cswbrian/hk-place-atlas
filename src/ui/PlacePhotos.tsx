import { useEffect, useState, type FormEvent } from 'react'
import { deletePhoto, fetchPhotos, uploadPhoto } from '../api/photos'
import { copy, type SiteLocale } from '../domain/locale'
import { photoUploadIssues, thumbPath, type Photo } from '../domain/photo'

type Props = {
  featureId: string
  placeName: string
  canUpload: boolean
  userSub: string | null
  locale: SiteLocale
  onChange?: () => void
}

function photoMessage(code: string, text: (typeof copy)[SiteLocale]): string {
  if (code === 'place') return text.photoPlace
  if (code === 'source') return text.photoSourceRequired
  if (code === 'sourceUrl') return text.photoUrlRequired
  if (code === 'file') return text.photoFile
  if (code === 'rate limited') return text.photoRate
  return text.photoFailed
}

export function PlacePhotos({ featureId, placeName, canUpload, userSub, locale, onChange }: Props) {
  const text = copy[locale]
  const [photos, setPhotos] = useState<Photo[]>([])
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('')
  const [remarks, setRemarks] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancel = false
    void fetchPhotos({ featureId })
      .then((rows) => {
        if (!cancel) setPhotos(rows)
      })
      .catch(() => {
        if (!cancel) setPhotos([])
      })
    return () => {
      cancel = true
    }
  }, [featureId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const issues = photoUploadIssues({
      featureId,
      source,
      remarks,
      sourceUrl,
      byteLength: file?.size ?? 0,
      placeFound: canUpload,
      placeLng: canUpload ? 0 : null,
      placeLat: canUpload ? 0 : null,
    })
    if (issues.length > 0) {
      setError(photoMessage(issues[0]!, text))
      return
    }
    if (!file) return
    setPending(true)
    setError(null)
    try {
      const saved = await uploadPhoto({ featureId, source, remarks, sourceUrl, file })
      setPhotos((current) => [saved, ...current])
      setSource('')
      setRemarks('')
      setSourceUrl('')
      setFile(null)
      setOpen(false)
      onChange?.()
    } catch (err) {
      setError(photoMessage(err instanceof Error ? err.message : '', text))
    } finally {
      setPending(false)
    }
  }

  async function remove(photo: Photo) {
    setError(null)
    try {
      await deletePhoto(photo.id)
      setPhotos((current) => current.filter((item) => item.id !== photo.id))
      onChange?.()
    } catch (err) {
      setError(photoMessage(err instanceof Error ? err.message : '', text))
    }
  }

  return (
    <section className="place-photos" aria-label={text.photos}>
      <h3>{text.photos}</h3>
      {photos.length === 0 ? <p className="muted">{text.photoNote}</p> : null}
      <ul className="photo-list">
        {photos.map((photo) => (
          <li key={photo.id} className="photo-card">
            <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
              <img src={thumbPath(photo.id, 'panel')} alt={photo.remarks || photo.source} />
            </a>
            <a className="photo-source" href={photo.sourceUrl} target="_blank" rel="noreferrer">
              {photo.source}
            </a>
            {photo.remarks ? <p className="muted">{photo.remarks}</p> : null}
            {userSub && userSub === photo.createdBy ? (
              <button type="button" className="ghost" onClick={() => void remove(photo)}>
                {text.deletePhoto}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {userSub && canUpload ? (
        open ? (
          <form className="panel-form" onSubmit={(event) => void submit(event)}>
            <p className="muted">{placeName}</p>
            <p className="muted">{text.photoNote}</p>
            <label>
              {text.photoSource}
              <input value={source} onChange={(event) => setSource(event.target.value)} required />
            </label>
            <label>
              {text.photoRemarks}
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={3} />
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
            <label>
              {text.addPhoto}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <div className="row">
              <button type="submit" className="primary" disabled={pending}>
                {text.save}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setOpen(false)
                  setError(null)
                }}
              >
                {text.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setOpen(true)}>
            {text.addPhoto}
          </button>
        )
      ) : null}
      {userSub && !canUpload ? <p className="muted">{text.photoPlace}</p> : null}
      {error && !open ? <p className="error">{error}</p> : null}
    </section>
  )
}
