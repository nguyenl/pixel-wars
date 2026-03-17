# Tasks: Game Improvements

**Input**: Design documents from `/specs/002-game-improvements/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Included for all game-logic changes per constitution (Test-First Development, §II). Renderer changes validated via visual QA.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US5)

---

## Phase 1: Setup (Sprite Assets)

**Purpose**: Create the static pixel-art PNG files required by Phase 6 (P4 Sprites). These can be created immediately and independently.

- [x] T001 [P] Create scout pixel art sprite (24×24 px, white/light base colors, transparent background, PixiJS-tint-compatible) at `public/assets/sprites/units/scout.png`
- [x] T002 [P] Create infantry pixel art sprite (24×24 px, white/light base colors, transparent background, PixiJS-tint-compatible) at `public/assets/sprites/units/infantry.png`
- [x] T003 [P] Create artillery pixel art sprite (24×24 px, white/light base colors, transparent background, PixiJS-tint-compatible) at `public/assets/sprites/units/artillery.png`

**Checkpoint**: Three PNG files exist at `public/assets/sprites/units/`. Phase 6 (P4) can now proceed.

---

## Phase 2: Foundational (Renderer Container Refactor)

**Purpose**: Introduce a PixiJS `worldContainer` in `GameRenderer` that wraps all game-world layers (tilemap, units, fog). This is the prerequisite for both Phase 6 (P4 — Pixel Art Sprites) and Phase 7 (P5 — Viewport Centering). Phases 3–5 (pure game-logic changes) do NOT depend on this phase and can proceed in parallel with it.

**⚠️ CRITICAL**: Phase 6 and Phase 7 CANNOT begin until this phase is complete.

- [x] T004 [P] Refactor `TilemapRenderer` constructor to accept `Container` (not `Application`) as its first argument; update all internal `app.stage` references to use the passed container in `src/renderer/tilemap.ts`
- [x] T005 [P] Refactor `UnitsRenderer` constructor to accept `Container` (not `Application`) as its first argument; update all internal `app.stage` references to use the passed container in `src/renderer/units.ts`
- [x] T006 [P] Refactor `FogRenderer` constructor to accept `Container` (not `Application`) as its first argument; update all internal `app.stage` references to use the passed container in `src/renderer/fog.ts`
- [x] T007 Add `private worldContainer: Container` field to `GameRenderer`; in `init()`, create the container, add it to `app.stage`, and pass it to `TilemapRenderer`, `UnitsRenderer`, and `FogRenderer` constructors in `src/renderer/renderer.ts` (depends on T004–T006)

**Checkpoint**: `npm run lint` passes with no type errors. The game renders identically to before — no visual change, just the container hierarchy added.

---

## Phase 3: User Story 1 — Map: Connected & Opposed Starting Positions (Priority: P1) 🎯 MVP

**Goal**: Map generation guarantees all settlements are reachable by land (no isolated towns) and player starting cities are on opposite halves of the map.

**Independent Test**: Generate 10 maps of each size via `npm test` (mapgen test suite); assert all settlement tiles in flood-fill set and starting cities in different map halves.

### Tests for User Story 1

> **Write FIRST — must FAIL before implementation begins (Red phase)**

- [x] T008 [P] [US1] Add test case `'all settlements are land-connected'` to `tests/game/mapgen.test.ts`: generate a map, flood-fill from city1 tile, assert every settlement's tileId is in the reachable set — this test MUST fail until T010 is implemented
- [x] T009 [P] [US1] Add test case `'starting cities are on opposite halves'` to `tests/game/mapgen.test.ts`: for each generated map, assert `Math.abs(c1.col - c2.col) >= cols/2 || Math.abs(c1.row - c2.row) >= rows/2` — this test MUST fail until T011 is implemented

### Implementation for User Story 1

- [x] T010 [US1] Add all-settlement connectivity check inside the `generateMap()` retry loop in `src/game/mapgen.ts`: after the existing `reachable.has(city2TileId)` guard, add `const allSettlementTileIds = Object.values(settlementsCopy).map(s => s.tileId); if (!allSettlementTileIds.every(tid => reachable.has(tid))) continue;` (depends on T008)
- [x] T011 [US1] Add opposite-sides guard inside the `generateMap()` retry loop in `src/game/mapgen.ts`: after the connectivity check, extract city1/city2 coords, compute `sameColHalf` and `sameRowHalf`, add `if (sameColHalf && sameRowHalf) continue;` (depends on T009)

**Checkpoint**: `npm test` — all mapgen test cases pass. User Story 1 is independently verified. Map generation guarantees match spec FR-001, FR-002, FR-003.

---

## Phase 4: User Story 2 — Starting Scout per Player (Priority: P2)

**Goal**: Every new game begins with one Scout unit at each player's starting city, available for orders on turn 1 with no production wait.

**Independent Test**: Call `newGame('small')` in `tests/game/state.test.ts` and assert exactly 2 units exist, both scouts, one per player on their respective city tiles, with full funds unchanged.

### Tests for User Story 2

> **Write FIRST — must FAIL before implementation begins (Red phase)**

- [x] T012 [US2] Create `tests/game/state.test.ts` (new file) with test cases: `'newGame creates exactly 2 starting scouts'`, `'starting scouts are on player starting city tiles'`, `'starting scouts have full HP and MP'`, `'starting funds are not deducted for starting scouts'` — all MUST fail until T013 is implemented

### Implementation for User Story 2

- [x] T013 [US2] In `newGame()` in `src/game/state.ts`, after `generateMap()` and before constructing `GameState`: build `startingUnits: Record<string, Unit>` and `tilesWithScouts` map by iterating over `['player1', 'player2']`, creating a Scout unit for each at their starting city tile, and setting the tile's `unitId`; pass `tiles: tilesWithScouts` and `units: startingUnits` into the initial `GameState` (depends on T012)

**Checkpoint**: `npm test` — all state test cases pass. `newGame()` postconditions match spec FR-004. Both scouts appear on the map at game start.

---

## Phase 5: User Story 3 — Settlement Vision (Priority: P3)

**Goal**: Owned cities reveal 3 tiles around them; owned towns reveal 2 tiles. Neutral or enemy settlements grant no vision. Vision updates every turn with `recomputeFog`.

**Independent Test**: In `tests/game/fog.test.ts`, construct a state with a player-owned city and no units; call `recomputeFog`; assert tiles within Chebyshev-3 of the city are `'visible'` and tiles beyond are not. Verify same for town (radius 2), and that neutral/enemy settlements contribute nothing.

### Tests for User Story 3

> **Write FIRST — must FAIL before implementation begins (Red phase)**

- [x] T014 [P] [US3] Add test case `'owned city grants 3-tile Chebyshev vision with no units'` to `tests/game/fog.test.ts`: place a city owned by player1 with no units, call `recomputeFog(state, 'player1')`, assert all tiles within Chebyshev distance ≤ 3 from the city are `'visible'` — MUST fail until T016 is implemented
- [x] T015 [P] [US3] Add test cases `'owned town grants 2-tile vision'`, `'neutral city grants no vision'`, `'enemy city grants no vision to opponent'`, `'captured city transfers vision'` to `tests/game/fog.test.ts` — MUST fail until T016 is implemented

### Implementation for User Story 3

- [x] T016 [US3] Add `SETTLEMENT_VISION: Record<SettlementType, number> = { city: 3, town: 2 }` constant export to `src/game/constants.ts`, placed after `SETTLEMENT_INCOME` (depends on T014–T015)
- [x] T017 [US3] Extend `recomputeFog()` in `src/game/fog.ts`: import `SETTLEMENT_VISION` from `./constants`, then after the existing unit-vision loop, add a settlement loop that iterates `state.settlements`, skips non-`playerId` owners, and marks all tiles within `SETTLEMENT_VISION[settlement.type]` Chebyshev distance as `'visible'` (depends on T016)

**Checkpoint**: `npm test` — all fog test cases pass. Settlement vision matches spec FR-005, FR-006, FR-007, FR-008.

---

## Phase 6: User Story 4 — Pixel Art Unit Sprites (Priority: P4)

**Goal**: Units are rendered as 24×24 px pixel art sprites tinted by player color, replacing the current colored circles.

**Independent Test**: `npm run dev` → start a game → all three unit types show pixel art sprites; Player 1 units are blue-tinted, Player 2 units are red-tinted; sprites are absent on fog-hidden tiles.

**Prerequisites**: Phase 1 (sprite files) ✓ and Phase 2 (worldContainer) ✓ must be complete.

### Implementation for User Story 4

- [x] T018 [US4] In `GameRenderer.init()` in `src/renderer/renderer.ts`, call `await Assets.load([{ alias: 'scout', src: 'assets/sprites/units/scout.png' }, { alias: 'infantry', src: 'assets/sprites/units/infantry.png' }, { alias: 'artillery', src: 'assets/sprites/units/artillery.png' }])` before creating sub-renderers; import `Assets` from `'pixi.js'` (depends on T001–T003, T007)
- [x] T019 [US4] Replace Graphics circle rendering with Sprite rendering in `UnitsRenderer` in `src/renderer/units.ts`: for each visible unit, create `const sprite = new Sprite(Assets.get(unit.type))`, set `sprite.width = sprite.height = 24`, set `sprite.anchor.set(0.5)`, set `sprite.x = col * this.tileSize + this.tileSize / 2`, set `sprite.y = row * this.tileSize + this.tileSize / 2`, set `sprite.tint = unit.owner === 'player1' ? 0x2244ff : 0xdd2222`, add to container; retain HP bar Graphics unchanged (depends on T018)

**Checkpoint**: Visual QA in browser — each unit type shows a distinct pixel art sprite; player colors are clearly differentiated; HP bars remain visible; fog still hides enemy units correctly.

---

## Phase 7: User Story 5 — Viewport Centering (Priority: P5)

**Goal**: The game map is centered horizontally and vertically within the browser window at all times, including on resize.

**Independent Test**: Open `npm run dev` in windows of varying sizes (narrow, wide, tall); the map always has equal whitespace on all sides when smaller than the viewport; no map shift or misalignment when resizing.

**Prerequisite**: Phase 2 (worldContainer) ✓ must be complete.

### Implementation for User Story 5

- [x] T020 [US5] Add `private centerWorldContainer(mapSize: { rows: number; cols: number }): void` method and `getWorldOffset(): { x: number; y: number }` method to `GameRenderer` in `src/renderer/renderer.ts`; implement centering formula `x = Math.max(0, Math.floor((canvasW - cols * TILE_SIZE) / 2))` and same for y; call `centerWorldContainer()` at the start of `render()` and at the end of `onResize()` (depends on T007)
- [x] T021 [US5] Subtract world offset from click coordinates in `src/input/input.ts`: retrieve offset via `this.renderer.getWorldOffset()`, compute `worldX = event.offsetX - offset.x` and `worldY = event.offsetY - offset.y`, use `worldX`/`worldY` (instead of raw `event.offsetX`/`event.offsetY`) when computing `col` and `row`; add guard `if (worldX < 0 || worldY < 0 || worldX >= cols * tileSize || worldY >= rows * tileSize) return` to reject out-of-map clicks (depends on T020)

**Checkpoint**: Visual QA — map centered on screen in all tested window sizes; clicking tiles at the edges of the map still works correctly; resizing the window re-centers without breaking input.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation pass across all stories.

- [x] T022 [P] Run `npm test` and confirm all test suites pass with zero failures (mapgen, fog, state, and all pre-existing tests)
- [x] T023 [P] Run `npm run lint` (`tsc --noEmit`) and confirm zero TypeScript type errors across all changed files
- [x] T024 Full visual QA walkthrough per `specs/002-game-improvements/quickstart.md`: verify centering, pixel art sprites, starting scouts, settlement vision reveal, and map layout on Small, Medium, and Large maps

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup: Sprites)          ──────────────────────────────────────► Phase 6 (P4)
Phase 2 (Foundational: Container)  ──────────────────────────────────────► Phase 6 (P4)
                                                                          ► Phase 7 (P5)
Phase 3 (P1: Mapgen)               Independent — no renderer dependencies
Phase 4 (P2: Scouts)               Independent — no renderer dependencies
Phase 5 (P3: Settlement Vision)    Independent — no renderer dependencies
Phase 6 (P4: Sprites)              ► Phase 8 (Polish)
Phase 7 (P5: Centering)            ► Phase 8 (Polish)
Phase 8 (Polish)                   Depends on all previous phases
```

