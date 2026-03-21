# Implementation Plan: AI Settlement Capture Prioritization

**Branch**: `015-ai-capture-priority` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/015-ai-capture-priority/spec.md`

## Summary

The AI fails to capture freely available settlements because the move-scoring system does not give adequate priority to moves that land on capturable settlement tiles. Two scoring gaps exist: (1) moves that immediately land on a capturable settlement receive no bonus relative to repositioning/exploration moves, and (2) units already mid-capture (on a settlement during turn 1 of 2) receive a hold score of 0, so the alpha-beta search may choose to move them away. Both gaps are fixed by targeted score adjustments in `src/game/ai/movegen.ts`.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x (rendering only — AI logic is pure game state), simplex-noise 4.x (map gen, unchanged), Vitest 2.x (tests)
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Browser (GitHub Pages)
**Project Type**: Browser-based strategy game
**Performance Goals**: AI turn completes within 5000ms budget (no change from prior work)
**Constraints**: No new dependencies; changes scoped to `src/game/ai/movegen.ts` only
**Scale/Scope**: ~20-line change to a single AI module; no schema changes, no new entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ PASS | Two targeted score constants in one file — no new abstractions, no new modules |
| II. Test-First Development | ✅ PASS | Unit tests written before implementation; tests directly verify scoring behavior |
| III. Vertical Slice Delivery | ✅ PASS | P1 (adjacent capture) is independently deployable and testable; P2 and P3 build on top |
| IV. Single-Player First, Multiplayer-Ready | ✅ PASS | AI logic is already isolated behind `PlayerId`; change uses `unit.owner` not a hard-coded constant |
| V. Browser-Only Execution | ✅ PASS | Pure TypeScript game logic — no server calls, no new dependencies |

No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/015-ai-capture-priority/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A for this feature — no schema changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
└── game/
    └── ai/
        └── movegen.ts   # Only file changed — capture bonus + mid-capture hold score

tests/
└── game/
    └── ai/
        └── movegen.test.ts  # New/updated unit tests for capture scoring
```

**Structure Decision**: Single-file change. All AI logic is already co-located in `src/game/ai/`. No new files required in production source.
