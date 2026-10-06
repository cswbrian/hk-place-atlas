# Delete Confirmation Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a browser confirm dialog before deleting a place or removing a photo tag (photo delete already confirms).

**Architecture:** Match the existing photo-delete pattern: call `window.confirm` at the start of each delete handler and return early if the user cancels. Add locale strings only; no shared helper, modal, or API changes.

**Tech Stack:** React, Vitest, existing `copy` locale table.

**Spec:** `docs/superpowers/specs/2026-10-07-delete-confirmation-prompts-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `src/domain/locale.ts` | `deletePlaceConfirm` and `removeTagConfirm` (en + zh-hk) |
| `src/domain/locale.test.ts` | Assert those strings for both locales |
| `src/AtlasApp.tsx` | Confirm before `deleteFeature` in the place form `onDelete` |
| `src/ui/PhotoLightbox.tsx` | Confirm before `deletePhotoTag` in `remove` |
| `src/ui/PlacePhotos.tsx` | Unchanged (already confirms photo delete) |

Vitest runs with `environment: 'node'` and UI tests use static markup, so handler cancel/accept paths are not covered by interactive DOM tests. Locale strings plus the same inline `window.confirm` pattern as photo delete are the verification approach.

---

### Task 1: Locale confirm strings

**Files:**
- Modify: `src/domain/locale.ts`
- Modify: `src/domain/locale.test.ts`

- [x] **Step 1: Write the failing test**

Add to `src/domain/locale.test.ts`:

```ts
import { copy } from './locale'

describe('delete confirm copy', () => {
  it('asks before deleting a place or tag in both locales', () => {
    expect(copy.en.deletePlaceConfirm).toBe('Delete this place?')
    expect(copy.en.removeTagConfirm).toBe('Remove this tag?')
    expect(copy['zh-hk'].deletePlaceConfirm).toBe('刪除此地？')
    expect(copy['zh-hk'].removeTagConfirm).toBe('移除此標記？')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/locale.test.ts`

Expected: FAIL — `deletePlaceConfirm` / `removeTagConfirm` missing on `copy`.

- [x] **Step 3: Add locale strings**

In `src/domain/locale.ts`, next to `deletePhotoConfirm` in both locales:

```ts
// en
deletePhotoConfirm: 'Delete this photo?',
deletePlaceConfirm: 'Delete this place?',
removeTagConfirm: 'Remove this tag?',

// zh-hk
deletePhotoConfirm: '刪除這張相片？',
deletePlaceConfirm: '刪除此地？',
removeTagConfirm: '移除此標記？',
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/locale.test.ts`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/domain/locale.ts src/domain/locale.test.ts
git commit -m "Add locale strings for place and tag delete confirms."
```

---

### Task 2: Confirm before place delete

**Files:**
- Modify: `src/AtlasApp.tsx` (sidebar `FeatureForm` `onDelete` only; the pin-create portal form has no delete)

- [x] **Step 1: Gate the delete handler**

In `src/AtlasApp.tsx`, change the sidebar `onDelete` callback from:

```ts
onDelete={
  !creating && selected && wikiCanDelete(selected.id)
    ? () => {
        void deleteFeature(selected.slug, selected.updatedAt)
          .then(() => {
            setOverlay((current) => current.filter((item) => item.id !== selected.id))
            setDraft(null)
            setCreating(false)
            closePanel()
          })
          .catch((err: Error) => setFormError(err.message))
      }
    : undefined
}
```

to:

```ts
onDelete={
  !creating && selected && wikiCanDelete(selected.id)
    ? () => {
        if (!window.confirm(text.deletePlaceConfirm)) return
        void deleteFeature(selected.slug, selected.updatedAt)
          .then(() => {
            setOverlay((current) => current.filter((item) => item.id !== selected.id))
            setDraft(null)
            setCreating(false)
            closePanel()
          })
          .catch((err: Error) => setFormError(err.message))
      }
    : undefined
}
```

`text` is already `copy[locale]` in this component.

- [x] **Step 2: Commit**

```bash
git add src/AtlasApp.tsx
git commit -m "Confirm before deleting a wiki place."
```

---

### Task 3: Confirm before tag remove

**Files:**
- Modify: `src/ui/PhotoLightbox.tsx` (`remove` function)

- [x] **Step 1: Gate tag removal**

In `src/ui/PhotoLightbox.tsx`, change:

```ts
async function remove(tag: PhotoTag) {
  setError(null)
  try {
    await deletePhotoTag(photo.id, tag.id)
    onTags(photo.id, (photo.tags ?? []).filter((item) => item.id !== tag.id))
  } catch (err) {
    setError(tagMessage(err instanceof Error ? err.message : '', text))
  }
}
```

to:

```ts
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
```

- [x] **Step 2: Run related tests**

Run: `npx vitest run src/domain/locale.test.ts src/ui/PlacePhotos.test.ts`

Expected: PASS (photo delete confirm unchanged).

- [x] **Step 3: Commit**

```bash
git add src/ui/PhotoLightbox.tsx
git commit -m "Confirm before removing a photo place tag."
```

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| Place delete confirm (generic EN/zh-hk) | Task 1 + 2 |
| Tag remove confirm (generic EN/zh-hk) | Task 1 + 3 |
| Photo delete already confirmed | Unchanged |
| `window.confirm`, no custom modal | Tasks 2–3 |
| Cancel skips API | Early `return` in Tasks 2–3 |
| Locale tests | Task 1 |
| No API/worker changes | All tasks |
