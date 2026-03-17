# Research: Remove Grid Lines

**Feature**: 011-remove-grid-lines
**Date**: 2026-03-17

## Research Summary

No unknowns or NEEDS CLARIFICATION items were identified in the Technical Context. The change is fully understood from the existing codebase.

## Finding: Grid Line Root Cause

**Decision**: The grid lines are caused by `tileSize - 1` used as the width/height argument in `Graphics.rect()` calls within `src/renderer/tilemap.ts`.

**Rationale**: Drawing rectangles 1 pixel smaller than the tile grid spacing creates a 1-pixel gap between adjacent tiles. This gap renders as the canvas background color, appearing as grid lines. Changing to `tileSize` makes tiles fill their full grid cell, eliminating the gap.

**Affected locations in `src/renderer/tilemap.ts`**:
1. `renderTiles` (line 66): `g.rect(x, y, tileSize - 1, tileSize - 1)` — base terrain tiles
2. `renderHighlights` (line 252): movement highlight rects
3. `renderHighlights` (line 259): attack highlight rects
4. `renderHighlights` (line 270): hover-on-reachable highlight rects
5. `renderHighlights` (line 275): hover-on-attackable highlight rects

**Affected locations in `src/renderer/fog.ts`**:
6. `render` (line 38): hidden fog overlay rects
7. `render` (line 42): explored fog overlay rects

**Alternatives considered**:
- Adding a background color to fill gaps: Rejected — more complex, doesn't solve the root cause.
- Using a grid toggle setting: Rejected — user wants permanent removal, adds unnecessary complexity.
