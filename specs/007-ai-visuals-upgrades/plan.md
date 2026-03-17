# Implementation Plan: AI Visuals, Map Expansion & Settlement Upgrades

**Branch**: `007-ai-visuals-upgrades` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-ai-visuals-upgrades/spec.md`

## Summary

This feature adds visual feedback to AI turns (movement animations + thinking indicator), doubles all map sizes, improves settlement/city tile graphics, adds a town-to-city upgrade mechanic ($500), and increases the AI thinking budget to 5 seconds. The most significant technical change is moving AI computation to a Web Worker so the main thread can render the thinking indicator during the up-to-5-second computation window.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x (rendering), simplex-noise 4.x (map generation)
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Modern browsers (static files on GitHub Pages)
**Project Type**: Browser game (single-page application)
**Performance Goals**: 60 fps rendering, AI computation ≤5 seconds, smooth animation playback
**Constraints**: No server backend, all logic runs in-browser, must be deployable as static files to GitHub Pages
**Scale/Scope**: Single-player strategy game, maps up to 40×40 (1,600 tiles)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Each change targets an existing system with minimal new abstractions. Web Worker is the simplest way to keep UI responsive during 5s computation. |
| II. Test-First Development | PASS | New upgrade action, map generation sizes, and AI heuristics are all testable in isolation. Animation/visual changes require manual verification. |
| III. Vertical Slice Delivery | PASS | Six user stories are independently testable and deployable. Each can be implemented as a standalone increment. |
| IV. Single-Player First, Multiplayer-Ready | PASS | All changes are single-player. Game state remains serializable. The upgrade action follows the existing action pattern (validate → apply). Web Worker communication is message-based and could later become network-based. |
| V. Browser-Only Execution | PASS | Web Workers are browser-native. No server required. All assets remain static. |

### Post-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Web Worker adds one new file; upgrade action follows existing patterns; settlement graphics use existing Graphics API. No new frameworks or abstractions. |
| II. Test-First Development | PASS | Upgrade validation/application testable via unit tests. Map generation testable at new sizes. AI heuristics testable. Worker communication testable with mock postMessage. |
| III. Vertical Slice Delivery | PASS | Implementation order: P6 (time budget) → P4 (map sizes) → P3 (visuals) → P5 (upgrade) → P2 (thinking indicator + Worker) → P1 (AI animations). Each slice is independently valuable. |
| IV. Single-Player First, Multiplayer-Ready | PASS | New action type follows the action union pattern. Game state changes are serializable. No hard-coded player assumptions introduced. |
| V. Browser-Only Execution | PASS | Web Workers are standard browser API. No external services. Static deployable. |

## Project Structure

### Documentation (this feature)

```text
specs/007-ai-visuals-upgrades/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── ai/
│   │   ├── ai.ts              # computeTurn entry point (modified: add upgrade heuristic)
│   │   ├── ai.worker.ts       # NEW: Web Worker wrapper for computeTurn
│   │   ├── evaluate.ts        # Board evaluation (no changes)
│   │   ├── movegen.ts          # Move candidate generation (no changes)
│   │   ├── objectives.ts       # Objective assignment (no changes)
│   │   ├── scoring.ts          # Utility scoring (no changes)
│   │   └── search.ts           # Alpha-beta search (no changes)
│   ├── combat.ts               # Combat resolution (no changes)
│   ├── constants.ts            # MODIFIED: map sizes, AI budget, upgrade cost
│   ├── fog.ts                  # Fog of war (no changes)
│   ├── mapgen.ts               # MODIFIED: adjust for larger maps
│   ├── pathfinding.ts          # Pathfinding (no changes)
│   ├── rules.ts                # MODIFIED: add upgrade validation/application
│   ├── state.ts                # Game state management (no changes)
│   ├── turns.ts                # Turn lifecycle (no changes)
│   └── types.ts                # MODIFIED: add UpgradeAction type
├── input/
│   └── input.ts                # MODIFIED: handle upgrade action dispatch
├── renderer/
│   ├── fog.ts                  # Fog overlay (no changes)
│   ├── renderer.ts             # MODIFIED: AI turn orchestration, thinking indicator
│   ├── tilemap.ts              # MODIFIED: city/town building graphics
│   ├── ui.ts                   # MODIFIED: upgrade button in settlement panel
│   └── units.ts                # AnimationController (no changes, existing API reused)
└── main.ts                     # MODIFIED: AI turn phase management (thinking → animating → done)

tests/
├── upgrade.test.ts             # NEW: upgrade action validation and application
├── mapgen.test.ts              # MODIFIED: test doubled map sizes
└── ai.test.ts                  # MODIFIED: test AI upgrade heuristic
```

**Structure Decision**: Follows existing single-project layout. One new file added (`ai.worker.ts`). All other changes modify existing files. Test files follow existing patterns.

## Complexity Tracking

No constitution violations to justify. All changes follow existing patterns and principles.
