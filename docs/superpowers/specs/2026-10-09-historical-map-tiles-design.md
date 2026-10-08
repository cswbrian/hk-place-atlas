# Historical map tile overlay

Toggle one Lands Department historical map sheet as a semi-transparent raster over the modern LandsD basemap, with an opacity slider. Pins, clusters, GIS, and labels stay above the sheet.

Source dataset: [Historical Maps (data.gov.hk)](https://data.gov.hk/en-data/dataset/hk-landsd-openmap-historical-maps).

## Goal

Users can compare today’s Central/Victoria street fabric with three early sheets without leaving the atlas. Default off; when on, exactly one sheet is visible.

## Sheets (v1)

| Id | Label (EN) | Year | CSDI MapServer dataset id |
|---|---|---|---|
| `central-1938` | Central | 1938 | `landsd_rcd_1671592552706_20818` |
| `victoria-1889` | Plan of the City of Victoria | 1889 | `landsd_rcd_1631586233937_28500` |
| `victoria-1897` | Victoria Hong Kong | 1897 | `landsd_rcd_1637714431413_44900` |

Default sheet when first enabled: `central-1938`. Labels also have bilingual strings in `locale` (short year + place name).

## Architecture

```
UI (map chrome: sheet picker + opacity)
  → AtlasMap adds/removes one MapLibre raster source + layer
  → tiles: GET /api/history-map/{id}/{z}/{x}/{y}.png
  → Worker allowlists id, converts XYZ → WGS84 bbox
  → CSDI …/MapServer/export (PNG32, transparent, bboxSR=4326)
  → Worker returns image/png with Cache-Control
```

Layer order (bottom → top):

1. LandsD basemap + vector labels (unchanged)
2. **History raster** (`history-map` source / `history-map-raster` layer)
3. GIS lot/building fills
4. Catalog clusters / pins / selected pin
5. Photo markers (DOM)

History layer uses MapLibre `beforeId` so it sits under atlas overlays: prefer `beforeId: 'gis-lots-fill'`; if that layer is missing, `beforeId: 'clusters'`.

## Worker API

`GET /api/history-map/:id/:z/:x/:y.png`

- **Allowlist:** only the three ids above. Unknown id → `404`.
- **Zoom bounds:** serve `z` in `9…19` (atlas `minZoom`/`maxZoom`). Outside → `404`.
- **Upstream:**  
  `https://portal.csdi.gov.hk/server/rest/services/common/{datasetId}/MapServer/export`  
  with `bbox={west},{south},{east},{north}`, `bboxSR=4326`, `imageSR=4326`, `size=256,256`, `format=png32`, `transparent=true`, `f=image`.
- **Tile math:** standard Web Mercator XYZ → lon/lat bbox (same convention MapLibre expects for raster tiles). Pure helper in `src/domain/historyMap.ts`, unit-tested; Worker imports it.
- **Cache:** `Cache-Control: public, max-age=86400`. Use the edge Cache API the same way existing GIS image/proxy responses do, if applicable.
- **Errors:** upstream non-OK or non-image → `502` with a short JSON body (same style as other GIS failures); do not open-proxy arbitrary URLs.
- **Router:** new `ApiRoute` type `historyMap` with `{ id, z, x, y }`; parse path with a single regex.

No D1 / auth required. GET only.

## MapLibre / UI

Compact control on the map, near the MapLibre navigation control (top-right chrome):

1. Toggle button “History map” / 歷史地圖 (off by default).
2. When on: radio/segmented list of the three sheets (one selected); range input for opacity `0…1`, default `0.7`.
3. Changing sheet swaps the raster source `tiles` URL. Opacity sets `raster-opacity` paint.
4. Off: set `historyMapId` to `null` and remove the history source + layer from the map.

State lives in `AtlasApp` and is passed into `AtlasMap` as props: `historyMapId: HistoryMapId | null`, `historyOpacity: number`, plus setters on the chrome control. Not persisted to URL in v1.

Attribution: while a sheet is on, append a short Lands Department historical-map credit next to the existing LandsD/CSDI attribution.

Sheets only cover Victoria / Peak–Central extents; outside that the overlay is transparent empty — no auto-pan/fly in v1.

## Client helpers

`src/domain/historyMap.ts`:

- `HISTORY_MAPS` catalog (id, datasetId, en/hk labels)
- `DEFAULT_HISTORY_MAP_ID` = `central-1938`
- `DEFAULT_HISTORY_OPACITY` = `0.7`
- `historyMapTileTemplate(id)` → `/api/history-map/{id}/{z}/{x}/{y}.png`
- `xyzToLonLatBbox(z, x, y)` → `{ west, south, east, north }` for Worker export
- `historyMapExportUrl(datasetId, bbox)` → full CSDI export URL
- `isHistoryMapId(value)` type guard

`AtlasMap` effect: when `historyMapId` / opacity / style reload changes, ensure the raster source/layer exist with the correct `beforeId` and paint.

## Errors & empty behaviour

| Case | Behaviour |
|---|---|
| CSDI slow / down | Broken tiles / 502; control stays usable; no toast spam |
| Sheet off | No history requests |
| Opacity 0 | Layer kept; `raster-opacity` is 0 |
| Style reload (locale labels) | Re-add history layer after overlays rebuild |

## Testing

- Domain: XYZ → bbox corners; allowlist / id parse; tile URL template.
- Router: path parse for valid/invalid id and z.
- Worker helper (if extracted): export URL builder with fixed bbox params.
- UI: optional light test that control labels render for locale; no MapLibre browser test required.

## Out of scope

- Other historical sheets (Kowloon, Sha Tin, …) — add later by extending the catalog table only
- Stacking multiple sheets
- URL/query persistence of history state
- Pre-built XYZ on R2 / GeoTIFF hosting
- Browser-direct CSDI calls
- Auto-fit camera to sheet extent
- Opacity persistence in `localStorage`
- Replacing the modern basemap
