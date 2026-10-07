# Signed-out contribute prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Add place / Edit / Add photo visible when signed out; clicking opens an action-specific sign-in modal; after OAuth, resume the intended action via `authIntent` on the return URL.

**Architecture:** Pure `authIntent` helpers for the query param; presentational `SignInPrompt` dialog; `AtlasApp` gates handlers when `auth && !user` and consumes intent after login; `PlacePhotos` shows Add photo whenever the place can upload and calls `onNeedSignIn` when signed out.

**Tech Stack:** React 19, Vitest, `renderToStaticMarkup` for UI tests, existing Google OAuth `return=` flow.

---

### Task 1: `authIntent` domain helpers

**Files:**
- Create: `src/domain/authIntent.ts`
- Create: `src/domain/authIntent.test.ts`

- [x] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { AUTH_INTENT_PARAM, parseAuthIntent, stripAuthIntent, withAuthIntent } from './authIntent'

describe('authIntent', () => {
  it('parses add, edit, photo and rejects junk', () => {
    expect(parseAuthIntent('?authIntent=add')).toBe('add')
    expect(parseAuthIntent('?authIntent=edit')).toBe('edit')
    expect(parseAuthIntent('?foo=1&authIntent=photo')).toBe('photo')
    expect(parseAuthIntent('?authIntent=nope')).toBeNull()
    expect(parseAuthIntent('')).toBeNull()
  })

  it('adds intent to path+search without dropping other params', () => {
    expect(withAuthIntent('/en/place/foo?x=1', 'edit')).toBe(
      `/en/place/foo?x=1&${AUTH_INTENT_PARAM}=edit`,
    )
    expect(withAuthIntent('/en', 'add')).toBe(`/en?${AUTH_INTENT_PARAM}=add`)
  })

  it('strips intent and preserves other params', () => {
    expect(stripAuthIntent(`?${AUTH_INTENT_PARAM}=photo&x=1`)).toBe('?x=1')
    expect(stripAuthIntent(`?${AUTH_INTENT_PARAM}=add`)).toBe('')
  })
})
```

- [x] **Step 2: Run test — expect FAIL**

Run: `npm test -- src/domain/authIntent.test.ts`

- [x] **Step 3: Implement helpers**

```ts
export const AUTH_INTENT_PARAM = 'authIntent'
export type AuthIntent = 'add' | 'edit' | 'photo'

const INTENTS = new Set<AuthIntent>(['add', 'edit', 'photo'])

export function parseAuthIntent(search: string): AuthIntent | null {
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(
    AUTH_INTENT_PARAM,
  )
  return value && INTENTS.has(value as AuthIntent) ? (value as AuthIntent) : null
}

export function withAuthIntent(pathAndSearch: string, intent: AuthIntent): string {
  const url = new URL(pathAndSearch, 'https://atlas.local')
  url.searchParams.set(AUTH_INTENT_PARAM, intent)
  return `${url.pathname}${url.search}`
}

export function stripAuthIntent(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  params.delete(AUTH_INTENT_PARAM)
  const next = params.toString()
  return next ? `?${next}` : ''
}
```

- [x] **Step 4: Run test — expect PASS**

---

### Task 2: Locale + SignInPrompt

**Files:**
- Modify: `src/domain/locale.ts`
- Create: `src/ui/SignInPrompt.tsx`
- Create: `src/ui/SignInPrompt.test.ts`
- Modify: `src/index.css`

- [x] **Step 1: Add locale keys** (en + zh-hk)

```ts
signInPromptAddTitle: 'Sign in to add a place',
signInPromptEditTitle: 'Sign in to edit',
signInPromptPhotoTitle: 'Sign in to add a photo',
signInPromptBody: 'Create a free account with Google to contribute to HK Atlas.',
```

ZH: `登入以新增地點` / `登入以編輯` / `登入以加入相片` / `使用 Google 免費帳戶即可為香港地圖集貢獻內容。`

- [x] **Step 2: Failing SignInPrompt test** — dialog, title for intent, sign-in href, cancel uses `cancel` copy

- [x] **Step 3: Implement `SignInPrompt`** — `role="dialog"` `aria-modal`, backdrop click closes, Escape closes, primary `<a href={signInHref}>`

- [x] **Step 4: CSS** — `.sign-in-prompt` overlay (reuse lightbox-form panel look: light panel on dimmed backdrop, z-index above sidebar)

---

### Task 3: PlacePhotos signed-out Add photo

**Files:**
- Modify: `src/ui/PlacePhotos.tsx`
- Modify: `src/ui/PlacePhotos.test.ts`

- [x] **Step 1: Failing tests**

- When `canUpload` and `userSub: null`, markup includes `Add photo` and no `type="file"`.
- Keep existing signed-in test (has file input).

- [x] **Step 2: Implement**

- Props: `onNeedSignIn?: () => void`, `requestPick?: boolean`, `onRequestPickConsumed?: () => void`
- Show Add photo when `allowUpload` (not only when `userSub`)
- Click: if `!userSub` → `onNeedSignIn?.()`; else file input click
- File input only when `userSub && allowUpload`
- `useEffect`: if `requestPick && userSub && allowUpload`, click file input and call `onRequestPickConsumed`

---

### Task 4: Wire AtlasApp

**Files:**
- Modify: `src/AtlasApp.tsx`

- [x] **Step 1: State** — `signInIntent: AuthIntent | null`, `photoRequestPick: boolean`

- [x] **Step 2: Helpers**

```ts
const signInHrefFor = (intent?: AuthIntent) => {
  const target = intent
    ? withAuthIntent(path + search, intent)
    : path + search
  return `/api/auth/google?return=${encodeURIComponent(target)}`
}

const requireUser = (intent: AuthIntent, action: () => void) => {
  if (user) action()
  else if (auth) setSignInIntent(intent)
}
```

- [x] **Step 3: Handlers**

- `onAdd` / `onEdit`: when `auth`, always pass; body wrapped in `requireUser('add'|'edit', …)`
- `PlacePhotos`: `canUpload={selected.lng != null && selected.lat != null}` (drop `Boolean(user)`); `onNeedSignIn={() => setSignInIntent('photo')}`; `requestPick={photoRequestPick}`; consume clears flag
- Render `<SignInPrompt>` when `signInIntent` set; href = `signInHrefFor(signInIntent)`

- [x] **Step 4: Resume effect** — when `user` and `parseAuthIntent(search)`:

```ts
const intent = parseAuthIntent(search)
if (!user || !intent) return
const nextSearch = stripAuthIntent(search)
setSearch(nextSearch)
window.history.replaceState({}, '', path + nextSearch)
if (intent === 'add') { /* same as onAdd body */ }
if (intent === 'edit' && selected) { /* same as onEdit body */ }
if (intent === 'photo') setPhotoRequestPick(true)
```

For `edit`, wait until `selected` is non-null (effect deps include `selected`). For `add`/`photo`, run once per landing (guard with ref so strip doesn't re-fire).

---

### Task 5: Verify

- [x] Run: `npm test -- src/domain/authIntent.test.ts src/ui/SignInPrompt.test.ts src/ui/PlacePhotos.test.ts`
- [x] Run: `npm test` (full suite if time)
- [ ] Manual: signed out → Add/Edit/Add photo → modal → Sign in → resume
