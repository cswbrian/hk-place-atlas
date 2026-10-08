# Lightbox draft: one primary action

During photo upload (draft session), show a single primary **完成** in the sidebar meta form. Remove the top-bar Done button. Soft-nudge incomplete source/URL with the same inline error pattern as add-place; do not block finish.

## Goal

Uploaders see one clear finish action next to the fields they fill, instead of both top-bar **完成** and sidebar **儲存**.

Out of scope: API/schema changes, non-draft meta edit flow (keep **儲存**), changing pin/tag behavior, changing discard-on-close.

## Problem

In a draft lightbox, two primaries compete:

- Top bar **完成** — ends the draft once this place is pinned on the photo
- Sidebar **儲存** — persists meta (source, URL, etc.)

They do different jobs but feel like duplicate “submit” controls.

## Behavior

### Draft session

- Remove the top-bar **完成** control entirely (it is unused outside draft today; do not keep a hidden path).
- Sidebar meta form primary label is **完成** (`photoDone`), not **儲存**.
- **完成** enabled only when this place is pinned (`photoDraftCanFinish`); otherwise disabled with the existing locate hint.
- Cancel / close / Escape: unchanged (confirm discard while drafting; no paging).

### Soft meta nudge

- While source/URL (or other current meta rules) are incomplete, show `<p className="error">…</p>` above the form actions — same pattern as `FeatureForm`’s `shownError`.
- Reuse existing locale strings where they fit (source/URL required or photo-incomplete).
- No `confirm()`, toast, or second primary.
- During draft, do not use HTML `required` on meta fields so the browser does not hard-block soft finish.
- Incomplete meta does **not** disable **完成** (pin gate only).

### Finish click

When **完成** is clicked and the pin gate passes:

1. Meta valid → `updatePhoto` with form values, then `onDone` (clear draft + close lightbox).
2. Meta incomplete → skip `updatePhoto`, still `onDone` (photo may remain incomplete; list keeps existing incomplete hint).
3. `updatePhoto` fails → show error inline; **do not** call `onDone`.

### Non-draft

Unchanged: owner can Edit → **儲存** / Cancel with hard validation (block save until meta validates). No Done button.

## UI / components

Primary touchpoint: `PhotoLightbox` (and existing helpers `photoDraftCanFinish`, `photoMetaIssues` / `photoMetaComplete`).

`PlacePhotos` `onDone` / draft session wiring stays; only the control that invokes finish moves.

## Testing

- Draft: no top-bar Done; sidebar primary is Done; disabled without pin; enabled with pin.
- Draft incomplete meta: inline error visible; Done still finishes without `updatePhoto`.
- Draft complete meta: Done calls `updatePhoto` then `onDone`.
- Draft `updatePhoto` failure: error shown; draft stays open.
- Non-draft: Save still validates and persists; no Done in form.
