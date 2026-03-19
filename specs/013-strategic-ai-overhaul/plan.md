# Implementation Plan: Strategic AI Overhaul & Game Enhancements

**Branch**: `013-strategic-ai-overhaul` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-strategic-ai-overhaul/spec.md`

## Summary

Extend Pixel Wars with three independently deliverable slices: (1) two-turn city capture with a visual progress indicator, (2) an omniscient, phase-aware strategic AI that blocks player expansion before transitioning to offense, and (3) an end-game scoreboard showing side-by-side stats. All changes are pure TypeScript extensions to the existing immutable state model with no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x (rendering), simplex-noise 4.x (map gen, unchanged), Vitest 2.x (tests)
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x — unit tests for pure logic; no E2E framework
**Target Platform**: Browser (GitHub Pages static hosting)
**Project Type**: Browser game
**Performance Goals**: 60 fps rendering; AI turn completion ≤5 seconds (existing budget unchanged)
**Constraints**: No server, static files only, GitHub Pages-compatible
**Scale/Scope**: Single-player game; all changes affect existing ~15 source files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| **I. Simplicity First** | All three slices extend existing patterns (Settlement type, turns.ts, ai.ts, ui.ts). No new architectural layers or abstractions. Capture progress is two new fields on `Settlement`; stats tracking is one new record on `GameState`. | ✅ PASS |
| **II. Test-First Development** | Three new test files required before implementation: `capture.test.ts`, `ai-phase.test.ts`, `scoreboard.test.ts`. Tests must fail before implementation begins. | ✅ PASS (tests planned before implementation) |
| **III. Vertical Slice Delivery** | Three user stories are independently testable and deliverable: P1 (capture rule) has no AI dependency; P2 (AI overhaul) builds on P1 capture rule semantics; P3 (scoreboard) is fully independent. Each can ship to main independently. | ✅ PASS |
| **IV. Single-Player First, Multiplayer-Ready** | Capture progress stored per-city (not per-player-session) — clean for multiplayer. Stats tracked per `PlayerId` key — extensible to N players. `aiPhase` computed from state snapshot — no side-channel state. | ✅ PASS |
| **V. Browser-Only Execution** | All changes are pure TypeScript game logic and PixiJS rendering. No network requests, no server, no new npm dependencies. Static-file deployable. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/013-strategic-ai-overhaul/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── types-delta.md   # Phase 1 output — changed TypeScript interfaces
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (affected files)

```text
src/
├── game/
│   ├── types.ts           # Add captureProgress/capturingUnit to Settlement; add GameStats; update GameState
│   ├── state.ts           # Initialize new fields in createGameState; thread stats through applyAction
│   ├── rules.ts           # No changes to validation rules for capture (capture is resolved in turns.ts)
│   ├── turns.ts           # Rewrite resolveCaptures for two-turn logic; track income/unit stats
│   └── ai/
│       ├── ai.ts          # Omniscient vision: remove fog filter; add phase computation; strategic target selection
│       ├── objectives.ts  # Add contested-city blocking objectives; phase-gated offensive targets
│       └── scoring.ts     # Phase-aware utility weights (expansion vs offensive)
└── renderer/
    ├── renderer.ts        # Render capture progress indicator (Graphics overlay on city tiles)
    └── ui.ts              # Add showScoreboard(); extend showVictoryScreen() to call it

tests/
└── unit/
    ├── capture.test.ts    # Two-turn capture logic (new)
    ├── ai-phase.test.ts   # AI phase transition + omniscient vision (new)
    └── scoreboard.test.ts # Stats accumulation + scoreboard data (new)
```

**Structure Decision**: Single-project layout (Option 1). No new directories. All changes are incremental extensions to existing files, except three new test files.

## Complexity Tracking

> No constitution violations requiring justification.
