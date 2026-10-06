# Photo lightbox and place pins

Clicking a photo thumbnail opens the full photo. A signed-in person can click a spot on that photo and pin an atlas place there, the way Facebook pins a person. The photo stays on the place it was uploaded to, and it also appears on every pinned place.

## Goal

From a place panel, open a photo large, move between the photos on that place, and pin places that appear in the picture. Pinned places are labels on the photo. Choosing a label opens that place. Each pinned place lists the same photo.

## Lightbox

A thumbnail is a button. It opens a lightbox over the map. The image is the original upload, served from `GET /api/photos/:id/file`. The panel thumbnail stays the existing `panel` webp.

The lightbox shows:

- The original image, fitted inside the frame with empty space around it when the aspect ratio differs.
- Previous and next, among the photos currently listed for this place. Arrow keys move when a text field is not focused.
- The source name, linking to `sourceUrl` in a new tab.
- Remarks, when present.
- Close, and Escape.

Delete stays on the thumbnail card, for the uploader, as it does today.

Clicking the empty margin around the image does nothing. A click on the image itself is measured against the image, as fractions `x` and `y` from 0 to 1.

## Pins

A pin is one place on one photo, at one point.

| Field | Meaning |
|---|---|
| `photo_id` | The photo |
| `feature_id` | The pinned place |
| `x`, `y` | Fractions of the image width and height, each from 0 to 1 inclusive |
| `created_at`, `created_by` | Who last set this pin |

One place has at most one pin on a photo. Saving that place again moves the pin and records the person who moved it.

The label’s top-left corner sits on that point, then shifts inward so the label stays inside the image. Clicking a label closes the lightbox and opens that place the same way a search result does. It does not open the search box. When someone is signed in, the label has a control that removes the pin.

A pin may point at the place the photo was uploaded to. That place’s list still shows the photo once.

## Adding a pin

Signed-in: click the image. A search box opens at that spot and uses the existing search, with no kind filter. A pin can point at any feature that search returns. Picking a result saves the pin.

When the query has text and the search returns nothing, the box offers **Create place**. That opens the existing add-place form in front of the lightbox. It starts as a new place at the photo’s `lng` and `lat`, with the English name set to the query. Save creates the place, then saves the pin, then closes the form and leaves the lightbox open with the new label. Cancel closes the form and saves no pin.

Signed-out: the same click offers the existing sign-in link. No pin is saved.

## Where the photo is listed

`GET /api/photos?featureId=` returns photos uploaded to that place and photos with a pin for that place. Each photo appears once. Every photo in the response includes its pins:

```ts
tags: {
  id: string
  featureId: string
  nameEn: string
  nameZh: string
  slug: string
  kind: string
  x: number
  y: number
}[]
```

A pin whose place no longer exists is omitted.

Map markers stay on the photo’s stored point. The bbox photo query is unchanged. Opening a pinned place shows the photo in that place’s panel, and does not add a second map marker.

## Existing databases

Databases that already have `photos` from `0005_photos.sql` keep that table. No column is added, removed, or rewritten on `photos`. Existing photo rows stay on their upload place, keep their files, and return `tags: []` until someone pins a place.

The only schema change is a new table, `0006_photo_tags.sql`:

- `photo_tags` with a unique index on `(photo_id, feature_id)` and an index on `feature_id`.
- `CREATE TABLE` and `CREATE INDEX` only. It does not drop or alter `photos`.

Apply it to the existing local and remote D1 databases with the usual commands:

```
npx wrangler d1 migrations apply hk-atlas --local
npx wrangler d1 migrations apply hk-atlas --remote
```

Wrangler runs only migrations that are not already recorded. A database already at `0005` gains `0006`. A fresh database runs `0001` through `0006`.

## API

| Request | Who | Result |
|---|---|---|
| `GET /api/photos/:id/file` | Anyone | Original bytes. Content type comes from the file signature: jpeg, png, webp, or gif. Anything else is `404`. |
| `POST /api/photos/:id/tags` | Signed in | Body `{ featureId, x, y }`. Creates the pin, or moves it when that place is already pinned. |
| `DELETE /api/photos/:id/tags/:tagId` | Any signed-in user | Removes that pin. |

`POST` rejects a missing photo, a missing place, or an `x` or `y` outside 0–1. Pin writes use the same hourly write limit as other signed-in edits.

Deleting a photo deletes its pins. Deleting a place deletes pins that point at that place. Photos uploaded to a deleted place are left as they are today.

The client saves a new place with the existing place-save request. If that save succeeds and the pin save fails, the place remains, the lightbox shows the error, and the person can click the spot and pick the new place. A failed search shows the error in the search box and saves no pin.

## Pieces

- `PlacePhotos` opens the lightbox from a thumbnail.
- The lightbox draws the original, the pins, previous and next, and the search box.
- While the add-place form is open, the app remembers the photo id and the click. After a successful place save, it writes the pin.

English and Chinese copy cover the search prompt, create place, sign-in prompt, remove, and the failure lines.

## Tests

- A second save for the same place on the same photo moves the pin.
- A place’s photo list includes uploaded photos and pinned photos, each once, with place names on the pins.
- A signed-out save or delete is rejected. Any signed-in user can delete a pin.
- `x` or `y` outside 0–1 is rejected. A missing photo or place is rejected.
- Deleting the photo or the pinned place removes the related pins.
- A database that already has a photo row, after `0006` is applied, still returns that photo, with `tags: []`.
- A click is measured on the picture, including when the lightbox has empty space around the image.
- Clicking a label does not open the search box.

## After upload

When a photo finishes uploading, the lightbox opens on that photo. Until the upload place has a pin on the photo, a click saves a pin for that place (no search). The prompt is “Click where this place is in the photo.” After that pin exists, further clicks use the normal search-to-tag flow for other places.

## Metadata aside

The lightbox has an aside with source, remarks, and source URL. The uploader can edit and save them with `PATCH /api/photos/:id`. Others see them read-only.

## Out of scope

- Tagging free-text labels that are not atlas places.
- A separate tag mode button. The click on the picture is the gesture.
- Moving the map marker to each pinned place.
- Pins on the map thumbnail.
- Changing who may delete a photo.
