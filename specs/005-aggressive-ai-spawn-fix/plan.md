# Implementation Plan: Aggressive AI & Spawn Render Fix

**Branch**: `005-aggressive-ai-spawn-fix` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-aggressive-ai-spawn-fix/spec.md`

## Summary

The AI opponent is non-functional — it neither moves units nor produces new ones, making the game trivially easy. Root cause analysis reveals two bugs: (1) `buildObjectives()` never generates exploration objectives, so units with no visible enemies or settlements have nothing to do, and (2) the production logic is overly conservative, requiring unoccupied city tiles and using a rigid unit-type threshold. The fix extends the AI's objective system with exploration targets, makes production unconditional when funds allow, and adds an aggression mode that directs units toward the player once the AI has sufficient forces.

A separate rendering bug causes newly spawned units to be invisible on their city tile. The `AnimationController.registerIdle()` captures `baseY` from the container's y-position before the renderer sets the correct tile position, causing the idle bob animation to fight the position update on subsequent frames. The fix ensures baseY is synchronized after the unit's position is set.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: PixiJS 8.x (`pixi.js`), `simplex-noise` 4.x
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Modern browsers, static hosting (GitHub Pages)
**Project Type**: Browser game (single-page application)
**Performance Goals**: 60 fps rendering, AI turn computation < 100ms on 20x20 map
**Constraints**: No server backend, all logic in-browser, static file deployment
**Scale/Scope**: Single-player vs AI, maps up to 20x20

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Changes extend existing objective/scoring system; no new abstractions introduced. Exploration objectives reuse the existing `Objective` interface. Rendering fix is a one-line baseY synchronization. |
| II. Test-First Development | PASS | Existing AI test suite covers computeTurn, production, movement, attack, and capture. New tests will be added for exploration objectives and aggression behavior before implementation. |
| III. Vertical Slice Delivery | PASS | Four independent slices: (1) exploration objectives, (2) aggressive production, (3) attack-seeking behavior, (4) spawn render fix. Each is independently testable and deliverable. |
| IV. Single-Player First | PASS | All changes are to the AI opponent in a single-player context. No multiplayer implications. Game state remains serializable. |
| V. Browser-Only Execution | PASS | No server dependencies. All AI logic runs in-browser. No new external dependencies. |

**Gate result: PASS** — no violations, proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-aggressive-ai-spawn-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── ai/
│   │   ├── ai.ts              # computeTurn, buildObjectives, decideUnitActions (MODIFY)
│   │   └── scoring.ts         # computeUtility, scoring functions (MODIFY)
│   ├── constants.ts           # Unit/settlement config (READ ONLY)
│   ├── pathfinding.ts         # reachableMap, findPath (READ ONLY)
│   ├── state.ts               # newGame, applyAction (READ ONLY)
│   ├── turns.ts               # startTurn, endTurn, endAiTurn (READ ONLY)
│   └── types.ts               # GameState, Unit, Objective types (READ ONLY)
├── renderer/
│   ├── renderer.ts            # GameRenderer, container hierarchy (READ ONLY)
│   ├── tilemap.ts             # TilemapRenderer, settlements (READ ONLY)
│   └── units.ts               # UnitsRenderer, AnimationController (MODIFY)
tests/
└── game/
    └── ai.test.ts             # AI behavior tests (MODIFY)
```

**Structure Decision**: Single project, existing structure. Changes are scoped to 3 files (ai.ts, scoring.ts, units.ts) plus tests. No new files or directories needed.

### Post-Phase 1 Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Design confirmed: no new abstractions, no new entity types, no new files. Exploration objectives reuse existing `Objective` interface. Aggression mode is a per-turn computed flag, not persisted state. Rendering fix is a baseY sync in existing code. |
| II. Test-First Development | PASS | Test plan defined: new tests for exploration objective creation, production without occupancy check, aggression-mode scoring, and idle animation baseY sync. All tests extend the existing `ai.test.ts` suite. |
| III. Vertical Slice Delivery | PASS | Four slices confirmed independent: exploration objectives (AI moves), production fix (AI builds), aggression mode (AI attacks), spawn render fix (visual bug). Each can be merged and validated separately. |
| IV. Single-Player First | PASS | No new state fields that would affect serialization. AI decision logic remains deterministic given the same game state. No multiplayer coupling introduced. |
| V. Browser-Only Execution | PASS | No new dependencies, no network calls, no server requirements. All computation remains in-browser within the existing game loop. |

**Gate result: PASS** — design validated, ready for `/speckit.tasks`.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
