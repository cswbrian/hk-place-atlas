# Delete confirmation prompts

Destructive delete actions ask for confirmation before calling the API.

## Goal

When someone clicks delete for a place, a photo, or a photo tag, show a confirmation prompt first. Cancel leaves the UI unchanged and makes no request. OK runs the existing delete path.

## Behavior

Use the browser `window.confirm` dialog, matching photo delete today.

| Action | Confirm message (EN) | Confirm message (zh-hk) | Status |
|---|---|---|---|
| Delete photo | Delete this photo? | 刪除這張相片？ | Already implemented |
| Delete place | Delete this place? | 刪除此地？ | Add |
| Remove photo tag | Remove this tag? | 移除此標記？ | Add |

Messages are short and generic. They do not include the place or tag name.

Out of scope: custom modals, discard-upload confirm (already present), API or worker changes.

## Implementation

1. **`src/domain/locale.ts`** — add `deletePlaceConfirm` and `removeTagConfirm` for `en` and `zh-hk`, next to `deletePhotoConfirm`.
2. **`src/AtlasApp.tsx`** — at the start of each place `onDelete` handler, return early unless `window.confirm(text.deletePlaceConfirm)`.
3. **`src/ui/PhotoLightbox.tsx`** — at the start of `remove(tag)`, return early unless `window.confirm(text.removeTagConfirm)`.
4. **`src/ui/PlacePhotos.tsx`** — leave photo delete as-is.

No shared helper, no API-layer confirm, no new components.

## Testing

- Locale: assert the new confirm strings exist for both locales.
- Place delete: when confirm is cancelled, `deleteFeature` is not called; when accepted, existing delete behavior runs.
- Tag remove: when confirm is cancelled, `deletePhotoTag` is not called; when accepted, the tag is removed as today.

Stub or mock `window.confirm` in tests the same way other UI tests handle browser APIs, if those handlers are covered by existing component tests. Prefer the lightest test that proves cancel skips the API call.
