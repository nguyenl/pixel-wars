# Implementation Plan: Unit Animations, Visual Polish, and Combat Fixes

**Branch**: `004-unit-animations-combat-fixes` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-unit-animations-combat-fixes/spec.md`

## Summary

Fix two interrelated combat bugs (units illegally moving to enemy-occupied tiles; attacks silently failing), then layer on unit animations (idle bob, movement traversal, attack lunge+return, death flash), terrain tile visual detail (per-type decorative Graphics elements), cursor hover highlighting on reachable/attackable tiles, and basic synthesized audio feedback (select, move, attack sounds). All renderer changes are additive; all bug fixes are confined to `src/game/pathfinding.ts`, `src/game/rules.ts`, and `src/input/input.ts`.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: PixiJS 8.x (`pixi.js`), Vitest 2.x
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest (unit tests in `tests/`)
**Target Platform**: Browser (static files, GitHub Pages compatible)
**Project Type**: Browser game (single-player, static)
**Performance Goals**: 60 fps render loop; move animations ≤ 500ms per tile; attack animations ≤ 600ms total
**Constraints**: No server backend; no external audio files; bundle must serve from static hosting
**Scale/Scope**: Small-to-large grid maps (10×10 to 20×20); ~20 units maximum per game

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ Pass | Terrain detail uses PixiJS Graphics primitives (no new sprite assets). Sound uses Web Audio API synthesis (no audio files). Hover uses existing `mousemove` on canvas. No new abstractions beyond what the feature needs. |
| II. Test-First Development | ✅ Pass | Combat bug fixes require failing tests first (`rules.test.ts`, `pathfinding.test.ts`). All game-logic changes have unit tests. Renderer/animation changes are display-layer only and tested via visual integration. |
| III. Vertical Slice Delivery | ✅ Pass | Each user story is independently deliverable: combat fixes, animations, tile detail, hover highlight, and sound each stand alone. Combat fix is P1 and must ship first. |
| IV. Single-Player First, Multiplayer-Ready | ✅ Pass | Sound and animation are display-layer concerns that do not touch serializable game state. Bug fixes enforce state invariants that are valid for both single and multiplayer. Hover and animations are client-side only. |
| V. Browser-Only Execution | ✅ Pass | Web Audio API is a standard browser API. PixiJS Ticker is already in use. No backend calls. No external audio asset downloads. |

**Post-design re-check**: The `AnimationController` introduced in Phase 1 is renderer-side only — it does not mutate `GameState` and is not serialized. The `SoundManager` initialises lazily on first user interaction (browser autoplay policy). No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-unit-animations-combat-fixes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── animation-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── pathfinding.ts   # MODIFY: exclude enemy tiles from getReachableTiles
│   ├── rules.ts         # MODIFY: block enemy-occupied destination in validateMove
│   ├── combat.ts        # unchanged
│   ├── state.ts         # unchanged
│   ├── types.ts         # unchanged
│   └── ...
├── renderer/
│   ├── units.ts         # MODIFY: add AnimationController, idle/move/attack/death
│   ├── tilemap.ts       # MODIFY: add terrain detail, hover highlight layer
│   └── renderer.ts      # MODIFY: expose setHoverCoord(), isAnimating()
├── audio/
│   └── sound.ts         # NEW: SoundManager (Web Audio API synthesis)
└── input/
    └── input.ts         # MODIFY: mousemove listener, block input during animation

tests/
├── game/
│   ├── pathfinding.test.ts  # MODIFY: add enemy-tile-exclusion tests
│   ├── rules.test.ts        # MODIFY: add enemy-occupied-destination tests
│   └── combat.test.ts       # unchanged (already covers combat resolution)
└── ...
```

**Structure Decision**: Single project. All changes are additive to the existing `src/` layout. A new `src/audio/` directory is introduced for the sound system (too small to go in renderer, not game logic).

## Complexity Tracking

No constitution violations requiring justification.
