##### # Tasks: Tile-Based Strategy Game

**Input**: Design documents from `/specs/001-tile-strategy-game/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Included — Constitution Principle II mandates Test-First Development (Red-Green-Refactor) for all non-trivial features. Write each test task before its implementation task; verify it FAILS before implementing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US8)
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure, and tooling configuration

- [X] T001 Initialize Vite project with vanilla-ts template at repo root: `npm create vite@latest . -- --template vanilla-ts`
- [X] T002 Install runtime dependencies: `npm install pixi.js @pixi/tilemap simplex-noise`
- [X] T003 Install dev dependencies: `npm install -D vitest @vitest/ui`
- [X] T004 [P] Configure `vite.config.ts`: set `base: '/pixel-wars/'`; add Vitest config (`environment: 'node'`, `include: ['tests/**/*.test.ts']`)
- [X] T005 [P] Configure `tsconfig.json`: `strict: true`, `module: ESNext`, `target: ES2022`, `moduleResolution: bundler`
- [X] T006 [P] Create directory skeleton: `src/game/ai/`, `src/renderer/`, `src/input/`, `src/utils/`, `tests/game/`, `tests/utils/`, `public/assets/tiles/`

**Checkpoint**: `npm run dev` starts a dev server; `npm test` runs (zero tests pass, zero fail)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, constants, utilities, and the base game state factory. MUST be complete before any user story begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Define all core TypeScript types from `contracts/game-state.ts` in `src/game/types.ts`: `TerrainType`, `UnitType`, `PlayerId`, `Owner`, `SettlementType`, `TurnPhase`, `FogState`, `MapSizeOption`, `TileCoord`, `Tile`, `Settlement`, `Unit`, `Player`, `FogMap`, `KnownTile`, `KnownWorld`, `GameState`
- [X] T008 [P] Define all static configuration constants in `src/game/constants.ts`: `TERRAIN_CONFIG`, `UNIT_CONFIG`, `MAP_SIZE_CONFIG`, `SETTLEMENT_INCOME`, `STARTING_FUNDS` (values from data-model.md)
- [X] T009 [P] Write unit tests for `src/utils/rng.ts` in `tests/utils/rng.test.ts`: same seed produces identical sequence; different seeds diverge within 3 calls; output always in [0, 1) — **verify tests FAIL before T010**
- [X] T010 [P] Implement Mulberry32 seeded PRNG: `mulberry32(seed: number): () => number` in `src/utils/rng.ts`
- [X] T011 [P] Write unit tests for `src/game/board.ts` in `tests/game/board.test.ts`: `tileId`/`tileCoord` round-trip, `adjacentTiles` returns correct neighbours at edges/corners, `chebyshevDistance` and `manhattanDistance` — **verify tests FAIL before T012**
- [X] T012 [P] Implement grid utilities in `src/game/board.ts`: `tileId(row,col)`, `tileCoord(id)`, `adjacentTiles(grid,coord)`, `chebyshevDistance(a,b)`, `manhattanDistance(a,b)`
- [X] T013 Implement `GameState` factory `createInitialState()` and `applyAction(state, action)` stub (returns `{ok:false, error:'invalid-phase'}` for all actions) in `src/game/state.ts` (depends on T007, T008)

**Checkpoint**: `npm test` passes T009 and T011 test suites (rng and board)

---

## Phase 3: User Story 1 — New Game Setup (Priority: P1) 🎯 MVP

**Goal**: Player launches the game, selects a map size, and a playable map is rendered with terrain, cities, towns, and both player starting positions.

**Independent Test**: Launch the app, select Medium map size from the main menu, verify a 15×15 map renders with at least 5 distinct terrain types, 2 cities, and 3+ towns; each player has one owned city; each player starts with $200.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T014 [P] [US1] Write unit tests for `src/game/mapgen.ts` in `tests/game/mapgen.test.ts`: generated map matches requested dimensions; all 5 terrain types present; settlement counts within spec ranges; flood-fill confirms all land settlements reachable from both starting cities; 10 consecutive generated maps all pass connectivity check — **verify tests FAIL before T015**
- [X] T015 [P] [US1] Write unit tests for `src/game/turns.ts` in `tests/game/turns.test.ts`: `startTurn` income phase adds $50/town and $100/city to active player funds; phase transitions `income→orders`; starting state has both players at $200; turn number increments after AI turn — **verify tests FAIL before T016**

### Implementation

- [X] T016 [US1] Implement procedural map generator in `src/game/mapgen.ts`: Simplex noise terrain generation with threshold bucketing (water 20–25%, mountains 10–15%, plains 25–30%, grasslands 20–25%, forests 15–20%); Poisson-disk-lite settlement placement with minimum distance by map size; flood-fill connectivity check with retry loop (max 20 attempts, `seed + attempt` offset); Mulberry32 RNG; returns `GeneratedMap` as per `contracts/engine.ts`
- [X] T017 [US1] Implement turn phase state machine and income collection in `src/game/turns.ts`: `startTurn(state)` → collects income, resets unit movement and hasAttacked flags, returns new state; `endTurn(state)` → resolves pending captures (stub for now), transitions phase (depends on T013, T016)
- [X] T018 [US1] Implement `GameEngine.newGame(mapSize, seed?)` in `src/game/state.ts`: invoke map generator, place both players with one starting city each at $200, construct initial `GameState` with `phase: 'income'` (depends on T016, T017)
- [X] T019 [P] [US1] Initialize PixiJS Application (WebGL renderer, auto-resize to window); implement tile grid rendering from `GameState` using `@pixi/tilemap` tilemap in `src/renderer/renderer.ts` and `src/renderer/tilemap.ts`; use colored rectangles as terrain placeholders if sprites not yet available
- [X] T020 [P] [US1] Implement main menu HTML overlay with three buttons (Small / Medium / Large); show/hide logic; wire button clicks to `onMapSizeSelected` callback as per `contracts/renderer.ts` in `src/renderer/ui.ts`
- [X] T021 [US1] Implement `src/main.ts` game loop: show menu on load → `newGame` on size selection → call `startTurn` → render initial state → set up input listener stubs (depends on T018, T019, T020)

**Checkpoint**: `npm test` passes T014 and T015; launch game, select map size, see rendered map with terrain colours; player funds show $200

---

## Phase 4: User Story 2 — Unit Movement & Terrain (Priority: P2)

**Goal**: Player selects a unit, sees valid movement tiles highlighted, and can move it; terrain costs apply correctly and impassable/blocked tiles are rejected.

**Independent Test**: Place a Scout (5 MP) on a map tile surrounded by plains, forests, and water. Verify reachable tiles are highlighted; entering a forest costs 2 MP; water tiles are not highlighted; a tile with a friendly unit is not highlighted; clicking a valid tile moves the Scout.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T022 [P] [US2] Write unit tests for movement validation in `tests/game/rules.test.ts`: `validateMove` rejects move when unit has 0 MP remaining; rejects path through water tile; rejects destination occupied by friendly unit; accepts path where total terrain cost ≤ unit's MP — **verify tests FAIL before T023**
- [X] T023 [P] [US2] Write unit tests for Dijkstra pathfinding in `tests/game/pathfinding.test.ts`: Scout (5 MP) on plains reaches 5-step destinations; Artillery (2 MP) cannot pass a mountain (cost 3); `reachableMap` excludes water tiles; all tiles in returned set have accumulated cost ≤ budget — **verify tests FAIL before T024**

### Implementation

- [X] T024 [US2] Implement `validateMove(state, action)` (terrain cost check, passability, friendly-unit blocking) and `applyMove(state, action)` (deduct MP from path, update `tile.unitId` and `unit.tileId`) in `src/game/rules.ts`
- [X] T025 [US2] Implement Dijkstra `reachableMap(state, origin, budget)` → `Map<string, number>` and `getReachableTiles(state, unitId)` → `TileCoord[]` in `src/game/pathfinding.ts` (depends on T024)
- [X] T026 [US2] Implement `applyAction('move')` in `src/game/state.ts`: call `validateMove`, apply move, recompute fog (stub: no-op until Phase 5), return new state (depends on T024, T025)
- [X] T027 [US2] On unit tile click: call `getReachableTiles`, pass result to `renderer.highlightReachable`; on destination tile click: dispatch `MoveAction`, re-render updated state in `src/input/input.ts` and `src/renderer/renderer.ts`

**Checkpoint**: `npm test` passes T022 and T023; click a unit to see highlighted tiles; move it to a valid tile; verify movement points consumed correctly

---

## Phase 5: User Story 3 — Fog of War (Priority: P3)

**Goal**: Only tiles within friendly unit vision are fully visible; previously explored tiles show terrain but hide enemy units; unexplored tiles are fully hidden.

**Independent Test**: Start a new game; verify only tiles within starting city and starting unit vision range are visible; move a Scout to a new area; verify those tiles become visible; verify the AI's units are not visible anywhere outside player vision.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T028 [P] [US3] Write unit tests for `src/game/fog.ts` in `tests/game/fog.test.ts`: on new game all tiles outside starting vision are `'hidden'`; after Scout moves, tiles within visionRange=4 become `'visible'`; tiles that were `'visible'` and leave all unit ranges drop to `'explored'`; enemy unit on `'explored'` tile is not exposed — **verify tests FAIL before T029**

### Implementation

- [X] T029 [US3] Implement `recomputeFog(state, playerId)` → `FogMap` in `src/game/fog.ts`: Chebyshev distance sweep from each friendly unit using `unit.visionRange`; tiles within range → `'visible'`; previously `'visible'` tiles now out of range → `'explored'`; `'hidden'` tiles stay `'hidden'` until first seen; `'explored'` never reverts to `'hidden'`
- [X] T030 [US3] Integrate fog recomputation into `startTurn` in `src/game/turns.ts`: call `recomputeFog` for active player at turn start; integrate into `applyMove` path in `src/game/state.ts` (recompute after each move)
- [X] T031 [US3] Render fog overlay in `src/renderer/fog.ts`: `'hidden'` tiles → fully opaque black overlay; `'explored'` tiles → semi-transparent dim; `'visible'` tiles → no overlay; suppress rendering of enemy unit sprites on non-`'visible'` tiles in `src/renderer/units.ts`

**Checkpoint**: `npm test` passes T028; confirm AI units are invisible outside the player's vision; confirm explored tiles show terrain but not enemy positions

---

## Phase 6: User Story 4 — Combat (Priority: P4)

**Goal**: Player orders a unit to attack an enemy; damage is applied using the deterministic formula; adjacent defenders counterattack; Artillery at range 2 triggers no counterattack; units at 0 HP are removed.

**Independent Test**: Place Infantry (atk=4, def=3) adjacent to enemy Infantry (atk=4, def=3). Order attack: damage = max(1, 4-3) = 1 to defender; counterattack = max(1, 4-3) = 1 to attacker. Place Artillery (atk=6, range=2) 2 tiles from enemy Infantry: damage = max(1, 6-3) = 3, no counterattack.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T032 [P] [US4] Write unit tests for `src/game/combat.ts` in `tests/game/combat.test.ts`: Infantry vs Infantry → 1 damage each; Artillery vs Infantry at range 2 → 3 damage, no counterattack; unit at 0 HP is removed from state; minimum damage is always 1 even when defense > attack — **verify tests FAIL before T033**
- [X] T033 [P] [US4] Extend `tests/game/rules.test.ts` with attack validation tests: unit with `hasAttacked=true` rejected; target out of range rejected; Artillery at distance 2 accepted; target at distance 3 rejected — **verify new tests FAIL before T034**

### Implementation

- [X] T034 [US4] Implement `resolveCombat(state, attackerUnitId, targetUnitId)` → `CombatResult` in `src/game/combat.ts`: apply `damage = max(1, atk - def)` to defender; resolve counterattack if attacker `attackRange === 1` and defender survives and is adjacent; remove units with `hp ≤ 0` from `state.units` and clear `tile.unitId`
- [X] T035 [US4] Implement `validateAttack(state, action)` and `applyAction('attack')` in `src/game/rules.ts` and `src/game/state.ts`: check `hasAttacked`, range, enemy ownership; call `resolveCombat`; set `hasAttacked = true` on attacker (depends on T034)
- [X] T036 [US4] Implement `getAttackableTargets(state, unitId)` → `string[]` using Chebyshev distance for range check in `src/game/pathfinding.ts`; after unit move, call `renderer.highlightAttackable`; on enemy tile click dispatch `AttackAction`; update or remove destroyed unit sprites in `src/input/input.ts` and `src/renderer/units.ts`

**Checkpoint**: `npm test` passes T032 and T033; order an attack; verify HP loss and counterattack; artillery attack at range 2 triggers no counterattack; destroyed units disappear from the map

---

## Phase 7: User Story 5 — City & Town Capture (Priority: P5)

**Goal**: Moving a unit onto a neutral or enemy settlement and ending the turn transfers ownership; income adjusts to reflect new ownership; combat prevents capture.

**Independent Test**: Move a unit onto a neutral city. End turn. Verify ownership shows player's colour. Start next turn: verify income now includes $100 for that city. Verify that if an enemy unit is on the city tile, combat occurs and capture does not proceed.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T037 [P] [US5] Extend `tests/game/turns.test.ts` with capture tests: neutral city occupied at end-of-turn → ownership transfers; enemy town occupied → transfers from enemy; income next turn reflects new ownership ($50 for town, $100 for city); enemy unit on tile triggers combat before capture — **verify new tests FAIL before T038**

### Implementation

- [X] T038 [US5] Implement capture resolution in `endTurn` in `src/game/turns.ts`: for each active-player unit on a neutral/enemy settlement tile, transfer `settlement.owner` to active player; if enemy unit is present, trigger `resolveCombat` first and only capture if tile is clear afterward (depends on T034)
- [X] T039 [US5] Update income collection in `startTurn` to query `settlement.owner` dynamically so captures from previous turn are reflected
- [X] T040 [US5] Update settlement rendering in `src/renderer/tilemap.ts` to colour city/town icons by owner (player1/player2/neutral); update HUD funds display after capture in `src/renderer/ui.ts`

**Checkpoint**: `npm test` passes T037; move a unit to a neutral city; end turn; see ownership colour change and income increase the following turn

---

## Phase 8: User Story 6 — Unit Production (Priority: P6)

**Goal**: Player spends funds to queue a unit at a controlled city; cost deducted immediately; unit appears at city tile on the player's next turn; busy city and insufficient funds are rejected.

**Independent Test**: Own a city with $200 in funds. Order an Infantry ($200). Verify funds become $0 and city shows as busy. Start next turn: Infantry appears at the city tile. Attempt a second order on the busy city: rejected.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T041 [P] [US6] Extend `tests/game/turns.test.ts` with production tests: `applyAction('produce')` deducts correct cost and sets `productionQueue`; second order on busy city returns `error: 'city-busy'`; insufficient funds returns `error: 'insufficient-funds'`; `startTurn` spawns queued unit at city tile and clears `productionQueue` — **verify new tests FAIL before T042**

### Implementation

- [X] T042 [US6] Implement `validateProduce(state, action)` and `applyAction('produce')` in `src/game/rules.ts` and `src/game/state.ts`: check city ownership, `productionQueue === null`, and `player.funds >= cost`; deduct cost, set `productionQueue`
- [X] T043 [US6] Implement production resolution in `turns.ts` `startTurn`: for each city owned by active player with non-null `productionQueue`, create a new `Unit` at the city tile with full HP and MP, clear `productionQueue` (depends on T042)
- [X] T044 [US6] Implement city production menu UI in `src/renderer/ui.ts`: show panel on city tile click (if owned and idle); list Scout/Infantry/Artillery with costs and current funds; disable unaffordable options; wire selection to `ProduceAction` dispatch in `src/input/input.ts`; show "busy" indicator for cities with active production

**Checkpoint**: `npm test` passes T041; click owned idle city; open production menu; order a unit; verify immediate fund deduction; next turn unit appears at city

---

## Phase 9: User Story 7 — AI Opponent Turn (Priority: P7)

**Goal**: After the human ends their turn, the AI automatically moves units, attacks, captures settlements, and orders production, then returns control to the human.

**Independent Test**: End the human player's turn. Verify the AI moves at least one unit (or issues at least one action), then returns control to the human player within 3 seconds. Verify the AI produces a unit if it has a city with sufficient funds.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T045 [P] [US7] Write unit tests for `src/game/ai/ai.ts` in `tests/game/ai.test.ts`: `computeTurn` returns a non-empty action list when AI has mobile units; last action is always `EndTurnAction`; every returned action passes `validateAction` (no invalid moves or attacks); `computeTurn` completes in < 100ms on a 20×20 map — **verify tests FAIL before T046**

### Implementation

- [X] T046 [US7] Implement utility scoring functions in `src/game/ai/scoring.ts`: `distanceScore(unit, objective, state)` (inverse distance); `unitFitScore(unit, objective)` (Scout→scouting, Infantry→capture, Artillery→ranged); `objectiveValueScore(objective)` (city income, enemy HP); `threatScore(objective, state)` (enemy presence near tile)
- [X] T047 [US7] Implement AI known-world update in `src/game/ai/ai.ts`: at start of AI turn, iterate all AI unit vision ranges; update `state.aiKnownWorld` for all visible tiles with current terrain, settlement, and unit info
- [X] T048 [US7] Implement greedy objective assignment in `src/game/ai/ai.ts`: build objectives list (enemy units, unowned settlements, strategic tiles); maintain `claimedObjectives` set; for each AI unit in initiative order, score all unclaimed objectives and assign the highest-scoring unclaimed one (depends on T046)
- [X] T049 [US7] Implement per-unit decision logic in `src/game/ai/ai.ts`: (1) retreat if HP ≤ 25% and no kill available; (2) attack for kill if calculable; (3) attack if advantageous; (4) capture if on/adjacent to unclaimed settlement; (5) move toward assigned objective via A*; (6) order production at idle city if funds allow (depends on T047, T048)
- [X] T050 [US7] Integrate AI turn into game loop in `src/game/turns.ts` and `src/main.ts`: after human `EndTurnAction`, set `phase: 'ai'`; call `computeTurn`, apply each returned action via `applyAction` sequentially; re-render after each action; then start human's next turn with `startTurn`

**Checkpoint**: `npm test` passes T045; end human turn; watch AI move units; control returns to human within 3 seconds; AI produces units when it has funds

---

## Phase 10: User Story 8 — Victory & Game End (Priority: P8)

**Goal**: Game ends when a player controls zero cities; winner is declared; victory screen shown; player can return to main menu for a new game.

**Independent Test**: Capture all AI cities. Verify the game immediately stops accepting input, shows a "Player 1 Wins" screen, and clicking Return to Menu resets to map size selection.

### Tests — Write First, Verify FAIL Before Implementation

- [X] T051 [P] [US8] Extend `tests/game/turns.test.ts` with victory tests: after capture that eliminates last enemy city, `state.winner` is set and `phase === 'victory'`; `applyAction` returns `error: 'invalid-phase'` when `phase === 'victory'` — **verify new tests FAIL before T052**

### Implementation

- [X] T052 [US8] Implement victory detection in `src/game/turns.ts`: after every capture resolution and after every unit removal from combat, count cities per player; if any player owns 0 cities, set `state.winner` and `state.phase = 'victory'`
- [X] T053 [US8] Implement victory screen in `src/renderer/ui.ts`: overlay showing winner name, game statistics (turns played, settlements owned); "Return to Main Menu" button wired to `onReturnToMenu` callback; block all tile/unit click events while overlay is visible
- [X] T054 [US8] Wire return-to-menu to full game reset in `src/main.ts`: destroy current renderer state, re-show main menu, allow a new `newGame` call; verify new game starts cleanly without state leaking from previous game

**Checkpoint**: `npm test` passes T051; capture last AI city; see victory screen; click return; select a new map size; new game starts correctly

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, HUD completeness, deployment, and validation of success criteria

- [X] T055 [P] Add persistent HUD in `src/renderer/ui.ts`: current player name, current funds, turn counter, current phase label; update on every render call
- [X] T056 [P] Add unit info panel in `src/renderer/ui.ts`: show selected unit stats (HP, MP remaining, attack, defense) on unit selection; clear on deselect
- [X] T057 [P] Create GitHub Pages deploy workflow in `.github/workflows/deploy.yml`: checkout → `npm ci` → `npm run build` → deploy `dist/` to GitHub Pages on push to `main`
- [X] T058 Run success criteria validation: SC-001 (new game visible in < 5s on all three map sizes), SC-007 (generate 10 consecutive maps and confirm all pass connectivity check), SC-008 (AI turn completes in < 3s on Large map); log results
- [X] T059 [P] Run full test suite (`npm test`): confirm zero failures across all test files; confirm no PixiJS imports exist in any file under `src/game/` or `tests/`
- [X] T060 Validate quickstart.md end-to-end: fresh `npm install` + `npm run dev` → game loads in browser; `npm test` → all pass; `npm run build` → `dist/` directory produced and locally previewable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — no other story dependencies
- **US2 (Phase 4)**: Depends on Phase 2 — no US1 dependency (movement is independent of map gen UI)
- **US3 (Phase 5)**: Depends on US2 (fog recomputed on move) and US1 (needs rendered game state)
- **US4 (Phase 6)**: Depends on US2 (units must be able to move to be adjacent for attack)
- **US5 (Phase 7)**: Depends on US2 (unit must move onto settlement) and US4 (combat before capture)
- **US6 (Phase 8)**: Depends on US1 (cities exist in rendered state) — largely independent otherwise
- **US7 (Phase 9)**: Depends on US2, US4, US5, US6 (AI does all of these actions)
- **US8 (Phase 10)**: Depends on US5 (capture triggers victory check)
- **Polish (Phase 11)**: Depends on all user stories complete

### User Story Dependencies Summary

```
Phase 1 (Setup)
  └─► Phase 2 (Foundational)
        ├─► US1 (New Game Setup)
        │     └─► US3 (Fog of War) ──────────────────┐
        ├─► US2 (Unit Movement) ────────────────────┐ │
        │     ├─► US3 (Fog of War)                  │ │
        │     ├─► US4 (Combat) ──────────────────┐  │ │
        │     │     └─► US5 (Capture) ───────┐   │  │ │
        │     │                              │   │  │ │
        └─► US6 (Unit Production) ─────────┐│   │  │ │
                                           ││   │  │ │
                                    US7 (AI Turn) ◄─┘└─┘
                                           │
                                    US8 (Victory) ◄─ US5
                                           │
                                    Phase 11 (Polish)
