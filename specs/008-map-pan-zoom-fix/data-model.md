# Data Model: Map Pan/Zoom & Ghost UI Fix

**Feature**: 008-map-pan-zoom-fix
**Date**: 2026-03-16

---

## Viewport State

The viewport is not part of `GameState` (game rules are not affected by how the player views the map). It lives entirely in `GameRenderer` as private presentation state.

### Fields

| Field | Type | Initial Value | Description |
|-------|------|--------------|-------------|
| `panX` | `number` | Computed (centered) | Horizontal pan offset in canvas pixels. Applied as `worldContainer.x`. |
| `panY` | `number` | Computed (centered) | Vertical pan offset in canvas pixels. Applied as `worldContainer.y`. |
| `zoom` | `number` | `1.0` | Zoom scale factor. Applied as `worldContainer.scale.set(zoom)`. |
| `isPanning` | `boolean` | `false` | True while mouse button is held and drag threshold exceeded. |
| `wasDragging` | `boolean` | `false` | True immediately after a drag ends; cleared on next mousedown. Prevents click from firing after drag. |
| `dragStartX` | `number` | `0` | Canvas-relative X position where the current mousedown began. |
| `dragStartY` | `number` | `0` | Canvas-relative Y position where the current mousedown began. |
| `panStartX` | `number` | `0` | Value of `panX` at the start of the current drag gesture. |
| `panStartY` | `number` | `0` | Value of `panY` at the start of the current drag gesture. |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_ZOOM` | `0.5` | Minimum zoom level. At 0.5× a 40×40 map (1280px) fits in ~640px. |
| `MAX_ZOOM` | `2.5` | Maximum zoom level. At 2.5× tiles are 80px — detail visible. |
| `ZOOM_STEP` | `1.1` | Multiplicative factor per scroll tick. |
| `DRAG_THRESHOLD` | `4` | Pixels moved before a mousedown is treated as a drag, not a click. |

### Validation Rules

- `zoom` is always clamped to `[MIN_ZOOM, MAX_ZOOM]` before applying.
- `panX` and `panY` are always clamped to their valid ranges after any change (pan or zoom).
- `wasDragging` is read by `InputHandler` via `renderer.isDragging()` to suppress click processing.

---

## Boundary Clamping Model

The clamping model ensures the map remains visible and tiles are always reachable.

```
mapPixelW = mapSize.cols * TILE_SIZE * zoom
mapPixelH = mapSize.rows * TILE_SIZE * zoom

panXMin = canvasW - mapPixelW    // if map wider than canvas, left edge of map is at right side
panXMax = 0                       // right edge of map never goes past left side of canvas

// If map fits within canvas, center it instead
if mapPixelW <= canvasW:
    panX = (canvasW - mapPixelW) / 2    // centering override

if mapPixelH <= canvasH:
    panY = (canvasH - mapPixelH) / 2    // centering override
```

---

## Coordinate Transformation Model

Converts screen-space mouse coordinates to game-space tile coordinates.

```
// Screen → canvas-relative
canvasX = clientX - canvasBoundingRect.left
canvasY = clientY - canvasBoundingRect.top

// Canvas-relative → world space (accounting for pan and zoom)
worldX = (canvasX - panX) / zoom
worldY = (canvasY - panY) / zoom

// World space → tile grid
col = floor(worldX / TILE_SIZE)
row = floor(worldY / TILE_SIZE)

// Bounds check
valid = worldX >= 0 && worldY >= 0 && col < mapSize.cols && row < mapSize.rows
```

This replaces the current formula `worldX = canvasX - offset.x` (which works only when zoom = 1.0).
