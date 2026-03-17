# Implementation Plan: Game UI Enhancements

**Branch**: `012-game-ui-enhancements` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-game-ui-enhancements/spec.md`

## Summary

Add four UI features to improve game information visibility: (1) a persistent control panel showing income/cities/towns, (2) unit stat tooltips on hover/long-press, (3) floating damage numbers during combat animations, and (4) a dismissible in-game instructions overlay. All features use DOM overlays (for panels/tooltips/instructions) and PixiJS primitives (for damage numbers) consistent with the existing rendering architecture.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x (rendering, Text/Container for damage numbers), DOM overlays (existing pattern for UI panels)
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Browser (desktop + mobile), static hosting on GitHub Pages
**Project Type**: Browser game (single-player strategy)
**Performance Goals**: 60 fps maintained with new overlays and floating text
**Constraints**: No new dependencies; all UI must work on both desktop (mouse hover) and mobile (touch/long-press)
**Scale/Scope**: 4 new UI components added to existing ~3,700 LOC codebase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | DOM overlays for panels/tooltips (existing pattern), PixiJS Text for damage numbers (minimal new abstraction) |
| II. Test-First Development | PASS | Unit tests for income/settlement counting logic; visual elements verified manually |
| III. Vertical Slice Delivery | PASS | Each of the 4 features is independently deliverable and testable per spec user stories |
| IV. Single-Player First, Multiplayer-Ready | PASS | All features derive from GameState — no hard-coded player assumptions |
| V. Browser-Only Execution | PASS | No server calls; all static assets |

## Project Structure

### Documentation (this feature)

```text
specs/012-game-ui-enhancements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
index.html               # MODIFY: Flex column layout — #hud-bar (in-flow) + #game-area (border)
src/
├── renderer/
│   ├── ui.ts            # MODIFY: HUD uses #hud-bar in-flow element; add control panel, instructions overlay, help button
│   ├── units.ts         # MODIFY: Add damage number spawning to AnimationController
│   └── renderer.ts      # MODIFY: ResizeObserver on #game-area; add tooltip hover detection, expose damage number API
├── input/
│   └── input.ts         # MODIFY: Add hover tooltip logic, long-press for mobile
├── game/
│   ├── types.ts         # No changes — CombatResult already has all needed data
│   └── constants.ts     # No changes — UNIT_CONFIG already has all stat fields
└── main.ts              # MODIFY: Canvas container changed from #app to #game-area; pass combat result data to renderer

tests/
└── unit/
    └── ui-helpers.test.ts  # NEW: Test income/settlement computation helpers
```

**Structure Decision**: All changes fit within existing file structure. One new test file for pure helper functions. No new renderer files needed — extensions to existing UIRenderer, UnitsRenderer, and AnimationController classes.

## Complexity Tracking

No constitution violations to justify.
