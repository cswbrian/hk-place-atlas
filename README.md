# HK Place Atlas

Local-first map for Hong Kong building generations. Data lives in IndexedDB and can be exported as JSON (or a zip if you have old-map images).

## Use

```bash
npm install
npm run dev
```

1. Zoom into Central until lot tiles load.
2. Click a LandsD lot (or search `IL 2319`) to open the entity form.
3. Click more lots to attach them to the same building.
4. Fill names, dates, and optional site / institution links.
5. Use **Use a point** or **Draw footprint** when today’s lots are the wrong shape.
6. **Old maps** uploads a sheet you can drag, scale, and twist anytime.

Seed data is the GPO chain from [Gwulo](https://gwulo.com/node/3034).

## Layout

- `src/domain` — types, lot combine, lineage (no React)
- `src/storage` — `PlaceStore`, IndexedDB, seed
- `src/ui` — map, form, CSDI/LandsD lot helpers

Lot geometry is a snapshot. It is not a live link to Lands Department.
