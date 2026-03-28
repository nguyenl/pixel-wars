# Contract: GameRenderer Public API

**Feature**: 016-canvas-to-webgl
**Date**: 2026-03-28
**Consumer**: `src/main.ts` (sole caller of `GameRenderer`)

---

## Purpose

`GameRenderer` is the single boundary between game logic (`src/game/`) and the visual output. It accepts `GameState` as a read-only input and produces Three.js WebGL output. No game logic is permitted inside renderer code.

This contract is **stable** — the public API is intentionally unchanged from the PixiJS version so that `main.ts` requires minimal edits.

---

## Lifecycle

```
init(container) → [game loop] render(state, humanPlayerId) → destroy()
```

1. `init(container)` — async. Creates Three.js renderer, scene, camera, loads textures. Appends canvas to `container`.
2. `render(state, playerId)` — called every frame (driven by `requestAnimationFrame`). Reads state, updates Three.js scene, calls `renderer.render(scene, camera)`.
3. `destroy()` — disposes Three.js renderer, removes canvas, disconnects `ResizeObserver`.

---

## Method Signatures

### Initialization & Teardown

```ts
async init(container: HTMLElement): Promise<void>
```
- Creates WebGL context inside `container`.
- Loads PNG sprite assets for units.
- Sets up `ResizeObserver` for responsive canvas.

```ts
destroy(): void
```
- Disposes all Three.js geometries, materials, textures, and renderer.
- Disconnects resize observer.

---

### Render

```ts
render(state: GameState, humanPlayerId: PlayerId): void
```
- Synchronous. Reads `state` (never mutates it).
- Updates tile meshes, unit sprites, fog overlays, and HUD.
- Calls `webGLRenderer.render(scene, camera)` at the end.

---

### Highlights & Hover

```ts
highlightReachable(coords: TileCoord[]): void
highlightAttackable(coords: TileCoord[]): void
setHoverCoord(coord: TileCoord | null): void
```
- Sets internal highlight state. Applied during next `render()` call.
- Reachable: blue tint overlay on tile. Attackable: red tint overlay on tile.

---

### UI Delegation (no change — pass-through to UIRenderer)

```ts
showMainMenu(onMapSizeSelected: (size: MapSizeOption) => void): void
hideMainMenu(): void
showScoreboard(stats: Record<PlayerId, GameStats>, winner: PlayerId, onReturnToMenu: () => void): void
```

---

### Animations

```ts
animateMove(unitId: string, path: TileCoord[], onComplete: () => void): void
```
- Moves unit sprite along `path` via interpolated position steps.
- `onComplete` fires when final step completes.

```ts
animateAttack(unitId: string, targetTileCoord: TileCoord, onComplete: () => void): void
```
- Lunges unit sprite 40% toward target, then returns. Calls `onComplete` after return.

```ts
animateDeath(unitId: string, onComplete: () => void): void
```
- Fades unit sprite alpha 1.0 → 0.0 over ~400 ms. Calls `onComplete` after.

---

### Overlay Indicators

```ts
showDamageNumber(tileCoord: TileCoord, damage: number, color?: number): void
```
- Spawns floating "-N" text above tile. Floats up and fades over ~800 ms.
- Default color: 0xff4444 (red).

```ts
showThinkingIndicator(): void
hideThinkingIndicator(): void
```
- Shows/hides pulsing "AI is thinking..." text overlay.

---

### Viewport Accessors

```ts
getTileSize(): number        // Returns TILE_SIZE constant (32)
getWorldOffset(): { x: number; y: number }  // Returns camera pan (world X, Z)
getZoom(): number            // Returns current zoom level (1.0 = default)
isDragging(): boolean        // True while user is panning (suppress tap events)
isAnimating(): boolean       // True while any unit animation is in progress
```

---

## Removed Methods

| Method | Reason |
|--------|--------|
| `getApp(): Application` | PixiJS-specific. No external callers (verified by grep). Removed. |

---

## Input Event Contract

`GameRenderer` attaches pointer and wheel event listeners to the canvas. It fires no events — instead, `main.ts` reads `isDragging()` and `getWorldOffset()` / `getZoom()` to compute tile coordinates from pointer position.

**Tile coordinate from pointer** (computed in `main.ts` using raycaster):
```ts
// NDC computation (provided by GameRenderer internally, called from main.ts via helper)
ndcX = (clientX / canvas.clientWidth)  * 2 - 1
ndcY = (clientY / canvas.clientHeight) * -2 + 1
// Then raycaster cast → tile.userData.coord: TileCoord
```

---

## Coordinate Conversion Contract (pure functions, unit-testable)

Located in `src/renderer/viewport.ts` alongside `clampPan`:

```ts
/** Grid tile coord → Three.js world position (bottom-center of tile at terrain surface). */
export function gridToWorld(
  coord: TileCoord,
  terrainHeight: number,
  tileSize: number
): { x: number; y: number; z: number }

/** Three.js world XZ → nearest grid coord. */
export function worldToGrid(
  worldX: number,
  worldZ: number,
  tileSize: number
): TileCoord

/** Client pixel → Normalized Device Coordinates. */
export function clientToNDC(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): { x: number; y: number }
```

These are exported pure functions, testable in Vitest without a browser DOM or WebGL context.
