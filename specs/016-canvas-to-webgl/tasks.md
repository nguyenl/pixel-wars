# Tasks: 3D WebGL Rendering Upgrade

**Input**: Design documents from `/specs/016-canvas-to-webgl/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Test tasks are included — the project constitution (Principle II) mandates Test-First Development (Red-Green-Refactor) for all non-trivial features.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Pre-implementation governance and dependency changes. Must complete before any code changes.

- [X] T001 Amend `.specify/memory/constitution.md` — replace "MUST use a 2D canvas" Technology Standards constraint with Three.js WebGL statement; bump constitution version 2.1.0 → 2.2.0 per amendment procedure
- [X] T002 Swap npm dependencies in `package.json`: `npm remove pixi.js @pixi/tilemap && npm install three && npm install --save-dev @types/three`; verify `package.json` reflects changes
- [X] T003 Verify existing test baseline: run `npm test` and confirm all tests in `tests/game/` pass; create `tests/renderer/` directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: Includes removing all PixiJS imports so TypeScript compiles cleanly. No user story work can begin until this phase is complete.

- [X] T004 Write failing unit tests for `gridToWorld`, `worldToGrid`, and `clientToNDC` coordinate conversion functions in `tests/renderer/viewport.test.ts` — tests MUST FAIL before T005
- [X] T005 Implement `gridToWorld(coord, terrainHeight, tileSize)`, `worldToGrid(worldX, worldZ, tileSize)`, and `clientToNDC(clientX, clientY, canvas)` as exported pure functions in `src/renderer/viewport.ts` (alongside existing `clampPan`); verify T004 tests turn green
- [X] T006 [P] Write failing unit tests for `TERRAIN_HEIGHT` ordering (water < plains < grassland < forest < mountain, all positive) in `tests/renderer/tilemap.test.ts` — tests MUST FAIL before T007
- [X] T007 [P] Add `TERRAIN_HEIGHT: Record<TerrainType, number>` (water:2, plains:4, grassland:5, forest:8, mountain:18) and `TERRAIN_MATERIAL_COLOR: Record<TerrainType, number>` constants to `src/renderer/tilemap.ts`; verify T006 tests turn green
- [X] T008 Remove all PixiJS imports from `src/renderer/tilemap.ts`, `src/renderer/units.ts`, and `src/renderer/fog.ts`; replace with empty stub implementations that preserve each class's public method signatures but have empty bodies (no rendering); verify `npm run lint` produces no PixiJS-related errors on these files
- [X] T009 Remove PixiJS `Application` and `Assets` imports from `src/renderer/renderer.ts` and `src/main.ts`; replace `app.getApp()` callers with stubs; verify `npm run lint` passes with zero type errors

**Checkpoint**: TypeScript compiles cleanly with Three.js. All `tests/game/` tests still pass. Coordinate conversion tests green.

---

## Phase 3: User Story 1 — Game Renders in 3D WebGL (Priority: P1) 🎯 MVP

**Goal**: The game initializes a Three.js WebGL scene with an isometric camera, renders a visible (if visually rough) 3D game world, and all gameplay input (tile click, unit selection, movement, attack) continues to work.

**Independent Test**: Launch `npm run dev`, open browser DevTools console — confirm no errors, verify canvas uses WebGL context (`canvas.getContext('webgl2')` non-null), confirm map tiles are visible from an isometric angle, click a tile and verify unit selection works.

### Tests for User Story 1

> **NOTE**: Write these tests FIRST — they MUST FAIL before T011 implementation begins

- [X] T010 [US1] Write failing test for `GameRenderer.init(container)` lifecycle in `tests/renderer/renderer.test.ts`: mock `HTMLElement`, verify `init()` resolves without throw; verify `destroy()` cleans up without throw; verify canvas element is appended during init and removed on destroy

### Implementation for User Story 1

- [X] T011 [US1] Implement `GameRenderer.init()` in `src/renderer/renderer.ts`: create `THREE.WebGLRenderer` (antialias, autoresize pixel ratio), `THREE.Scene` with background color `0x1a1a2e`, `THREE.OrthographicCamera` at isometric position `(d, d, d)` looking at map center, add `AmbientLight(0xffffff, 0.6)` + `DirectionalLight(0xffffff, 0.8)` at `(1, 2, 1)`, attach `ResizeObserver`, load unit PNG textures via `THREE.TextureLoader`; verify T010 test turns green
- [X] T012 [US1] Implement `requestAnimationFrame` game loop in `src/renderer/renderer.ts` using `THREE.Clock` for delta time; call `animationController.tick(deltaMS)` and `webglRenderer.render(scene, camera)` each frame; delegate to sub-renderers in `GameRenderer.render(state, humanPlayerId)`
- [X] T013 [US1] Implement isometric pan/zoom in `src/renderer/renderer.ts` + `src/renderer/viewport.ts`: frustum-based zoom (scale `left/right/top/bottom` by `1/zoom`, call `camera.updateProjectionMatrix()`), XZ camera pan (offset `camera.position` and `lookAt` target together), integrate existing `clampPan` for bounds; preserve all existing pointer + wheel event handling
- [X] T014 [US1] Implement `THREE.Raycaster` tile-click detection in `src/renderer/renderer.ts`: on pointer events compute NDC via `clientToNDC`, cast ray against `tileGroup.children`, read `hit.object.userData.coord` as `TileCoord`; wire to `main.ts` tile selection handler; verify movement and attack inputs work
- [X] T015 [US1] Implement basic `TilemapRenderer` in `src/renderer/tilemap.ts`: create one `BoxGeometry(TILE_SIZE, 2, TILE_SIZE)` mesh per tile (flat, no elevation yet), `MeshLambertMaterial` with `TERRAIN_MATERIAL_COLOR`, store in `Map<tileId, TileRenderEntry>`, add settlement marker boxes with owner color; store `userData.coord` on each tile mesh
- [X] T016 [US1] Implement basic `FogRenderer` in `src/renderer/fog.ts`: create one `PlaneGeometry(TILE_SIZE, TILE_SIZE)` fog mesh per tile (rotated flat, positioned above tile), `MeshBasicMaterial` with `transparent: true, depthWrite: false`; update opacity per frame: hidden→1.0, explored→0.45, visible→0.0
- [X] T017 [US1] Implement basic `UnitsRenderer` in `src/renderer/units.ts`: create `THREE.Sprite` + `SpriteMaterial` per unit using loaded texture (fallback to `MeshBasicMaterial` circle if texture unavailable); apply `PLAYER_TINT[owner]` as `SpriteMaterial.color`; position at `(col * TILE_SIZE, 2 + SPRITE_SIZE/2, row * TILE_SIZE)` (flat terrain height placeholder)
- [X] T018 [US1] Add WebGL availability check at the start of `GameRenderer.init()` in `src/renderer/renderer.ts`: test `canvas.getContext('webgl2') || canvas.getContext('webgl')`; if null, create a styled error `div` with message "This game requires WebGL. Please use a modern browser." and append to container without starting the game loop

**Checkpoint**: Game is fully playable in 3D WebGL isometric view. Tiles are flat colored boxes, units are sprites. All gameplay (movement, combat, AI turns, HUD) works.

---

## Phase 4: User Story 2 — Updated Tile and Terrain Graphics (Priority: P2)

**Goal**: Each terrain type renders with distinct 3D elevation and visual depth cues. Mountains appear tallest; water appears recessed; all terrain types are distinguishable.

**Independent Test**: Generate a map (`npm run dev`), visually confirm: mountain tiles clearly tower above adjacent plains, water tiles sit noticeably lower, each terrain type has a distinct color and silhouette.

### Tests for User Story 2

> **NOTE**: Write these tests FIRST — they MUST FAIL before T020 implementation begins

- [X] T019 [P] [US2] Write failing tests for tile mesh elevation in `tests/renderer/tilemap.test.ts`: verify `createTileMesh('mountain', ...)` produces a BoxGeometry with height > `createTileMesh('plains', ...).height`; verify water mesh is lowest; verify mesh Y position equals `terrainHeight / 2`

### Implementation for User Story 2

- [X] T020 [US2] Update `TilemapRenderer.createTileMesh()` in `src/renderer/tilemap.ts` to use `BoxGeometry(TILE_SIZE, TERRAIN_HEIGHT[terrain], TILE_SIZE)` with mesh `position.y = TERRAIN_HEIGHT[terrain] / 2`; verify T019 tests turn green
- [X] T021 [US2] Update `TilemapRenderer` settlement graphics in `src/renderer/tilemap.ts`: rebuild `drawCityGraphic` and `drawTownGraphic` as stacked `BoxGeometry` meshes (tower blocks for city, two small boxes with peaked roofs for town) positioned at tile surface height; owner color applied via `MeshLambertMaterial`
- [X] T022 [US2] Update `TilemapRenderer` highlight overlays in `src/renderer/tilemap.ts`: replace `Graphics` rectangles with thin `BoxGeometry(TILE_SIZE, 0.3, TILE_SIZE)` overlay meshes positioned at `terrainHeight + 0.15` (just above tile top face); reachable=blue tint, attackable=red tint, hover=brighter tint; `depthWrite: false`

**Checkpoint**: All terrain types render with distinct 3D elevation. Mountain tiles dominate vertically. Settlement structures appear as 3D buildings above tiles.

---

## Phase 5: User Story 3 — Updated Unit and Base Graphics (Priority: P3)

**Goal**: Units display as billboard sprites that face the camera, appear elevated above their tile, show correct team colors, have visible HP bars, and animate smoothly (move, attack lunge, death fade, idle bob).

**Independent Test**: Spawn units for both players (`npm run dev`), verify each unit floats above its terrain, has correct team color visible at all zoom levels, HP bar updates on combat, move/attack/death animations play correctly.

### Tests for User Story 3

> **NOTE**: Write these tests FIRST — they MUST FAIL before T025 implementation begins

- [X] T024 [P] [US3] Write failing tests for `AnimationController.tick(deltaMS)` in `tests/renderer/units.test.ts`: create a mock `THREE.Object3D`, register a move animation from `(0,0,0)` to `(10,0,0)` with 100ms duration; tick by 50ms; verify position is approximately `(5,0,0)`; tick by 50ms; verify position is `(10,0,0)` and `onComplete` was called

### Implementation for User Story 3

- [X] T025 [US3] Update `UnitsRenderer.createUnitSprite()` in `src/renderer/units.ts`: use `THREE.TextureLoader` to load `assets/sprites/units/${type}.png`; create `THREE.Sprite` with `SpriteMaterial({ map: texture, color: PLAYER_TINT[owner] })`; set `sprite.scale.set(SPRITE_SIZE, SPRITE_SIZE, 1)`; position above tile using terrain height lookup from `TileRenderEntry`
- [X] T026 [US3] Update `AnimationController` in `src/renderer/units.ts`: replace PixiJS `Container` references with `THREE.Object3D`; replace `container.x/y` position updates with `object3D.position.x/y/z`; replace `container.alpha` with `(object3D as THREE.Sprite).material.opacity`; replace `ticker.deltaMS` parameter with `deltaMS` passed from `THREE.Clock`; verify T024 tests turn green
- [X] T027 [US3] Implement HP bar in `src/renderer/units.ts`: create a thin `PlaneGeometry(SPRITE_SIZE, 3)` `THREE.Mesh` with `MeshBasicMaterial`; parent to a `THREE.Group` containing the unit sprite; position bar at `(0, SPRITE_SIZE/2 + 3, 0)` relative to group; update `material.color` and geometry scale X based on HP fraction in `updateHpBar()`

**Checkpoint**: Units display as billboard sprites with team color tints, HP bars, and all four animation types working correctly.

---

## Phase 6: User Story 4 — UI Overlays and HUD Remain Functional (Priority: P4)

**Goal**: Fog of war renders with correct opacity per visibility state, damage numbers float above the correct 3D world position, and all HUD elements (turn counter, scores, action menus, win/loss overlay) display correctly over the 3D scene.

**Independent Test**: Play a full game turn (`npm run dev`): move a unit → observe movement highlight; attack → observe damage number floating above target; end turn → AI moves; observe fog update; reach win/loss condition → confirm scoreboard overlay readable.

### Tests for User Story 4

> **NOTE**: Write these tests FIRST — they MUST FAIL before T030 implementation begins

- [X] T029 [US4] Write failing tests for fog state → opacity mapping in `tests/renderer/fog.test.ts`: verify `fogStateToOpacity('hidden')` returns 1.0, `fogStateToOpacity('explored')` returns 0.45, `fogStateToOpacity('visible')` returns 0.0; export `fogStateToOpacity` as a pure function from `src/renderer/fog.ts`

### Implementation for User Story 4

- [X] T030 [US4] Export `fogStateToOpacity(state: FogState): number` as a pure function from `src/renderer/fog.ts`; update `FogRenderer.render()` to use it for setting `mesh.material.opacity`; position fog mesh at `TERRAIN_HEIGHT[terrain] + 0.1` above tile surface (accounts for elevation); verify T029 tests turn green
- [X] T031 [US4] Update `showDamageNumber()` in `src/renderer/renderer.ts`: project 3D world position `(col * TILE_SIZE, terrainHeight + SPRITE_SIZE, row * TILE_SIZE)` to screen coordinates using `THREE.Vector3.project(camera)`; create a positioned `div` overlay at screen coordinates; animate float-up + fade over 800 ms; remove div on complete
- [X] T032 [US4] Manual verification in `src/renderer/ui.ts`: confirm `UIRenderer` DOM overlay methods (`showMainMenu`, `showScoreboard`, `renderHUD`) all still function correctly — no changes expected, but confirm the Three.js canvas `domElement` is appended correctly and HUD z-index sits above it

**Checkpoint**: Full HUD functional. Damage numbers appear at correct 3D positions. Fog of war correctly obscures hidden/explored tiles.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and validation.

- [X] T033 [P] Update `CLAUDE.md` active technologies list: remove `pixi.js` and `@pixi/tilemap` entries; add `three` + `@types/three` under relevant feature sections
- [X] T034 Run `npm test && npm run lint`; fix any remaining TypeScript errors or failing tests
- [X] T035 Manual QA pass per `specs/016-canvas-to-webgl/quickstart.md` acceptance gates: play through a full game on desktop and mobile simulation; verify ≥ 30 FPS via DevTools Performance panel; confirm no browser console errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Story Phases (3–6)**: All depend on Foundational completion; can proceed in priority order P1 → P2 → P3 → P4
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependency on other stories; delivers playable game
- **US2 (P2)**: Can start after US1 (terrain elevation requires tile meshes from T015 to exist)
- **US3 (P3)**: Can start after US1 (unit sprites require unit containers from T017 to exist)
- **US4 (P4)**: Can start after US1 (fog requires fog meshes from T016 to exist); US2 and US3 must complete first for accurate terrain heights in fog positioning

### Within Each User Story

- Test tasks (T010, T019, T024, T029) MUST be written and FAIL before the corresponding implementation begins
- Foundational tasks must be complete before any story task (no PixiJS compilation errors)
- T011 (renderer skeleton) must complete before T012–T018 within US1
- Coordinate conversion tests (T004) must pass before T005 is merged

### Parallel Opportunities

- T004/T005 (viewport math) and T006/T007 (terrain constants) can run in parallel — different files, no shared deps
- T008 and T009 can run in parallel once T005 and T007 are done (different files)
- Within Phase 3: T015, T016, T017 can run in parallel once T012–T014 are done (different renderer files)
- T019 (test) can be written in parallel with any Phase 3 completion work
- T024 (test) can be written in parallel with Phase 4 work
- T033 (docs) can run in parallel with T034 and T035

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Start these two pairs in parallel — they operate on different files:
Task T004: "Write failing tests for gridToWorld/worldToGrid/clientToNDC in tests/renderer/viewport.test.ts"
Task T006: "Write failing tests for TERRAIN_HEIGHT ordering in tests/renderer/tilemap.test.ts"

# Once T004 is done, start:
Task T005: "Implement coordinate conversion functions in src/renderer/viewport.ts"

# Once T006 is done, start:
Task T007: "Add TERRAIN_HEIGHT + TERRAIN_MATERIAL_COLOR constants to src/renderer/tilemap.ts"

# Once T005 + T007 are done, start in parallel:
Task T008: "Remove PixiJS from tilemap/units/fog with stubs"
Task T009: "Remove PixiJS from renderer/main with stubs"
```

