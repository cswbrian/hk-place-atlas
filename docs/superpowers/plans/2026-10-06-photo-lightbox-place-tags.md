# Photo lightbox and place pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open a photo in a lightbox and pin atlas places onto spots in the picture, listing that photo on every pinned place.

**Architecture:** A new `photo_tags` table stores one pin per place per photo as fractions of the image. The existing `photos` table is not altered. The place photo list unions uploads and pins. The lightbox serves the original file and reuses place search and the add-place form.

**Tech Stack:** React, Vite, Cloudflare Worker, D1, R2, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-06-photo-lightbox-place-tags-design.md`

---

### Task 1: Pin rules

**Files:**
- Create: `src/domain/photoTag.ts`
- Test: `src/domain/photoTag.test.ts`
- Create: `worker/migrations/0006_photo_tags.sql`

- [ ] Failing tests for click fractions, label placement, file signatures, tag validation, list SQL, upsert SQL, and a migration that does not alter `photos`.
- [ ] Implement those functions and the migration.

### Task 2: API

**Files:**
- Modify: `src/api/router.ts`
- Modify: `src/api/router.test.ts`
- Modify: `src/domain/photo.ts`
- Modify: `worker/photos.ts`
- Modify: `worker/index.ts`
- Modify: `src/api/photos.ts`
- Modify: `src/api/photos.test.ts`

- [ ] Routes for `GET /api/photos/:id/file`, `POST /api/photos/:id/tags`, `DELETE /api/photos/:id/tags/:tagId`.
- [ ] List query includes pinned photos once, with place names. Bbox query stays on the photo point.
- [ ] Upsert moves an existing pin. Signed-out writes are rejected. Deletes of a photo or place remove related pins.

### Task 3: Lightbox

**Files:**
- Create: `src/ui/PhotoLightbox.tsx`
- Modify: `src/ui/PlacePhotos.tsx`
- Modify: `src/AtlasApp.tsx`
- Modify: `src/domain/locale.ts`
- Modify: `src/index.css`

- [ ] Thumbnail opens the lightbox. Clicking the picture searches. Clicking a label opens that place. Create place uses the existing form in front of the lightbox and writes the pin after save.

### Task 4: Existing databases

- [ ] `npm run migrate:local`
- [ ] `npm run migrate:remote`
