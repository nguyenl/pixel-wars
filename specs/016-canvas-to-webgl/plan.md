# Implementation Plan: 3D WebGL Rendering Upgrade

**Branch**: `016-canvas-to-webgl` | **Date**: 2026-03-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/016-canvas-to-webgl/spec.md`

## Summary

Replace the PixiJS 2D rendering layer with Three.js 3D WebGL rendering. All terrain tiles become `BoxGeometry` meshes with elevation-based heights, units become camera-facing `THREE.Sprite` billboards, fog of war becomes per-tile transparent overlay meshes, and the camera switches to an isometric `OrthographicCamera`. The game logic layer (`src/game/`) and DOM HUD (`src/renderer/ui.ts`) are unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `three` + `@types/three` (replace `pixi.js` + `@pixi/tilemap`)
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Browser (WebGL-capable), deployable to GitHub Pages as static files
**Project Type**: Browser game — single-player, static file hosting
**Performance Goals**: ≥ 30 FPS on mid-range hardware; initial load increase ≤ 20%
**Constraints**: Static files only, GitHub Pages compatible, no server runtime, mobile WebGL support
**Scale/Scope**: ~100–600 tiles per map, ≤ 20 units simultaneously, turn-based (not real-time)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ⚠️ VIOLATION — see Complexity Tracking | Three.js replaces PixiJS; justified by explicit user requirement. Three.js selected (not Babylon.js) to minimize added complexity. |
| II. Test-First Development | ✅ PASS | Coordinate conversion math (grid↔world, NDC→tile) is fully unit-testable. Tests written before implementation per Red-Green-Refactor. Renderer integration tests cover full frame rendering with snapshot comparison. |
| III. Vertical Slice Delivery | ✅ PASS | Four user stories map to four independently deliverable increments: (1) renderer init, (2) tile meshes, (3) unit sprites, (4) HUD/fog validation. |
| IV. Single-Player First, Multiplayer-Ready | ✅ PASS | Zero changes to game logic or state. Rendering decoupled from `GameState` is unchanged — rendering accepts `GameState` read-only, which is already structured for future multiplayer. |
| V. Browser-Only Execution | ✅ PASS | Three.js is a browser-native WebGL library. Static bundle, no server runtime. GitHub Pages compatible. |

**Constitution Amendment Required**: Technology Standards currently reads "The frontend MUST use a 2D canvas or equivalent primitive for pixel rendering." This was a `TODO(TECH_STACK)` placeholder. This feature IS the finalization of that decision. The constitution MUST be amended (§Technology Standards, bump 2.1.0 → 2.2.0) **before implementation begins**. See Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-canvas-to-webgl/
├── plan.md              # This file
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── renderer/
│   ├── renderer.ts     # REWRITE: GameRenderer — Three.js WebGLRenderer + Scene + OrthographicCamera
│   ├── tilemap.ts      # REWRITE: TilemapRenderer — BoxGeometry tiles with terrain height
│   ├── units.ts        # REWRITE: UnitsRenderer — THREE.Sprite billboards + AnimationController
│   ├── fog.ts          # REWRITE: FogRenderer — per-tile MeshBasicMaterial fog meshes
│   ├── ui.ts           # UNCHANGED: DOM-based HUD overlays
│   └── viewport.ts     # UPDATE: frustum zoom + camera pan, preserve clampPan logic
├── game/               # UNCHANGED: all game logic (types, state, AI, combat, pathfinding)
├── input/              # UPDATE: gesture.ts unchanged; main.ts input wiring updates NDC calc
├── main.ts             # UPDATE: initialize Three.js renderer instead of PixiJS Application
└── vite-env.d.ts       # UNCHANGED

tests/
├── renderer/           # NEW: unit tests for coordinate math, viewport clamping
└── game/               # UNCHANGED: existing game logic tests
```

**Structure Decision**: Single-project layout unchanged. Only `src/renderer/` files are rewritten; `src/game/` and `src/input/` require minimal or no changes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Replace PixiJS with Three.js (adds new rendering dependency) | User explicitly requested 3D WebGL with depth/perspective rendering. PixiJS is a 2D engine and cannot produce the isometric 3D view requested. | Keeping PixiJS with manual isometric math (skewing 2D sprites) would produce pseudo-3D without real depth shading, elevation, or natural 3D lighting — it does not satisfy FR-001 or FR-002. |
| Constitution Technology Standards amendment (2.1.0 → 2.2.0) | The existing "2D canvas" rule is a TODO placeholder. This feature finalizes the rendering technology choice. | Leaving the constitution in conflict with the implementation creates confusion for all future contributors and violates the constitution's own governance principle of accuracy. |

