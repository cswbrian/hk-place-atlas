import { photoMetaIssues } from './photo'

export type PhotoDraftCloseKind = 'close' | 'confirm-discard'

/** How the lightbox should treat Close / Escape for an upload draft. */
export function photoDraftCloseKind(draftSession: boolean): PhotoDraftCloseKind {
  return draftSession ? 'confirm-discard' : 'close'
}

/** Prev/next leave the unfinished upload; hide them while drafting. */
export function photoDraftAllowsPaging(draftSession: boolean): boolean {
  return !draftSession
}

/** Done stays off until this place is pinned on the photo. */
export function photoDraftCanFinish(input: {
  placeFeatureId: string
  tags: { featureId: string }[] | null | undefined
}): boolean {
  return (input.tags ?? []).some((tag) => tag.featureId === input.placeFeatureId)
}

/** After the pin gate: finish should call updatePhoto only when meta validates. */
export function photoDraftShouldPersistMeta(input: {
  source?: string | null
  sourceUrl?: string | null
  year?: unknown
  circa?: unknown
  caption?: string | null
  photographer?: string | null
  license?: string | null
}): boolean {
  return photoMetaIssues(input).length === 0
}
