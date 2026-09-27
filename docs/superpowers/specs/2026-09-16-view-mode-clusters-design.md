# View-mode clustered place pins

## Goal

Idle view should look full of atlas Places so people click the map. Every Place standing in the year slider appears as a pin. Pins cluster at district zoom and split at street zoom. A pin or empty-map click still opens **This site**. While a site is open, that site’s polygons (and pin-only generations) highlight, and every other pin stays on the map, dimmed.

## Non-goals

- Photo thumbnails on the idle map.
- Changing edit mode (still pickable CSDI footprints, no city of pins).
- Year-filtering the site panel (the panel remains the full site timeline).

## Map states

**Idle.** Clustered pins for every Place with geometry that `placeStandingInYear` accepts. Polygon Places use their centroid. Green standing / brown demolished / stone unknown, same as today’s markers. No building or lot footprints. Cluster click zooms in (Leaflet.markercluster default). Pin click and map click run `querySite` at that point.

**Site open.** Site Places render as polygons when they have polygons, otherwise as highlighted pins. Hit CSDI buildings and lots for that click still draw. Pins for those site Place ids are removed from the cluster group so they are not drawn twice. Remaining pins stay, dimmed (~65% opacity), and still open another site.

**Editing.** Cluster layer off. Unchanged: the draft Place plus all pickable buildings and lots.

## Year slider

Pins follow the same standing-in-year rule as the sidebar. Demolished-by-then Places are omitted from clusters. Opening a site still lists every generation.

## Clustering

Use `leaflet.markercluster`. Disable clustering at zoom 17 (same as `MIN_LOT_ZOOM`) so street view is individual pins. Cluster click zooms in only — no spiderfy legs.

## Copy

Welcome text and README should tell people the map is clustered Places, not a clean basemap.