---

## Phase 0: Research (Complete)

See [research.md](research.md) for full findings. Key resolved decisions:

| Question | Resolution |
|----------|-----------|
| 3D library choice | Three.js (`three` + `@types/three`), 168 KB vs Babylon.js 1.4 MB |
| Camera type | `THREE.OrthographicCamera` at position `(d, d, d)`, isometric angle |
| Grid → world mapping | `x = col * TILE_SIZE`, `z = row * TILE_SIZE`, `y = terrainHeight/2` |
| Click detection | `THREE.Raycaster.intersectObjects(tileMeshes)`, coords in `userData` |
| Fog of war | Per-tile fog mesh above each tile, `MeshBasicMaterial` with opacity |
| Unit rendering | `THREE.Sprite` + `SpriteMaterial`, auto camera-facing, tint for team color |
| Animations | Preserve existing `AnimationController`, replace PixiJS `ticker.deltaMS` with `THREE.Clock` |
| Viewport pan/zoom | Frustum scaling for zoom, camera XZ offset for pan |
| Constitution | Technology Standards must be amended before implementation |

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](data-model.md).

**New render-layer data structures** (not part of `GameState` — internal to renderer):

```ts
// TileRenderEntry — stored in Map<tileId, TileRenderEntry>
{
  tileMesh: THREE.Mesh;          // BoxGeometry tile
  fogMesh:  THREE.Mesh;          // Fog overlay plane
  terrainHeight: number;         // Cached for unit Z-offset calculation
}

// UnitRenderEntry — stored in Map<unitId, UnitRenderEntry>
{
  sprite:    THREE.Sprite;       // Billboard sprite
  hpBar:     THREE.Mesh;         // Thin plane above sprite
  idlePhase: number;             // For staggered idle bob
}

// CameraState — internal to GameRenderer
{
  panX:  number;   // World X offset of camera target
  panZ:  number;   // World Z offset of camera target
  zoom:  number;   // Frustum scale factor (1.0 = default)
}
```

**Terrain height constants** (replaces `TERRAIN_COLORS` for rendering):

```ts
const TERRAIN_HEIGHT: Record<TerrainType, number> = {
  water:     2,
  plains:    4,
  grassland: 5,
  forest:    8,
  mountain:  18,
};
```

### Interface Contracts

See [contracts/renderer-api.md](contracts/renderer-api.md).

`GameRenderer` public API is **unchanged** — the same method signatures as today:

```ts
class GameRenderer {
  async init(container: HTMLElement): Promise<void>
  render(state: GameState, humanPlayerId: PlayerId): void
  highlightReachable(coords: TileCoord[]): void
  highlightAttackable(coords: TileCoord[]): void
  showMainMenu(onMapSizeSelected: (size: MapSizeOption) => void): void
  hideMainMenu(): void
  showScoreboard(stats: Record<PlayerId, GameStats>, winner: PlayerId, onReturnToMenu: () => void): void
  animateMove(unitId: string, path: TileCoord[], onComplete: () => void): void
  animateAttack(unitId: string, targetTileCoord: TileCoord, onComplete: () => void): void
  animateDeath(unitId: string, onComplete: () => void): void
  showDamageNumber(tileCoord: TileCoord, damage: number, color?: number): void
  showThinkingIndicator(): void
  hideThinkingIndicator(): void
  getApp(): never  // REMOVED — PixiJS-specific, not needed externally
  getTileSize(): number
  getWorldOffset(): { x: number; y: number }   // returns camera pan in world units
  getZoom(): number
  isDragging(): boolean
  isAnimating(): boolean
  destroy(): void
}
```

**Breaking change**: `getApp()` is removed (PixiJS-specific). Search codebase before removal to verify no callers outside renderer.

### Coordinate Conversion Contract

Canonical functions, testable without a renderer instance:

```ts
// Grid tile coord → Three.js world position (tile center, base at y=0)
gridToWorld(coord: TileCoord, terrainHeight: number, tileSize: number): THREE.Vector3

// Pointer event → Normalized Device Coordinates
clientToNDC(clientX: number, clientY: number, canvas: HTMLCanvasElement): THREE.Vector2

// World position → grid coord (for raycaster inverse — used in tests)
worldToGrid(worldX: number, worldZ: number, tileSize: number): TileCoord
```

### Agent Context Update

Will be run after writing data-model.md and contracts/.

---

## Re-evaluation: Constitution Check Post-Design

All five principles still pass post-design. The rendering layer boundary is clean — `GameState` flows into `GameRenderer.render()` as a read-only input; no game logic is embedded in renderer code.

The constitution amendment (Technology Standards section) remains the one required pre-implementation action.
