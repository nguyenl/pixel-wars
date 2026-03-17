# Research: Map Pan/Zoom & Ghost UI Fix

**Feature**: 008-map-pan-zoom-fix
**Date**: 2026-03-16
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## Finding 1: Ghost Panel Root Cause

**Decision**: Fix by adding one line to `GameRenderer.destroy()`.

**Investigation**: `UIRenderer.destroy()` (ui.ts:264-271) correctly calls `.remove()` on every DOM element it owns. However, `GameRenderer.destroy()` (renderer.ts:185-188) only calls `this.hideThinkingIndicator()` and `this.app.destroy(true)`. It never calls `this.uiRenderer.destroy()`.

In `Game.resetGame()` (main.ts:215-222), the sequence is:
1. `renderer.destroy()` → PixiJS canvas removed, but `div#hud` (and all other UI divs) remain in the DOM
2. `new GameRenderer()` created and initialized → new canvas appended
3. New game starts → `renderHUD()` checks `if (!this.hudEl)` and creates a **second** `div#hud`
4. Both HUD divs are now in the DOM; the old one is visible underneath the new one (both fixed-position at top)

**Rationale**: The fix is minimal — one line in `GameRenderer.destroy()`. No architecture changes required.

**Alternatives considered**:
- Hide/show HUD between games instead of remove/recreate: more complex lifecycle management, rejected
- Create UIRenderer fresh on each `resetGame()`: already done, but the old instance's DOM elements are never cleaned up — root cause is missing `destroy()` call

---

## Finding 2: Viewport Transform Mechanism

**Decision**: Use PixiJS `Container` position and scale on `worldContainer` for all pan/zoom transforms.

**Rationale**: `worldContainer` already wraps all game-world rendering layers (tilemap, units, fog). PixiJS Container's transform matrix is automatically propagated to all children during rendering. Setting `worldContainer.x/y` for pan and `worldContainer.scale.set(zoom)` for zoom means zero changes to any child renderer.

**Current centering logic** (renderer.ts:190-197): `centerWorldContainer()` sets `worldContainer.x/y` to center the map and is called on every `render()` call. This must change — once the player has panned, the render loop must not reset the position. `centerWorldContainer` (renamed `initViewport`) must be called only at game start and on window resize (when map fits).

**Alternatives considered**:
- Separate camera matrix applied during rendering: more complex, requires changes in every child renderer
- CSS transform on canvas element: does not affect PixiJS coordinate system, would break click mapping

---

## Finding 3: Coordinate Transformation with Zoom

**Decision**: Update click and hover coordinate transforms in `input.ts` to divide by zoom.

**Current formula** (input.ts:48-50):
```
worldX = clientX - rect.left - offset.x
worldY = clientY - rect.top - offset.y
col = floor(worldX / TILE_SIZE)
row = floor(worldY / TILE_SIZE)
```

**Corrected formula** (with zoom):
```
worldX = (clientX - rect.left - offset.x) / zoom
worldY = (clientY - rect.top - offset.y) / zoom
col = floor(worldX / TILE_SIZE)
row = floor(worldY / TILE_SIZE)
```

`offset.x` and `offset.y` are already exposed via `renderer.getWorldOffset()`. A new `renderer.getZoom()` method must be added.

---

## Finding 4: Drag-vs-Click Disambiguation

**Decision**: Track drag state in the renderer (where pan events are handled); expose `isDragging()` for the click handler in input.ts to suppress click processing during/after a drag.

**Mechanism**:
- `mousedown` on canvas → record start position, set `isPanning = false`
- `mousemove` while button held → if moved > 4px from start, set `isPanning = true`, apply pan delta
- `mouseup` → release pan; set `wasDragging = isPanning`
- `click` event fires after `mouseup` → input.ts checks `renderer.wasDragging()` before processing

4px threshold eliminates accidental micro-drags when clicking.

**Alternatives considered**:
- `pointerdown`/`pointermove`/`pointerup` events: equivalent for mouse, adds touch-device flexibility but out of scope per spec assumptions — rejected
- Consume/cancel the `click` event in mouseup: not possible to cancel a synthetic click event that hasn't fired yet — rejected

---

## Finding 5: Pan Boundary Clamping

**Decision**: Clamp pan so the map is always at least partially visible; if the map fits within the canvas at the current zoom, center it.

**Formulas**:
```
mapPixelW = mapCols * TILE_SIZE * zoom
mapPixelH = mapRows * TILE_SIZE * zoom

// Horizontal
if mapPixelW <= canvasW:
    panX = (canvasW - mapPixelW) / 2   // center
else:
    panX = clamp(panX, canvasW - mapPixelW, 0)

// Vertical (symmetric)
if mapPixelH <= canvasH:
    panY = (canvasH - mapPixelH) / 2
else:
    panY = clamp(panY, canvasH - mapPixelH, 0)
```

This ensures tiles are always reachable — no empty space visible beyond the map edges.

---

## Finding 6: Zoom on Cursor

**Decision**: When zooming via scroll wheel, the world point currently under the cursor stays fixed in screen space.

**Formulas**:
```
// Mouse position relative to canvas
mouseX = clientX - rect.left
mouseY = clientY - rect.top

// World point under cursor before zoom
worldPointX = (mouseX - panX) / oldZoom
worldPointY = (mouseY - panY) / oldZoom

// Apply zoom
newZoom = clamp(oldZoom * scaleFactor, MIN_ZOOM, MAX_ZOOM)

// Adjust pan to keep world point fixed under cursor
newPanX = mouseX - worldPointX * newZoom
newPanY = mouseY - worldPointY * newZoom

// Then apply boundary clamping to newPanX/newPanY
```

`scaleFactor = 1.1` for zoom in, `1 / 1.1` for zoom out (smooth logarithmic feel).

---

## Finding 7: Viewport Initialization and Resize Behavior

**Decision**: `initViewport()` is called once when a new game starts. On window resize, re-apply clamping (which auto-centers if map now fits).

**Zoom defaults**: min = 0.5, max = 2.5, initial = 1.0. Initial pan centers the map (same as current `centerWorldContainer` behavior).

**Resize behavior**: `onResize()` currently calls `centerWorldContainer()`. With the new system, resize should call `clampPan()` — if the map fits, it centers; if larger, keeps current pan (clamped within bounds). This preserves the player's current viewport position after resize.

---

## Finding 8: Responsibility Boundaries

**Decision**: Pan/zoom event handling stays in `renderer.ts`; click-to-tile logic stays in `input.ts`.

**Rationale**: Pan/zoom directly modifies `worldContainer` which is private to `GameRenderer`. The renderer is the right owner. InputHandler takes a dependency on renderer only via the existing public interface (`getWorldOffset()`, `getTileSize()`), with one addition: `getZoom()`.

No new abstraction layer (e.g., a dedicated `Viewport` class) is warranted for a two-method interface. YAGNI applies.
