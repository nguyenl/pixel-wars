# Research: 3D WebGL Rendering Upgrade

**Feature**: 016-canvas-to-webgl
**Date**: 2026-03-28

---

## Decision 1: 3D Library — Three.js vs Babylon.js

**Decision**: Three.js

**Rationale**:
- Three.js minified+gzipped bundle: ~168 KB vs Babylon.js ~1.4 MB (10× smaller). This matters for GitHub Pages static hosting and initial load budget.
- Three.js is a lightweight rendering engine; game features (state, pathfinding, AI) are already implemented in pure TypeScript and do not benefit from Babylon's built-in physics, VR/AR, or scene management overhead.
- TypeScript support is excellent via `@types/three` on npm (DefinitelyTyped, actively maintained).
- GitHub Pages compatible (static JS bundle, no server runtime).

**Alternatives considered**: Babylon.js — rejected due to 10× bundle size and full game-engine overhead that duplicates already-built systems.

**Packages**: `three` + `@types/three` replace `pixi.js` + `@pixi/tilemap`.

---

## Decision 2: Camera — OrthographicCamera vs PerspectiveCamera

**Decision**: `THREE.OrthographicCamera` at a fixed isometric angle.

**Rationale**:
- Orthographic projection eliminates perspective distortion — all tiles render at the same scale regardless of map position, which is essential for a tile strategy game where accurate grid alignment matters.
- Isometric angle is achieved by positioning the camera at equal components: e.g. `(d, d, d)` pointing at scene center, giving the classic 35.26° vertical / 45° horizontal isometric view.
- Zoom is implemented by adjusting the frustum (left/right/top/bottom), not by moving the camera.
- Pan is implemented by moving the camera's target point in the XZ plane.

**Setup reference**:
```ts
const d = 20; // half-frustum units, adjusts zoom
const aspect = width / height;
const camera = new THREE.OrthographicCamera(
  -d * aspect, d * aspect, d, -d, 1, 2000
);
camera.position.set(d, d, d); // isometric tripod
camera.lookAt(0, 0, 0);
```

**Alternatives considered**: PerspectiveCamera — rejected because perspective convergence makes distant tiles appear smaller, breaking the uniform grid visual.

---

## Decision 3: Grid Coordinate → 3D World Space Mapping

**Decision**: Direct offset grid mapping. `x = col * TILE_SIZE`, `z = row * TILE_SIZE`, `y = terrainHeight / 2`.

**Rationale**:
- The game uses a square offset grid (row, col). No hex coordinates needed.
- World X maps to column, world Z maps to row. World Y carries terrain elevation.
- `BoxGeometry` tiles are centered at their own origin, so Y must be `height/2` to place the base at `y=0`.
- Camera looks at map center: `(cols * TILE_SIZE / 2, 0, rows * TILE_SIZE / 2)`.

**Terrain height table** (in world units):
| Terrain | BoxGeometry height | Y position |
|---------|-------------------|------------|
| water   | 2                 | 1          |
| plains  | 4                 | 2          |
| grassland | 5               | 2.5        |
| forest  | 8                 | 4          |
| mountain| 18                | 9          |

**Inverse (world → grid)**: `col = round(x / TILE_SIZE)`, `row = round(z / TILE_SIZE)`.

---

## Decision 4: Tile Click Detection — Raycasting

**Decision**: `THREE.Raycaster.intersectObjects(tileMeshes)` with grid coordinates stored in `tile.userData`.

**Rationale**:
- Each tile mesh stores `userData.coord: TileCoord` at creation time.
- On pointer events, NDC coordinates are computed and a ray is cast through the scene.
- The closest intersection's object carries the tile coordinate — no math-based inversion needed.

**Pattern**:
```ts
raycaster.setFromCamera(ndcPointer, camera);
const hits = raycaster.intersectObjects(tileGroup.children);
if (hits.length > 0) {
  const coord = hits[0].object.userData.coord as TileCoord;
}
```

**Input coordinate normalization**:
```ts
ndcPointer.x =  (clientX / canvas.clientWidth)  * 2 - 1;
ndcPointer.y = -(clientY / canvas.clientHeight) * 2 + 1;
```

**Alternatives considered**: Mathematical intersection (ray vs horizontal plane → grid index) — rejected because raycasting against actual tile meshes is simpler and automatically handles terrain height differences.

---

## Decision 5: Fog of War Rendering

**Decision**: Per-tile fog mesh (separate thin `BoxGeometry` above each tile) with `MeshBasicMaterial` color and opacity driven by fog state.

**Rationale**:
- A single overlay plane creates parallax drift when the camera pans.
- Per-tile fog meshes sit at a fixed offset above each tile and move with the world, so fog is always aligned.
- `MeshBasicMaterial` is unaffected by scene lighting, ensuring fog color is stable regardless of time-of-day or light changes.

