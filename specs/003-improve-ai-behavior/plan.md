# Implementation Plan: Improve AI Behavior

**Branch**: `003-improve-ai-behavior` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-improve-ai-behavior/spec.md`

## Summary

The AI opponent never moves its units or produces new units because `applyAction()` rejects all AI-generated actions during the `'ai'` phase — it only accepts `move`, `attack`, and `produce` actions when `phase === 'orders'`. The fix widens the phase gate to also permit these actions during the `'ai'` phase, then adds unit tests to prevent regression. No new game entities or architecture changes are required.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: PixiJS 8.x (`pixi.js`, `@pixi/tilemap`), `simplex-noise` 4.x, Vitest 2.x
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x (`npm test`)
**Target Platform**: Browser (static files, GitHub Pages)
**Project Type**: Browser game (single-player)
**Performance Goals**: 60 fps gameplay; AI turn completes within one second
**Constraints**: No backend server; must deploy as static files
**Scale/Scope**: Single-player, two-player game state (one human, one AI)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ Pass | Fix is a one-line change per action type in `state.ts`; no new abstractions introduced |
| II. Test-First Development | ✅ Pass | Tests for `computeTurn()` action generation are written before the `state.ts` fix is applied |
| III. Vertical Slice Delivery | ✅ Pass | Each user story (production, movement, combat, capture) can be verified independently via manual play and unit tests |
| IV. Single-Player First, Multiplayer-Ready | ✅ Pass | Phase gate fix uses `state.currentPlayer` as the authority; AI is identified by player ID, not hardcoded index — multiplayer-compatible |
| V. Browser-Only Execution | ✅ Pass | All changes are pure game-logic TypeScript; no network calls, no server |

**Post-Design Re-check**: No new dependencies introduced. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-improve-ai-behavior/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — root cause analysis and decisions
├── data-model.md        # Phase 1 — entity impact (no new entities)
├── quickstart.md        # Phase 1 — manual and automated testing guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── state.ts         # CHANGE: widen phase gate in applyAction()
│   ├── ai/
│   │   └── ai.ts        # CHANGE: add dev-mode logging to applyActionSafe()
│   └── (all other files unchanged)
└── main.ts              # CHANGE: add console.error for unexpected AI action failures

tests/
└── ai.test.ts           # NEW: unit tests for computeTurn() and action application
```

**Structure Decision**: Single-project layout (Option 1). Only three files change; one new test file is added.

## Phase 0: Research

**Status**: Complete. See [research.md](research.md).

### Resolved Questions

| Question | Resolution |
|----------|-----------|
| Why does the AI not act? | Phase gate in `applyAction()` rejects all actions when `phase === 'ai'` |
| Are there bugs in AI logic itself? | No — `buildObjectives()`, `decideUnitActions()`, production selection are structurally correct |
| Is pathfinding broken? | Not the root cause — it never executes because actions are rejected before applying |
| What is the minimal fix? | Widen the phase condition in `applyAction()` from `phase !== 'orders'` to `phase !== 'orders' && phase !== 'ai'` for `move`, `attack`, `produce` action types |

## Phase 1: Design

### Fix Strategy

**Change 1 — `src/game/state.ts`: Widen Phase Gate**

In `applyAction()`, the `move`, `attack`, and `produce` cases each check:
```typescript
if (state.phase !== 'orders') { return { ok: false, error: 'invalid-phase', ... }; }
```

Change each to:
```typescript
if (state.phase !== 'orders' && state.phase !== 'ai') { return { ok: false, error: 'invalid-phase', ... }; }
```

This allows the AI to apply its computed actions during the `'ai'` phase while still preventing human players from acting during the `'ai'` phase via the `currentPlayer` check that already exists in the individual validators.

**Change 2 — `src/game/ai/ai.ts`: Add Dev-Mode Logging**

In `applyActionSafe()`, after a validation failure, add:
```typescript
if (import.meta.env.DEV) {
  console.warn('[AI] Action rejected:', action, result);
}
```

This is a debug-only guard that compiles away in production.

**Change 3 — `src/main.ts`: Log Unexpected AI Action Failures**

In the AI action loop, on `result.ok === false`, add:
```typescript
console.error('[AI] Unexpected action failure:', action, result);
```

**New File — `tests/ai.test.ts`: AI Action Generation Tests**

Tests verify (written first, must fail before fix, pass after):
1. `computeTurn()` with a fresh game state returns at least one `move` action
2. `computeTurn()` returns at least one `produce` action when AI has ≥100 funds and an idle city
3. Every action returned by `computeTurn()` applies successfully via `applyAction()`
4. After applying all AI actions, at least one AI unit is on a different tile than its start position

### No New Entities

See [data-model.md](data-model.md). No schema changes. No new persistent state.

### No External Contracts

This is a browser-only game with no external API. No contract documents are applicable.