### User Story Dependencies

- **US1 (P1) Mapgen**: No dependencies on other user stories. Can start immediately.
- **US2 (P2) Scouts**: No dependencies on other user stories. Can start immediately.
- **US3 (P3) Settlement Vision**: No dependencies on other user stories. Can start immediately.
- **US4 (P4) Sprites**: Depends on Phase 1 (assets) and Phase 2 (container refactor). Independent of US1–US3.
- **US5 (P5) Centering**: Depends on Phase 2 (container refactor). Independent of US1–US4.

### Within Each User Story

- Tests MUST be written first and MUST fail before implementation begins (Red phase)
- Implementation makes tests pass (Green phase)
- `npm run lint` validates no type regressions

### Parallel Opportunities

- **Phase 1 tasks**: T001, T002, T003 — all parallel (three separate PNG files)
- **Phase 2 tasks**: T004, T005, T006 — parallel (three separate files); T007 waits for all three
- **Phase 3 tests**: T008, T009 — parallel (same test file, different test cases)
- **Phase 5 tests**: T014, T015 — parallel (same test file, different test cases)
- **Phases 3, 4, 5** — all three are independent of each other and independent of Phase 2; a solo developer can work through them sequentially or batch them; a team could parallelize them across developers
- **Phase 8**: T022, T023 — parallel (different commands)

