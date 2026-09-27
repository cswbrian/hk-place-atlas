# Places-only simplification

## Goal

HK Place Atlas is Places-only: map, year slider, site panel, place detail/edit. Records, header search, old-map overlays, and Commons photo ingest are gone.

## Scope

**Keep.** Places, relations, BDBIAR seed, CSDI footprints, clustered pins, lot lookup in the edit form, Leaflet zoom, `Place.images` as optional Place metadata.

**Delete.** Record UI/types/store APIs, overlay UI/map alignment, Commons photo fetch/skill/`data/commons`, and `records` on ingest merge.

**Jardine House.** Lives in `src/storage/seed.ts` (Place + site relation, no photos).

**IndexedDB.** Drop record and overlay methods from `PlaceStore`. Leave unused object stores in the existing database so local DBs still open.

## UI

Header chrome is the title and zoom hint — no search, Add record, or Old maps. Site panel lists Places and Add place only. Map clicks run `querySite` for buildings, lots, and Places — no record ids. Sidebar is welcome list → site → place detail → edit.

## Ingest

`mergePlaceIngests` and Place ingest are gone. Wikipedia/Gwulo parsers and `ingest-place` are gone. Commons category URLs are not imported.

## Tests and deps

Remove overlay/record/Commons/Place-ingest tests; keep site, map, and Place tests.
