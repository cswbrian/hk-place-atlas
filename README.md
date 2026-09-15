# HK Place Atlas

Local-first map of Hong Kong building generations. Places live in IndexedDB.

## Use

```bash
npm install
npm run dev
```

1. Zoom into Central and Western — clean map in view mode (no dots or polygons).
2. Click the map to open the **site panel**. If a building or parcel is under the click, that polygon is the location; otherwise the click is a pin.
3. **Add place** from the site, or **Edit** an existing row. Click a place name for the read-only page.
4. While editing, further map clicks attach another building or parcel (or keep the pin if nothing is there). A footprint already claimed by another place is borrowed as an outline, not taken.
5. Same-site history is deduced from shared lots or nearby coordinates. Institution moves are still linked by hand.
6. **Old maps** uploads a sheet you can drag, scale, and twist.

Seed data includes the GPO chain from [Gwulo](https://gwulo.com/node/3034) plus Central and Western buildings from [BDBIAR](https://data.gov.hk) (converted into Places). CSDI footprints are claimed onto those Places when you zoom in.

## Layout

- `src/domain` — types, lots, site clustering, BDBIAR → Place, querySite, Records
- `src/storage` — `PlaceStore`, IndexedDB, seed
- `src/ui` — map, forms, CSDI/LandsD helpers

Lot and building geometry are snapshots, not live LandsD/CSDI links.
