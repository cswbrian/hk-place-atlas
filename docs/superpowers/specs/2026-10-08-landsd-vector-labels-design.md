# LandsD vector map labels

Always-on place-name labels from the Lands Department Vector Map Label API, language following the site locale.

## Goal

The atlas basemap shows street and place names. English UI (`/en`) uses English labels; Cantonese UI (`/hk`) uses Traditional Chinese. No toggle.

## Locale → API

| Site locale | Label `lang` | CRS |
|---|---|---|
| `en` | `en` | `WGS84` |
| `hk` | `tc` | `WGS84` |

Label style URL:

`https://mapapi.geodata.gov.hk/gs/api/v1.0.0/vt/label/hk/{lang}/WGS84/resources/styles/root.json`

## Merge into one MapLibre style

Both LandsD styles use a vector source id `esri`. After resolving tile URLs (existing `landsDepartmentMapStyle`):

1. Keep the basemap sources, layers, and sprite.
2. Rename the label source to `landsd-labels` and retarget its layers.
3. Append all label layers after basemap layers.
4. Point `glyphs` at the resolved label font host (has Arial and Chinese fonts). Basemap text layers keep working; Chinese labels get CYanHeiHK / Source Han Sans.

Cap label tiles at zoom 15, same as the basemap. Overlay GIS / catalog layers stay as today via `style.load`.

## Map lifecycle

`AtlasMap` receives `locale`. On create and when `locale` changes, fetch the label style, then `setStyle` the LandsD basemap URL with a `transformStyle` that merges the prepared labels. Camera is preserved by MapLibre across style swaps. If the label fetch fails, load the basemap alone.

## Out of scope

- Label toggle UI
- Simplified Chinese (`sc`)
- HK80 tiles
- LandsD logo watermark beyond existing attribution
- Changing raster topographic tiles