---

## Parallel Example: US1 + US2 + US3 (game-logic trio)

These three user stories touch completely separate files and can be implemented in any order or simultaneously:

```
US1 (mapgen.ts)     → T008, T009 tests → T010, T011 impl
US2 (state.ts)      → T012 tests       → T013 impl
US3 (constants + fog.ts) → T014, T015 tests → T016, T017 impl
```

All three can complete before any renderer work begins.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Sprite assets (can be deferred if focusing on game logic first)
2. Complete Phase 2: Container refactor (can be deferred if focusing on game logic first)
3. Complete Phase 3: US1 Map generation fixes (pure logic, independently valuable)
4. **STOP and VALIDATE**: Run `npm test`, confirm mapgen tests pass
5. Demonstrate: generated maps consistently have connected settlements and opposed starting cities

### Incremental Delivery

1. Phase 3 → US1 verified: better map generation
2. Phase 4 → US2 verified: scouts on map at game start
3. Phase 5 → US3 verified: city/town fog reveals on turn 1
4. Phase 1 + 2 + 6 → US4 verified: pixel art sprites visible
5. Phase 7 → US5 verified: game centered on screen
6. Phase 8 → Full integration QA

### Recommended Execution Order (Solo Developer)

For a solo developer, this order minimizes context switching and builds momentum:

```
T008→T009→T010→T011  (US1 mapgen — pure logic, fully testable)
T012→T013            (US2 scouts — pure logic, fully testable)
T014→T015→T016→T017  (US3 fog — pure logic, fully testable)
npm test             (all logic passing before touching renderer)
T001→T002→T003       (create sprite assets)
T004→T005→T006→T007  (container refactor — compile check)
T018→T019            (sprite rendering)
T020→T021            (centering + input fix)
T022→T023→T024       (final polish)
```

---

## Notes

- [P] tasks = different files, no shared state — safe to parallelize
- [Story] label provides traceability from task back to spec acceptance criteria
- TDD is mandatory per constitution §II: test tasks (T008–T009, T012, T014–T015) MUST be written and confirmed failing before corresponding implementation tasks
- All test files use Vitest 2.x (`npm test`)
- Renderer rendering is validated via visual QA (`npm run dev`) — no automated renderer tests
- Sprite assets are manually created pixel art — no code generation
- Each user story phase is a complete, independently deployable increment