## Parallel Example: Phase 3 (User Story 1)

```bash
# Once T011 + T012 are done, start all three sub-renderers in parallel:
Task T015: "Implement basic TilemapRenderer (flat box tiles) in src/renderer/tilemap.ts"
Task T016: "Implement basic FogRenderer in src/renderer/fog.ts"
Task T017: "Implement basic UnitsRenderer in src/renderer/units.ts"

# T013 and T014 (pan/zoom + raycaster) can run alongside T015-T017 — different parts of renderer.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (governance + deps)
2. Complete Phase 2: Foundational (compiles cleanly, coordinate math tested)
3. Complete Phase 3: User Story 1 (playable 3D game)
4. **STOP and VALIDATE**: Confirm game is fully playable in 3D WebGL, all game mechanics work
5. Deploy/demo the MVP

### Incremental Delivery

1. Setup + Foundational → TypeScript compiles with Three.js
2. User Story 1 → Playable 3D game (flat terrain, basic sprites) — **MVP**
3. User Story 2 → Terrain elevation and visual quality improved
4. User Story 3 → Unit sprites, animations, HP bars polished
5. User Story 4 → Fog correctness, damage numbers, HUD verified
6. Each story adds visual quality without breaking game mechanics

---

## Notes

- [P] tasks = different files, no unmet dependencies — safe to run in parallel
- [Story] label maps each task to a user story for traceability
- Constitution amendment (T001) is a hard gate — do not write any code before it is done
- Dependency swap (T002) must happen before any `import * as THREE` statements are added
- After T008/T009: `npm run lint` must pass with zero errors before Phase 3 begins
- Each story checkpoint requires visual verification in `npm run dev` (not just test pass)
- Commit after each logical group; use `feat:`, `fix:`, `test:` conventional commit prefixes