**Opacity mapping**:
```ts
// hidden  → opacity: 1.0, color: black
// explored → opacity: 0.45, color: black
// visible → opacity: 0.0 (transparent, not rendered)
```

**Alternatives considered**: Single overlay plane with alphaMap texture — rejected due to parallax issues in 3D.

---

## Decision 6: Unit Rendering — THREE.Sprite for Billboarding

**Decision**: `THREE.Sprite` with `SpriteMaterial` for unit sprites; team color applied via `SpriteMaterial.color` tint.

**Rationale**:
- `THREE.Sprite` automatically faces the camera — no rotation logic needed.
- Works with existing PNG sprite assets (`scout.png`, `infantry.png`, `artillery.png`) loaded via `THREE.TextureLoader`.
- `SpriteMaterial.color` applies a multiplicative tint (equivalent to PixiJS `Sprite.tint`), preserving the team-coloring pattern.
- Positioned at `(col * TILE_SIZE, tileHeight + spriteHalfHeight, row * TILE_SIZE)` so unit floats above terrain surface.

**HP bar**: Rendered as a separate `THREE.Sprite` or thin `THREE.Mesh` plane parented to the unit sprite.

**Alternatives considered**: Flat quad `PlaneGeometry` with manual camera-facing rotation — more complex without benefit; InstancedMesh — unnecessary at this unit count (<20 units total).

---

## Decision 7: Animation System — Custom Delta-Time Controller (preserve existing design)

**Decision**: Preserve the existing `AnimationController` class structure, replacing PixiJS `Ticker` with a `THREE.Clock`-based update loop driven by `requestAnimationFrame`.

**Rationale**:
- The existing `AnimationController` drives move interpolation, attack lunge/return, death fade, and idle bob using elapsed time. The design is sound.
- Replacing PixiJS `Ticker.deltaMS` with `THREE.Clock.getDelta() * 1000` (converting seconds to ms) is a minimal change.
- GSAP/Tween.js would be overkill for 4 animation types and would add an unnecessary dependency.

**Game loop pattern**:
```ts
const clock = new THREE.Clock();
function gameLoop() {
  requestAnimationFrame(gameLoop);
  const deltaMS = clock.getDelta() * 1000;
  animationController.tick(deltaMS);
  renderer.render(scene, camera);
}
```

**Alternatives considered**: GSAP — rejected (adds ~30 KB, unnecessary). THREE.AnimationMixer — rejected (designed for keyframe skeletal animations on GLTF models, not procedural position tweening).

---

## Decision 8: Viewport (Pan + Zoom)

**Decision**: Camera frustum scaling for zoom, camera target XZ offset for pan, clamp pan to map bounds.

**Rationale**:
- For `OrthographicCamera`, zoom = adjust `left/right/top/bottom` frustum proportionally.
- Pan = move `camera.position` and `camera.lookAt` target together in the XZ plane.
- Existing `clampPan` logic in `viewport.ts` translates directly (pan in world units instead of pixel offsets).
- Pinch-to-zoom gesture: same pointer event approach, frustum parameter adjusted instead of `worldContainer.scale`.

**Zoom formula**:
```ts
// zoomLevel starts at 1.0
const halfH = BASE_FRUSTUM_HALF / zoomLevel;
const halfW = halfH * aspect;
camera.left = -halfW; camera.right = halfW;
camera.top = halfH; camera.bottom = -halfH;
camera.updateProjectionMatrix();
```

---

## Decision 9: Constitution Amendment Required

**Finding**: Constitution Technology Standards states "The frontend MUST use a 2D canvas or equivalent primitive for pixel rendering." This feature replaces PixiJS 2D with Three.js 3D WebGL.

**Resolution**: The constitution itself notes this rule as a `TODO(TECH_STACK)` placeholder pending finalization. This feature IS the finalization of the rendering technology choice. The constitution's Technology Standards section must be amended before implementation begins to replace the 2D canvas constraint with the chosen 3D WebGL stack.

**Amendment**: Change "The frontend MUST use a 2D canvas or equivalent primitive" to "The frontend uses Three.js WebGL for 3D rendering." Bump constitution version: 2.1.0 → 2.2.0 (MINOR: new technology standard replaces placeholder).

---

## Unchanged Systems

- `src/game/` — zero changes (state, AI, combat, pathfinding, mapgen are pure TypeScript)
- `src/input/gesture.ts` — zero changes (pointer event math is input-device agnostic)
- `src/renderer/ui.ts` — zero changes (DOM-based HUD overlaid on canvas, independent of renderer)
- `tests/` — existing tests unaffected; new coordinate-math unit tests added
