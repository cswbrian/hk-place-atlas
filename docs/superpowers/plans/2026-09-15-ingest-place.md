# Place ingest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch Gwulo/Wikipedia (or pasted text) into a Place draft, highlight gaps, write `data/ingest/<id>.json` after confirm, merge on load.

**Architecture:** Parsers in `src/domain/gwulo.ts` and `src/domain/wikipedia.ts` produce a shared draft. `src/domain/ingest.ts` merges JSON. `Place.geometry` may be null; map/site skip unlocated places. A Cursor skill owns the chat confirm loop.

**Tech Stack:** TypeScript, Vitest, Vite glob JSON, MediaWiki API, Gwulo HTML.

---

## Files

- Create: `src/domain/dates.ts` (add `yearOnlyIfDefaultJan1`)
- Create: `src/domain/gwulo.ts`, `src/domain/gwulo.test.ts`
- Create: `src/domain/wikipedia.ts`, `src/domain/wikipedia.test.ts`
- Create: `src/domain/ingest.ts`, `src/domain/ingest.test.ts`
- Create: `scripts/fetch-place-source.ts`
- Create: `.cursor/skills/ingest-place/SKILL.md`
- Create: `data/ingest/.gitkeep`
- Modify: `src/domain/types.ts` — `geometry: PlaceGeometry | null`
- Modify: `src/domain/site.ts`, `querySite.ts`, `bdbiar.ts`, `src/ui/geometry.ts`, `MapView.tsx`, `EntityForm.tsx`, `officialDraft.ts`, `siteMapLayers.ts`, `App.tsx`
- Modify: `src/domain/commons.ts` — merge via `mergePlaceIngests`
- Modify: `package.json` — `ingest:fetch`

### Task 1: Jan 1 → year-only dates

### Task 2: Nullable geometry (map/site skip)

### Task 3: Gwulo HTML parser

### Task 4: Wikipedia API parser

### Task 5: PlaceIngest merge + App glob

### Task 6: Fetch script + skill
