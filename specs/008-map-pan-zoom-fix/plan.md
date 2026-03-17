# Implementation Plan: Map Pan/Zoom & Ghost UI Fix

**Branch**: `008-map-pan-zoom-fix` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-map-pan-zoom-fix/spec.md`

## Summary

Fix a ghost-panel bug caused by `GameRenderer.destroy()` not cleaning up UIRenderer DOM elements, and add mouse-drag pan and scroll-wheel zoom to the PixiJS `worldContainer`, with boundary clamping and cursor-centered zoom. All coordinate transforms in the input handler are updated to account for the zoom scale factor.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x (rendering, Container transforms), no new dependencies required
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Browser (Chromium/Firefox/Safari via Vite dev + GitHub Pages static build)
**Project Type**: Browser game (single-player, static files)
**Performance Goals**: 60 fps maintained during pan/zoom; zoom response within one animation frame of scroll event
**Constraints**: No backend. Must deploy as static files to GitHub Pages. No new npm packages.
**Scale/Scope**: Two source files modified (renderer.ts, input.ts), one test file added.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Simplicity First ✅

- Ghost fix: one additional method call in `GameRenderer.destroy()`. No new abstractions.
- Pan/zoom: viewport state fields added directly to `GameRenderer`. No new classes, no separate Viewport abstraction (two methods — getZoom/isDragging — do not justify a new type).
- The `worldContainer` already exists as the game-world transform root. We extend what's there.

### II. Test-First Development ✅

- Coordinate transform logic (screen → world → tile) is a pure mathematical function and will be extracted to a testable pure function before implementation.
- Pan boundary clamping is a pure function (`clampPan`) that will have unit tests written first.
- Tests will fail (pure functions don't exist yet) before implementation begins.
- Renderer integration (PixiJS-dependent code) is not unit-tested per existing project convention (no renderer tests in the codebase).

### III. Vertical Slice Delivery ✅

Three independently deliverable slices (matching spec priorities):
- **P1 Slice**: Ghost panel fix — one-line change, independently testable by playing two games in sequence.
- **P2 Slice**: Pan — adds drag handling and pan clamping. Works without zoom (zoom defaults to 1.0).
- **P3 Slice**: Zoom — adds wheel handler and zoom clamping. Depends on P2's viewport state being in place.

### IV. Single-Player First, Multiplayer-Ready ✅

- Viewport state is presentation-only (lives in GameRenderer, not in GameState).
- `GameState` is unchanged — game logic, unit positions, and AI targeting are all in world-space tile coordinates and are zoom/pan agnostic.
- Future multiplayer would use the same `GameState`; each client manages its own viewport independently.

### V. Browser-Only Execution ✅

- All changes are client-side. No network requests, no new dependencies.
- PixiJS `Container` pan/zoom is a fully browser-native operation.
- `MouseEvent` and `WheelEvent` are standard browser APIs.

## Project Structure

### Documentation (this feature)

```text
specs/008-map-pan-zoom-fix/
├── plan.md              # This file
├── research.md          # Phase 0 complete
├── data-model.md        # Phase 1 complete
├── quickstart.md        # Phase 1 complete
├── contracts/           # Phase 1 — see below
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── renderer/
│   └── renderer.ts      # MODIFIED: add viewport state, pan/zoom handlers, initViewport, getZoom, isDragging
├── input/
│   └── input.ts         # MODIFIED: add zoom to coordinate transform, suppress click after drag
└── [all other files unchanged]

tests/
├── game/                # [unchanged]
└── renderer/
    └── viewport.test.ts # NEW: unit tests for clampPan() and screenToWorld() pure functions
```

**Structure Decision**: Single-project layout. Only two source files modified; one new test file.

## Complexity Tracking

No constitution violations. No complexity justification required.

---

## Phase 0: Research

**Status**: Complete. See [research.md](research.md).

Key decisions:
1. Ghost fix: add `this.uiRenderer.destroy()` to `GameRenderer.destroy()` — root cause confirmed (renderer.ts:185-188 never calls uiRenderer cleanup).
2. Viewport transform via PixiJS Container position + scale on the existing `worldContainer`.
3. Coordinate transform: divide by zoom in addition to subtracting pan offset.
4. Drag-vs-click: `isDragging()` exposed from renderer; checked in input handler before processing clicks.
5. Pan clamping: if map fits, center; if larger, clamp to [canvasW - mapPixelW, 0].
6. Zoom on cursor: inverse-project cursor to world point, re-project after zoom change.
7. Viewport initialized once (game start) and on resize; never reset inside the render loop.

---

## Phase 1: Design & Contracts

**Status**: Complete.

### Viewport Public Interface (contracts)

New methods added to `GameRenderer`:

```typescript
// Returns current zoom scale factor (1.0 = normal, 0.5 = zoomed out, 2.5 = max zoom in)
getZoom(): number

// Returns true if the most recent mouse gesture was a drag (not a click).
// Cleared on next mousedown. InputHandler checks this to suppress click after drag.
isDragging(): boolean

// Initializes pan and zoom for a new game (centers the map, resets zoom to 1.0).
// Called once after game start and after window resize (resize path reuses clampPan).
initViewport(): void
```

Existing method `getWorldOffset(): { x: number; y: number }` continues to work unchanged — it returns `{ x: this.panX, y: this.panY }` after the refactor.

### Internal Pure Functions (extracted for testability)

Two pure functions extracted to enable unit testing without PixiJS:

```typescript
// Computes clamped pan position given current state and canvas/map dimensions.
function clampPan(
  panX: number, panY: number,
  zoom: number,
  canvasW: number, canvasH: number,
  mapCols: number, mapRows: number,
  tileSize: number,
): { x: number; y: number }

// Converts screen-space coordinates to tile grid coordinates.
// Returns null if the point is outside the map.
function screenToTile(
  screenX: number, screenY: number,
  panX: number, panY: number,
  zoom: number,
  tileSize: number,
  mapCols: number, mapRows: number,
): { row: number; col: number } | null
```

These functions contain all the math and will be tested first (red-green-refactor).

### Artifacts Generated

- [research.md](research.md) — all decisions documented
- [data-model.md](data-model.md) — viewport state schema, clamping model, coordinate transform model
- [quickstart.md](quickstart.md) — manual verification guide and common issues
- [contracts/viewport-interface.md](contracts/viewport-interface.md) — public interface spec

---

## Implementation Sequence

*For reference by /speckit.tasks. Ordered by dependency.*

1. **Extract and test `clampPan` and `screenToTile`** (TDD: write tests → implement pure functions)
2. **Fix ghost panel** (`GameRenderer.destroy()` → add `this.uiRenderer.destroy()`)
3. **Add viewport state to `GameRenderer`** (panX, panY, zoom, drag tracking fields + constants)
4. **Refactor `centerWorldContainer` → `initViewport`** (set zoom=1, call clampPan, apply to worldContainer)
5. **Add `applyViewport()`** (applies panX/Y/zoom to worldContainer)
6. **Remove `centerWorldContainer()` from render loop** (render calls applyViewport instead)
7. **Expose `getZoom()` and `isDragging()`** methods on GameRenderer
8. **Add pan event handlers** (`mousedown`, `mousemove`, `mouseup` on canvas → update panX/Y via clampPan)
9. **Add zoom event handler** (`wheel` on canvas → compute cursor-centered zoom, call clampPan)
10. **Update coordinate transform in `input.ts`** (divide worldX/Y by zoom, check `renderer.isDragging()`)
