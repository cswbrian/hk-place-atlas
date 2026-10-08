# Lightbox Draft One Primary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** During photo upload drafts, one sidebar **Done** finishes the draft (soft meta); remove the top-bar Done button.

**Architecture:** Keep pin/finish helpers in `photoUploadSession`. Add a pure helper that decides whether finish should persist meta. Wire `PhotoLightbox` so draft form submit runs finish (optional `updatePhoto` then `onDone`); non-draft Save stays hard-validating.

**Tech Stack:** React, Vitest, existing `photoMetaIssues` / `updatePhoto` / locale `photoDone`.

**Spec:** `docs/superpowers/specs/2026-10-09-lightbox-draft-one-primary-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `src/domain/photoUploadSession.ts` | `photoDraftShouldPersistMeta` — after pin gate, whether finish calls `updatePhoto` |
| `src/domain/photoUploadSession.test.ts` | Tests for that helper |
| `src/ui/PhotoLightbox.tsx` | Remove top-bar Done; draft sidebar primary = Done + soft nudge; finish handler |

No API, locale key, or `PlacePhotos` wiring changes (`onDone` stays).

---

### Task 1: Persist-meta decision helper

**Files:**
- Modify: `src/domain/photoUploadSession.ts`
- Modify: `src/domain/photoUploadSession.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/domain/photoUploadSession.test.ts`:

```ts
import { photoDraftShouldPersistMeta } from './photoUploadSession'

describe('photoDraftShouldPersistMeta', () => {
  it('persists only when source and https URL are ready', () => {
    expect(
      photoDraftShouldPersistMeta({
        source: '',
        sourceUrl: '',
        year: '',
        circa: false,
      }),
    ).toBe(false)
    expect(
      photoDraftShouldPersistMeta({
        source: 'SCMP',
        sourceUrl: 'https://example.com/a',
        year: '',
        circa: false,
      }),
    ).toBe(true)
    expect(
      photoDraftShouldPersistMeta({
        source: 'SCMP',
        sourceUrl: 'https://example.com/a',
        year: '999',
        circa: false,
      }),
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/photoUploadSession.test.ts`

Expected: FAIL — `photoDraftShouldPersistMeta` not exported.

- [ ] **Step 3: Implement helper**

In `src/domain/photoUploadSession.ts`:

```ts
import { photoMetaIssues } from './photo'

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/photoUploadSession.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/photoUploadSession.ts src/domain/photoUploadSession.test.ts
git commit -m "Add helper for whether draft Done should persist photo meta."
```

---

### Task 2: PhotoLightbox draft primary = Done

**Files:**
- Modify: `src/ui/PhotoLightbox.tsx`

- [ ] **Step 1: Import helper and remove top-bar Done**

Import `photoDraftShouldPersistMeta` from `../domain/photoUploadSession`.

Delete the entire top-bar block:

```tsx
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
```

- [ ] **Step 2: Add `finishDraft` and branch form submit**

Replace `saveMeta` usage for draft with a shared submit path:

```tsx
async function finishDraft() {
  if (!canFinishDraft) return
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
    onDone?.()
    return
  }
  if (!photoDraftShouldPersistMeta({ source, caption, photographer, license, sourceUrl, year, circa })) {
    onDone?.()
    return
  }
  const taken = normalizePhotoTaken({ year, circa })
  if ('error' in taken) {
    setMetaError(metaMessage('year', text))
    setMetaSaved(false)
    onDone?.()
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
  await saveMeta(event)
}
```

Simplify `finishDraft`: when `issues.length > 0`, set soft error then `onDone` (do not `updatePhoto`). When issues empty, `updatePhoto` then `onDone`; on API failure keep draft open.

Preferred minimal body:

```tsx
async function finishDraft() {
  if (!canFinishDraft || !photo) return
  const payload = { source, caption, photographer, license, sourceUrl, year, circa }
  const issues = photoMetaIssues(payload)
  if (issues.length > 0) {
    setMetaError(metaMessage(issues[0]!, text))
    setMetaSaved(false)
    onDone?.()
    return
  }
  const taken = normalizePhotoTaken({ year, circa })
  if ('error' in taken) {
    setMetaError(metaMessage('year', text))
    setMetaSaved(false)
    onDone?.()
    return
  }
  setMetaPending(true)
  setMetaError(null)
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
```

Note: after `onDone` the lightbox unmounts, so setting `metaError` before incomplete finish is only useful if close is delayed — still set it for consistency with soft nudge while open. Soft nudge while drafting also shows live issues (Step 3).

Keep `saveMeta` for non-draft (hard block on issues, no `onDone`).

Wire form: `onSubmit={(event) => void onMetaSubmit(event)}`.

- [ ] **Step 3: Soft nudge + draft primary button**

Above the action row, show draft soft error from live form state when there is no harder `metaError` from a failed save — or merge:

```tsx
const draftMetaIssue =
  draftSession
    ? photoMetaIssues({ source, caption, photographer, license, sourceUrl, year, circa })[0]
    : undefined
const shownMetaError =
  metaError ?? (draftMetaIssue ? metaMessage(draftMetaIssue, text) : null)
```

Render `{shownMetaError ? <p className="error">{shownMetaError}</p> : null}`.

Source / sourceUrl inputs: `required={!draftSession}` (or omit `required` when `draftSession`).

Primary button:

```tsx
<button
  type="submit"
  className="primary"
  disabled={metaPending || (draftSession && !canFinishDraft)}
  title={draftSession && !canFinishDraft ? text.locatePlaceHint : undefined}
>
  {draftSession ? text.photoDone : text.save}
</button>
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/domain/photoUploadSession.test.ts src/domain/photo.test.ts`

Expected: PASS

Run: `npm run lint` (or project lint on touched files if full lint is noisy)

Expected: no new issues in touched files.

- [ ] **Step 5: Commit**

```bash
git add src/ui/PhotoLightbox.tsx
git commit -m "Move draft Done into the lightbox meta form and soft-nudge incomplete meta."
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| Remove top-bar Done | Task 2 Step 1 |
| Sidebar primary = Done during draft | Task 2 Step 3 |
| Pin gate on Done | Task 2 Step 3 (`disabled` + `finishDraft` guard) |
| Soft inline `p.error` | Task 2 Step 3 |
| No HTML required during draft | Task 2 Step 3 |
| Valid meta → updatePhoto then onDone | Task 2 Step 2 |
| Incomplete → skip save, still onDone | Task 2 Step 2 |
| updatePhoto fail → stay open | Task 2 Step 2 |
| Non-draft Save unchanged | Task 2 Step 2 (`saveMeta`) |
| Persist decision helper tests | Task 1 |
