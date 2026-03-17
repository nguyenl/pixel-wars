# Contract: GameRenderer Viewport Interface

**Feature**: 008-map-pan-zoom-fix
**Date**: 2026-03-16

This document defines the public interface additions to `GameRenderer` required for this feature. All methods listed below are new additions; no existing public methods are removed or changed.

---

## New Public Methods

### `getZoom(): number`

Returns the current zoom scale factor.

- Range: `[0.5, 2.5]` (MIN_ZOOM to MAX_ZOOM, always clamped)
- Default: `1.0` at game start
- Used by: `InputHandler` to divide screen-space coordinates into world-space coordinates

### `isDragging(): boolean`

Returns `true` if the most recent mouse gesture was a drag (mouse moved more than 4px while button held).

- Cleared to `false` on the next `mousedown` event
- Set to `true` during `mousemove` if drag threshold is exceeded while button is pressed
- Used by: `InputHandler` at the start of click processing to suppress tile-click handling after a pan gesture

### `initViewport(): void`

Resets viewport to the initial state for a new game: zoom = 1.0, pan centered on the map.

- Called once after `render()` is first called with a new `GameState` (game start)
- **Not** called inside the `render()` loop
- Internally calls `clampPan()` to compute the initial centered position

---

## Modified Existing Methods

### `getWorldOffset(): { x: number; y: number }` *(unchanged signature)*

After refactor, returns `{ x: this.panX, y: this.panY }` instead of `{ x: worldContainer.x, y: worldContainer.y }`. These are equivalent (panX/Y are always applied to worldContainer before any coordinate lookup). No changes required in callers.

---

## Removed Behavior (not removed method)

`centerWorldContainer()` was previously called inside `render()` on every frame, overwriting any pan/zoom the user had applied. After this change:
- `centerWorldContainer()` is renamed `initViewport()` and called only on game start
- `render()` calls `applyViewport()` instead, which applies `panX/Y/zoom` without resetting them

---

## Pure Functions (exported for testing)

These are not part of the `GameRenderer` class interface but are exported from their module for unit testing:

### `clampPan(panX, panY, zoom, canvasW, canvasH, mapCols, mapRows, tileSize): { x, y }`

Returns a clamped pan position. If the map fits within the canvas at the current zoom, returns the centered position. Otherwise clamps to keep the map within canvas bounds.

### `screenToTile(screenX, screenY, panX, panY, zoom, tileSize, mapCols, mapRows): { row, col } | null`

Converts screen-space pixel coordinates to tile grid coordinates. Returns `null` if the point falls outside the map bounds.
