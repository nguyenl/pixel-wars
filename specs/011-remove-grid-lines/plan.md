# Implementation Plan: Remove Grid Lines

**Branch**: `011-remove-grid-lines` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-remove-grid-lines/spec.md`

## Summary

Remove the 1-pixel grid lines visible between tiles on the game map. The lines are caused by drawing rectangles at `tileSize - 1` instead of `tileSize`, leaving a 1px gap. The fix changes all rectangle dimensions in the tile and highlight rendering to use the full tile size.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x (Graphics primitives for tile rendering)
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Browser (static files on GitHub Pages)
**Project Type**: Browser game
**Performance Goals**: 60 fps rendering (no change expected — same draw calls, different dimensions)
**Constraints**: No new dependencies, no architectural changes
**Scale/Scope**: Two file changes (`src/renderer/tilemap.ts`, `src/renderer/fog.ts`), ~7 lines affected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Minimal change — replacing `tileSize - 1` with `tileSize`. No new abstractions. |
| II. Test-First Development | PASS | Visual-only change to rendering dimensions. Existing gameplay tests remain valid. No new logic to unit test. |
| III. Vertical Slice Delivery | PASS | Single self-contained change, independently testable by visual inspection. |
| IV. Single-Player First, Multiplayer-Ready | PASS | No impact on game state or architecture. |
| V. Browser-Only Execution | PASS | No server-side changes. Remains static-file deployable. |

## Project Structure

### Documentation (this feature)

```text
specs/011-remove-grid-lines/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
└── renderer/
    ├── tilemap.ts       # Modified — change rect dimensions for tiles and highlights
    └── fog.ts           # Modified — change rect dimensions for fog overlays

tests/                   # No new tests needed — visual change only
```

**Structure Decision**: No new files or directories needed. The change is confined to `src/renderer/tilemap.ts` and `src/renderer/fog.ts` where rectangle dimensions are specified.

## Complexity Tracking

> No constitution violations. Table not needed.
