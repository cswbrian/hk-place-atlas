# Map Click Site Drill-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map clicks always show This site; place list drills into detail with a header back icon.

**Architecture:** Keep `openPoint` / place URL / `onBack` routing. Change only `EstablishmentDetail` chrome (header icon back, remove bottom text back) and cover with static markup tests.

**Tech Stack:** React, Vitest, existing locale/`FeaturePanel` wiring.

---

### Task 1: Failing tests for header back icon

**Files:**
- Modify: `src/ui/EstablishmentDetail.test.ts`
- Modify: `src/ui/FeaturePanel.test.ts`

- [x] **Step 1: Write failing tests** for header back `aria-label`, no bottom text back label as button body, FeaturePanel level 1/2.
- [x] **Step 2: Run tests; confirm failure.**
- [x] **Step 3: Implement header back in `EstablishmentDetail`; minimal CSS.**
- [x] **Step 4: Run tests; confirm pass.**
