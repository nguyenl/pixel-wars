# Data Model: 3D WebGL Rendering Upgrade

**Feature**: 016-canvas-to-webgl
**Date**: 2026-03-28

---

## Overview

The **game state data model is unchanged**. `GameState`, `Tile`, `Unit`, `Settlement`, and all types in `src/game/types.ts` require zero modifications.

This document describes **renderer-internal data structures** that map game state entities to Three.js scene objects. These structures live entirely inside `src/renderer/` and are not exported to game logic.

---

## Renderer Internal Entities

### TileRenderEntry

Maps one `Tile` (from `GameState`) to its Three.js scene representation.

| Field | Type | Description |
|-------|------|-------------|
| `tileMesh` | `THREE.Mesh` | BoxGeometry tile mesh. Geometry: `BoxGeometry(TILE_SIZE, terrainHeight, TILE_SIZE)`. Material: `MeshLambertMaterial` with terrain color. |
| `fogMesh` | `THREE.Mesh` | Thin plane above tile for fog of war. Geometry: `PlaneGeometry(TILE_SIZE, TILE_SIZE)`. Material: `MeshBasicMaterial`, `transparent: true`. Rotated flat (XZ plane). |
| `terrainHeight` | `number` | Cached terrain height in world units (from `TERRAIN_HEIGHT[tile.terrain]`). Used when positioning units above this tile. |

**Key**: tile ID (`"${row},${col}"`) — same key as `GameState.tiles`.

**Owned by**: `TilemapRenderer`.

---

### UnitRenderEntry

Maps one `Unit` (from `GameState`) to its Three.js scene representation.

| Field | Type | Description |
|-------|------|-------------|
| `sprite` | `THREE.Sprite` | Billboard sprite facing camera. Material: `SpriteMaterial` with unit texture and team color tint. |
| `hpBar` | `THREE.Mesh` | Thin `PlaneGeometry` positioned above sprite. `MeshBasicMaterial` with HP-fraction-based color. |
| `idlePhase` | `number` | Staggered starting phase (radians) for idle bob animation, so units don't all bob in lockstep. |

**Key**: unit ID — same key as `GameState.units`.

**Owned by**: `UnitsRenderer`.

---

### AnimationState (internal to AnimationController)

Unchanged from current implementation except:
- `container` field type changes from `PIXI.Container` → `THREE.Object3D`
- `elapsed` / `duration` / position fields unchanged

---

### CameraState (internal to GameRenderer)

| Field | Type | Description |
|-------|------|-------------|
| `panX` | `number` | World X coordinate of the camera's look-at target. |
| `panZ` | `number` | World Z coordinate of the camera's look-at target. |
| `zoom` | `number` | Zoom level. `1.0` = default frustum. Values > 1 zoom in (smaller frustum), < 1 zoom out (larger frustum). |

Pan bounds are clamped to keep the map in view (same `clampPan` logic as today, adapted for world units).

---

## Terrain Height Constants

Replaces the `TERRAIN_COLORS` lookup in `tilemap.ts`. Heights are in Three.js world units.

| Terrain | Height | Visual meaning |
|---------|--------|----------------|
| `water` | 2 | Lowest — visually recessed |
| `plains` | 4 | Flat ground level |
| `grassland` | 5 | Slightly raised ground |
| `forest` | 8 | Noticeably raised canopy |
| `mountain` | 18 | Dominant vertical feature |

**Tile material colors** (retained from existing `TERRAIN_COLORS`):
```ts
const TERRAIN_MATERIAL_COLOR: Record<TerrainType, number> = {
  water:     0x2060c0,
  plains:    0x90c060,
  grassland: 0x60a040,
  forest:    0x206020,
  mountain:  0x808080,
};
```

---

## Coordinate System

```
Three.js axes:
  X → east  (column increases)
  Y → up    (terrain elevation)
  Z → south (row increases)

Camera at: (panX + d, d, panZ + d) looking at (panX, 0, panZ)
  where d = frustum half-size / √3 (isometric tripod distance)
```

**Grid → World conversion**:
```ts
worldX = coord.col * TILE_SIZE
worldY = TERRAIN_HEIGHT[terrain] / 2   // BoxGeometry centered at half-height
worldZ = coord.row * TILE_SIZE
```

**World → Grid inverse** (for raycaster validation in tests):
```ts
col = Math.round(worldX / TILE_SIZE)
row = Math.round(worldZ / TILE_SIZE)
```

---

## Fog State → Material Opacity Mapping

| FogState | Fog mesh opacity | Fog mesh color |
|----------|-----------------|----------------|
| `hidden` | 1.0 | 0x000000 (black) |
| `explored` | 0.45 | 0x000000 (black) |
| `visible` | 0.0 | — (not rendered) |

The fog mesh is always present in the scene; visibility is controlled by opacity and `depthWrite: false` on the material to avoid Z-fighting with tile surfaces.

---

## Settlement Rendering

Settlements are drawn procedurally on top of tile meshes (same approach as current). The graphics are `THREE.Line` or `THREE.Mesh` shapes attached to the `TilemapRenderer`'s settlement group. Owner color maps directly: same hex values as current `OWNER_COLORS`.

No new entity type needed — settlements are re-drawn each render frame (or when state changes) as child meshes of the scene root.

---

## State Transitions

None — this feature adds no new game state. The renderer creates/destroys Three.js objects as units appear/disappear from `GameState.units`, matching the existing pattern in `UnitsRenderer.render()`.
