# Quickstart: 3D WebGL Rendering Upgrade

**Feature**: 016-canvas-to-webgl
**Date**: 2026-03-28

---

## Pre-Implementation Checklist

Before writing any code:

1. **Amend the constitution** — update `Technology Standards` in `.specify/memory/constitution.md`:
   - Remove: `"The frontend MUST use a 2D canvas or equivalent primitive for pixel rendering."`
   - Add: `"The frontend uses Three.js WebGL for 3D isometric rendering."`
   - Bump version: `2.1.0 → 2.2.0`

2. **Swap dependencies**:
   ```sh
   npm remove pixi.js @pixi/tilemap
   npm install three
   npm install --save-dev @types/three
   ```

3. **Verify tests pass before starting**:
   ```sh
   npm test && npm run lint
   ```

---

## Development Order

Follow the user story priority order. Each story is independently testable.

### Story 1 (P1): Three.js Renderer Init

**Goal**: Replace `PixiJS.Application` init with `THREE.WebGLRenderer` + `Scene` + `OrthographicCamera`. Game should start (blank 3D scene, black canvas) without errors.

**Files**: `src/renderer/renderer.ts`, `src/main.ts`

**Test first**: Write a unit test that mocks `HTMLElement` and verifies `GameRenderer.init()` resolves without throwing. Verify `destroy()` cleans up without errors.

**Key code reference**:
```ts
// OrthographicCamera isometric setup
const d = 20;
const aspect = width / height;
camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 2000);
camera.position.set(d, d, d);
camera.lookAt(0, 0, 0);

// Renderer
const webgl = new THREE.WebGLRenderer({ antialias: true });
webgl.setSize(width, height);
container.appendChild(webgl.domElement);

// Game loop
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const deltaMS = clock.getDelta() * 1000;
  animationController.tick(deltaMS);
  webgl.render(scene, camera);
}
loop();
```

---

### Story 2 (P2): Tile and Terrain Meshes

**Goal**: All terrain tiles render as `BoxGeometry` with correct color and elevation. Mountain tiles appear taller than plains. Water appears lowest.

**Files**: `src/renderer/tilemap.ts`

**Test first**: Write unit tests for:
- `gridToWorld(coord, terrainHeight, TILE_SIZE)` returns correct `{x, y, z}`
- `worldToGrid(worldX, worldZ, TILE_SIZE)` round-trips correctly
- Each `TERRAIN_HEIGHT` value is positive and ordered: `water < plains < grassland < forest < mountain`

**Key code reference**:
```ts
const TERRAIN_HEIGHT: Record<TerrainType, number> = {
  water: 2, plains: 4, grassland: 5, forest: 8, mountain: 18,
};

function createTileMesh(tile: Tile, tileSize: number): THREE.Mesh {
  const h = TERRAIN_HEIGHT[tile.terrain];
  const geo = new THREE.BoxGeometry(tileSize, h, tileSize);
  const mat = new THREE.MeshLambertMaterial({ color: TERRAIN_COLOR[tile.terrain] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(tile.coord.col * tileSize, h / 2, tile.coord.row * tileSize);
  mesh.userData.coord = tile.coord;
  return mesh;
}
```

Add ambient + directional light to scene:
```ts
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(1, 2, 1);
scene.add(dir);
```

---

### Story 3 (P3): Unit Sprites

**Goal**: Units render as camera-facing sprites above their tiles. Team colors applied. HP bars visible. Move/attack/death animations work.

**Files**: `src/renderer/units.ts`

**Test first**: Write unit tests for:
- `AnimationController.tick(deltaMS)` advances elapsed time and interpolates position
- Unit positioned at `(col * TILE_SIZE, terrainHeight + SPRITE_OFFSET, row * TILE_SIZE)` matches formula

**Key code reference**:
```ts
const loader = new THREE.TextureLoader();
const texture = loader.load(`assets/sprites/units/${type}.png`);
const mat = new SpriteMaterial({ map: texture, color: PLAYER_TINT[owner] });
const sprite = new THREE.Sprite(mat);
sprite.scale.set(SPRITE_SIZE, SPRITE_SIZE, 1);
sprite.position.set(
  coord.col * TILE_SIZE,
  TERRAIN_HEIGHT[terrain] + SPRITE_SIZE / 2,
  coord.row * TILE_SIZE,
);
```

Replace `Ticker.deltaMS` references in `AnimationController` with parameter from `THREE.Clock.getDelta() * 1000`.

---

### Story 4 (P4): Fog of War + HUD Validation

**Goal**: Fog meshes render correctly. HUD elements (damage numbers, turn indicator, thinking overlay) display over the 3D scene.

**Files**: `src/renderer/fog.ts`, `src/renderer/renderer.ts` (damage number text)

**Test first**: Write unit tests for fog opacity mapping:
- `fogStateToOpacity('hidden')` → 1.0
- `fogStateToOpacity('explored')` → 0.45
- `fogStateToOpacity('visible')` → 0.0

**Key code reference**:
```ts
function createFogMesh(tile: Tile, tileSize: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(tileSize, tileSize);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  // Rotate to lie flat in XZ plane (PlaneGeometry faces Y by default)
  mesh.rotation.x = -Math.PI / 2;
  const h = TERRAIN_HEIGHT[tile.terrain];
  mesh.position.set(
    tile.coord.col * tileSize,
    h + 0.1, // slightly above tile top face
    tile.coord.row * tileSize,
  );
  return mesh;
}
```

Damage numbers: use a CSS overlay `div` (same pattern as current thinking indicator text) rather than `THREE.Sprite` to avoid perspective positioning complexity.

---

## Coordinate Helper Reference

```ts
// src/renderer/viewport.ts — export these alongside existing clampPan

export function gridToWorld(coord: TileCoord, terrainHeight: number, tileSize: number) {
  return {
    x: coord.col * tileSize,
    y: terrainHeight / 2,
    z: coord.row * tileSize,
  };
}

export function worldToGrid(worldX: number, worldZ: number, tileSize: number): TileCoord {
  return {
    col: Math.round(worldX / tileSize),
    row: Math.round(worldZ / tileSize),
  };
}

export function clientToNDC(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  return {
    x:  (clientX / canvas.clientWidth)  * 2 - 1,
    y: -(clientY / canvas.clientHeight) * 2 + 1,
  };
}
```

---

## Running Tests

```sh
npm test              # Run all Vitest tests
npm run lint          # TypeScript type-check (no emit)
npm run dev           # Start Vite dev server for visual verification
```

## Acceptance Gate

A Story N is only "done" when:
1. Its unit tests pass (red → green)
2. Visual inspection in `npm run dev` shows correct output
3. No TypeScript errors (`npm run lint` clean)
4. All previously passing tests still pass (no regression)
