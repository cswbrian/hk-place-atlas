# Catalog Stats Counters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve welcome-panel place/photo counts from a key/value `catalog_stats` table instead of full-table `COUNT(*)`.

**Architecture:** Migration seeds counters once. Worker reads those keys on `/api/counts` and bumps them on feature/photo create/delete (including audit revert). Cache TTL for counts rises to 1 hour. Seed script re-syncs counters after bulk inserts.

**Tech Stack:** Cloudflare D1, Workers, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-08-catalog-stats-counters-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `worker/migrations/0008_catalog_stats.sql` | Create + seed `catalog_stats` |
| `worker/catalogStats.ts` | Read/bump helpers + SQL |
| `worker/catalogStats.test.ts` | Unit tests for row mapping / bump SQL |
| `worker/publicCache.ts` | Counts TTL → 1 hour |
| `worker/publicCache.test.ts` | Expect 3600 for counts |
| `worker/index.ts` | Use helpers on read/write paths |
| `scripts/seed.ts` | Re-sync counters after feature seed |

---

### Task 1: Counts cache TTL

**Files:**
- Modify: `worker/publicCache.test.ts`
- Modify: `worker/publicCache.ts`

- [x] **Step 1: Write the failing test** — expect counts GET cache = `60 * 60`
- [x] **Step 2: Run** `npx vitest run worker/publicCache.test.ts` — FAIL
- [x] **Step 3: Change counts TTL to `60 * 60`**
- [x] **Step 4: Run test — PASS**

### Task 2: catalogStats helpers

**Files:**
- Create: `worker/catalogStats.ts`
- Create: `worker/catalogStats.test.ts`

- [x] **Step 1: Failing tests** for `countsFromStatRows` (places/photos from rows; missing → 0) and bump SQL shape
- [x] **Step 2: Run** `npx vitest run worker/catalogStats.test.ts` — FAIL
- [x] **Step 3: Implement helpers**
- [x] **Step 4: Run — PASS**

### Task 3: Migration

**Files:**
- Create: `worker/migrations/0008_catalog_stats.sql`

- [x] **Step 1: Add CREATE + INSERT seed from COUNT(*)**
- [x] **Step 2: Apply local** `npm run migrate:local`

### Task 4: Wire worker read/write

**Files:**
- Modify: `worker/index.ts`

- [x] **Step 1: `handleCounts` reads `catalog_stats`**
- [x] **Step 2: Bump `places` on new feature / feature delete / audit revert insert-or-delete**
- [x] **Step 3: Bump `photos` in photoBucket `insert` / `deleteRow`**
- [x] **Step 4: Run** `npx vitest run worker/` — PASS

### Task 5: Seed script re-sync

**Files:**
- Modify: `scripts/seed.ts`

- [x] **Step 1: After feature inserts, reset `places`/`photos` from COUNT(*)** (or delete+insert catalog_stats keys)

### Task 6: Verify

- [x] **Step 1:** `npx vitest run`
- [x] **Step 2:** `npm run migrate:remote` + deploy