```

### Within Each User Story

1. Write test tasks (marked "verify tests FAIL") — these come **first**
2. Implement entities/constants needed by the story
3. Implement services/logic (game rules, state transitions)
4. Implement rendering and input wiring
5. Verify checkpoint independently before proceeding

---

## Parallel Opportunities

### Phase 2 (Foundational)

```
Parallel group A: T008 (constants) + T009/T010 (rng tests + impl) + T011/T012 (board tests + impl)
Sequential: T007 (types) → T013 (state factory)
```

### Phase 3 (US1)

```
Parallel group: T014 (mapgen tests) + T015 (turns tests)
Sequential: T016 (mapgen impl) → T017 (turns impl) → T018 (newGame)
Parallel group: T019 (renderer init) + T020 (menu UI)
Sequential: T021 (main.ts wiring)
```

### Phase 6 (US4 — Combat)

```
Parallel group: T032 (combat tests) + T033 (attack validation tests)
Sequential: T034 (combat impl) → T035 (applyAction attack) → T036 (input wiring)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (New Game Setup)
4. **STOP AND VALIDATE**: Can launch game, select map size, see rendered map; `npm test` passes
5. Deploy to GitHub Pages for visual validation

### Incremental Delivery

```
Phase 1+2 → Foundation ✓
Phase 3    → US1: Playable map renders ✓ (demo)
Phase 4    → US2: Units move on the map ✓ (demo)
Phase 5    → US3: Fog of war active ✓ (demo)
Phase 6    → US4: Combat works ✓ (demo)
Phase 7    → US5: Cities can be captured ✓ (demo)
Phase 8    → US6: Units can be produced ✓ (demo)
Phase 9    → US7: AI takes its turn automatically ✓ (playable game)
Phase 10   → US8: Victory screen completes the game loop ✓ (shippable)
Phase 11   → Polish and deploy to GitHub Pages ✓ (shipped)
```

---

## Notes

- `[P]` tasks touch different files with no incomplete-task dependencies — safe to parallelize
- `[Story]` label maps every task to its user story for traceability
- **TDD**: Every non-trivial logic task has a preceding test task; tests must be RED before implementation begins
- No PixiJS imports allowed in `src/game/` or `tests/` — enforced by convention, validated in T059
- `GameState` must remain fully JSON-serializable at all times — no class instances or functions in state
- Use `mulberry32` from `src/utils/rng.ts` everywhere in game logic; never call `Math.random()`
- Commit after each task or logical group using conventional commit format (`feat:`, `fix:`, `test:`, `chore:`)
- Each checkpoint is independently demoable — stop and validate before moving to the next story
