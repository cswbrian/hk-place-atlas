# Signed-out contribute prompt

## Goal

Signed-out visitors still see main-panel **Add place**, **Edit**, and **Add photo** controls. Clicking any of them opens a modal that encourages Google sign-in with action-specific copy. After OAuth, return to the same page and resume the intended action.

## Behavior

### Visible controls (signed out)

When auth is configured (`auth === true`) and the view would normally offer contribution:

| Control | Where |
| --- | --- |
| Add place | Welcome aside, This site panel |
| Edit | Place detail |
| Add photo | Place photos (place has coordinates) |

Buttons look the same as for signed-in users. Lightbox tag/meta and History **Revert** stay as today (tag keeps inline sign-in; Revert stays signed-in only).

### Modal

- Opens on click when `user` is null.
- Action-specific title/body for `add` / `edit` / `photo`.
- Primary CTA: Sign in with Google (existing `/api/auth/google?return=…`).
- Secondary: Cancel / Close; also Escape and backdrop dismiss. No navigation on dismiss.
- Header Sign in link unchanged.

### Resume after OAuth

Encode intent on the OAuth `return` URL as `authIntent=add|edit|photo` (alongside the current path/search).

After return, when `user` is present:

1. Read and strip `authIntent` from the URL (replaceState).
2. **add** — open create form (same as today’s Add handler; use site/selected coords when available).
3. **edit** — once place detail is loaded, open edit form for that place.
4. **photo** — try opening the file picker; if the browser blocks it (no user gesture), leave **Add photo** focused/visible so one click finishes.

If signed-out user lands with `authIntent` still in the URL (abandoned OAuth), ignore resume and strip the param when convenient, or leave until next signed-in load — do not open the modal automatically.

## Architecture

1. **`authIntent` helpers** (pure domain) — parse / set / strip query param; shared by app and tests.
2. **`SignInPrompt`** — presentational dialog; locale + intent + href + onClose.
3. **`AtlasApp`** — always wire Add/Edit when `auth`; gate with modal or real action; build sign-in href with intent; consume intent after `fetchMe`.
4. **`PlacePhotos`** — show Add photo when place can upload, even without `userSub`; call `onNeedSignIn` when signed out; support one-shot `requestPick` / focus for resume.

No worker/API changes. Server auth already rejects unauthenticated writes.

## Copy (locale)

EN / ZH-HK for:

- Modal titles/bodies per intent
- Shared CTA using existing `signIn` where possible
- Optional short supporting line: contribute requires an account

## Testing

- Domain: parse/set/strip `authIntent`.
- `SignInPrompt`: markup has dialog, action-specific text, sign-in link, close.
- `PlacePhotos`: Add photo visible when `canUpload` and `userSub` null; click invokes `onNeedSignIn`; with `userSub`, opens file input path.
- `AtlasApp` / panel wiring covered indirectly via existing panel tests where practical; intent resume via domain + focused unit tests on helpers.

## Out of scope

Lightbox tagging/meta sign-in UX, Revert for guests, post-login deep-links beyond add/edit/photo, non-Google auth.
