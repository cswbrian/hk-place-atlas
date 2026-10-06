# Map click → This site → place drill-in

## Goal

Map clicks always open the aside at **This site** (level 1). Choosing a place in that list drills into place detail (level 2). Back returns to level 1 via a header icon.

## Journey

### Level 1 — map click

- Clicking empty ground or a pin opens/refreshes **This site** (coords, place list, site photos).
- Map click never auto-opens place detail.
- Close dismisses the site and returns to the idle/welcome aside.

### Level 2 — place in the site list

- Clicking a place drills into existing place detail (names, dates, buildings/lots, links, history, photos).
- URL keeps today’s place path (shareable).
- Header shows a back **icon** (top-left) with `aria-label` / `title` from existing `backToSite` copy.
- Back clears selection, restores level 1 for the same site, and drops the place URL (existing `onBack` wiring).
- Remove the bottom “Back to site” text button.

### Out of scope

Search, recent, shared URLs, and photo pins may still open place detail directly.

## Implementation

Approach: keep current two-level routing; adjust place-detail chrome only.

1. **`EstablishmentDetail`** — header row with optional icon back button; remove bottom back text button; keep Edit at the bottom when present.
2. **`AtlasApp` / `FeaturePanel`** — leave `openPoint` (clear selection → open site) and `onBack` (clear selection → `/`) as-is; confirm map click path still never selects a place.
3. **CSS** — small style for the icon button so it aligns with the place title.

Reuse the same chevron SVG pattern as lightbox prev (`lightbox-icon` style family, or a compact `detail-back` ghost button).

## Testing

- `EstablishmentDetail`: with `onBack`, markup includes a back control with `aria-label` matching `backToSite`, and does **not** include the visible “Back to site” text button body; without `onBack`, no back control.
- `FeaturePanel`: with `site` and `selected: null` → “This site”; with `site` + `selected` + `onBack` → place title and header back control.
