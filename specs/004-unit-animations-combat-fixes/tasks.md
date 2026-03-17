# Tasks: Unit Animations, Visual Polish, and Combat Fixes

**Input**: Design documents from `/specs/004-unit-animations-combat-fixes/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Test tasks are included for US1 (game logic bug fixes) per the Constitution's Test-First Development mandate. Renderer, animation, hover, and sound changes are verified manually.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create new files needed before any user story begins

- [X] T001 Create `src/audio/sound.ts` with an empty `SoundManager` class stub (just the class declaration and the three empty public methods: `playSelect`, `playMove`, `playAttack`)

**Checkpoint**: `npm test` still passes with no changes to game logic

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish a verified baseline before modifying any file

**⚠️ CRITICAL**: Run and record passing test output before any changes

- [X] T002 Run `npm test` and confirm all existing tests pass; record the passing test count as the baseline to protect against regressions

**Checkpoint**: Baseline confirmed — user story implementation can now begin

---

## Phase 3: User Story 1 — Combat Works Correctly (Priority: P1) 🎯 MVP

**Goal**: Fix the two interlinked movement/attack bugs so attacks resolve correctly, attackers stay on their tiles, and no two units ever share a tile.

**Independent Test**: Select a friendly unit adjacent to an enemy → click the enemy tile → attacker stays in place, defender loses HP. Then verify `npm test` passes all new and existing tests.

### Tests for User Story 1 (Constitution mandates test-first for game logic)

> **Write these tests FIRST and confirm they FAIL before implementing the fixes**

- [X] T003 [P] [US1] Write failing test in `tests/game/pathfinding.test.ts`: `getReachableTiles` must NOT include a tile occupied by an enemy unit as a valid move destination
- [X] T004 [P] [US1] Write failing test in `tests/game/rules.test.ts`: `validateMove` must return an error (`path-blocked`) when the destination tile is occupied by an enemy unit
- [X] T005 [P] [US1] Write failing test in `tests/game/rules.test.ts`: game state invariant — after any `applyMove` or `applyCombatResult` call, no two entries in `state.units` share the same `tileId`

### Implementation for User Story 1

- [X] T006 [US1] Fix `getReachableTiles` in `src/game/pathfinding.ts`: in the result-filtering loop (currently lines 83–94), skip tiles where `tile.unitId !== null && state.units[tile.unitId]?.owner !== unit.owner` — i.e., exclude enemy-occupied tiles the same way friendly-occupied tiles are already excluded
- [X] T007 [US1] Fix `validateMove` in `src/game/rules.ts`: change the occupancy check in the path-validation loop (currently lines 57–62) so that ANY occupied tile (not just friendly) is rejected as a destination — change `occupant.owner === unit.owner` to `tile.unitId !== null` for the destination tile; intermediate tiles still only block on friendly occupants (passing through an enemy's tile is already implicitly prevented by step validation)
- [X] T008 [US1] Run `npm test` — confirm T003, T004, T005 now pass and no existing tests regressed
- [X] T009 [US1] Manual smoke test per `quickstart.md` Slice 1: start a game, select a unit adjacent to an AI unit, click the enemy → verify attack fires (attacker stays), deselect, verify no tile has two units

**Checkpoint**: US1 complete — attack bug fixed, tile occupation invariant enforced

---

## Phase 4: User Story 2 — Unit Animations (Priority: P2)

**Goal**: Units animate continuously at idle and play distinct move/attack/death animations. The attack animation visually confirms the attacker does not travel to the target tile.

**Independent Test**: Move a unit → smooth tile-by-tile traversal visible. Attack an enemy → attacker briefly lunges and returns. Destroyed unit flashes/fades. Idle units bob gently.

### Implementation for User Story 2

- [X] T010 [US2] Add `AnimationController` class at the bottom of `src/renderer/units.ts`: constructor takes `app: Application` and registers a ticker listener; exposes `isAnimating(): boolean`, `cancelUnit(unitId: string): void`, and maintains an internal list of `AnimationState` objects
- [X] T011 [US2] Implement idle bob in `AnimationController` tick handler in `src/renderer/units.ts`: for each unit container registered via a new `registerIdle(unitId, container)` method, apply a sinusoidal Y offset of `Math.sin(ticker.lastTime / 400 + phase) * 2` pixels where phase varies per unit to avoid lockstep bobbing
- [X] T012 [US2] Implement `playMove(unitId, container, waypoints, msPerTile, onComplete)` in `AnimationController` in `src/renderer/units.ts`: animate the container linearly from one waypoint to the next, chaining steps via each step's `onComplete`; pause the idle bob for this unit during movement; call the outer `onComplete` after the last waypoint
- [X] T013 [US2] Implement `playAttack(unitId, container, fromPos, targetPos, onComplete)` in `AnimationController` in `src/renderer/units.ts`: lunge the container to 40% of the vector toward `targetPos` over 200ms, then return to `fromPos` over 150ms; call `onComplete` after return; pause idle bob during animation
- [X] T014 [US2] Implement `playDeath(unitId, container, onComplete)` in `AnimationController` in `src/renderer/units.ts`: fade `container.alpha` from 1.0 → 0 over 400ms; call `onComplete` after fade; the caller is responsible for removing the container from the scene
- [X] T015 [US2] Add `animateMove(unitId: string, path: TileCoord[], onComplete: () => void): void` and `animateAttack(unitId: string, targetTileCoord: TileCoord, onComplete: () => void): void` and `isAnimating(): boolean` to `GameRenderer` in `src/renderer/renderer.ts`; delegate to `UnitsRenderer`'s `AnimationController`; `isAnimating()` returns `true` if any one-shot animation is in progress
- [X] T016 [US2] Update `InputHandler.doMove` in `src/input/input.ts`: call `renderer.animateMove(unitId, path, () => { this.onStateUpdate(result.state); ... })` and move the `onStateUpdate` + post-move attack-check logic into the `onComplete` callback so state updates only after the animation finishes
- [X] T017 [US2] Update `InputHandler.doAttack` in `src/input/input.ts`: call `renderer.animateAttack(attackerUnitId, targetTileCoord, () => { this.onStateUpdate(result.state); this.deselect(); })` with the state update deferred to `onComplete`
- [X] T018 [US2] Add input blocking in `InputHandler.handleTileClick` in `src/input/input.ts`: add `if (this.renderer.isAnimating()) return;` as the first line inside the click callback to prevent input during in-flight animations

**Checkpoint**: US2 complete — smooth move traversal, attack lunge-and-return, death fade, idle bob all visible in-game

---

## Phase 5: User Story 3 — Tile Visual Detail (Priority: P3)

**Goal**: Each terrain type displays at least one decorative graphical element drawn over the flat base color, making terrain types visually distinct without obscuring units or settlements.

**Independent Test**: Open the game and inspect all five terrain types — each has at least one distinct decorative element drawn within the tile boundary.

### Implementation for User Story 3

- [X] T019 [US3] Add private `renderTerrainDetail(tile: Tile, g: Graphics, x: number, y: number, tileSize: number): void` method to `TilemapRenderer` in `src/renderer/tilemap.ts`; use `(tile.coord.row * 31 + tile.coord.col * 17) % N` for deterministic pseudo-random placement offsets so detail is stable across re-renders
- [X] T020 [US3] Implement plains detail in `renderTerrainDetail` in `src/renderer/tilemap.ts`: draw 3 small "V"-shaped grass tufts (two short `lineTo` lines each) using a lighter green stroke (`0xb0d870`), positioned at deterministic offsets within a 4px inset of the tile boundary
- [X] T021 [US3] Implement grassland detail in `renderTerrainDetail` in `src/renderer/tilemap.ts`: draw 4–5 denser grass tufts (same "V" stroke technique) plus one small filled circle (`radius = 3`) representing a bush, using `0x80c050` stroke and `0x508030` fill
- [X] T022 [US3] Implement forest detail in `renderTerrainDetail` in `src/renderer/tilemap.ts`: draw 2–3 filled dark-green circles (`0x104010`, radius 4–6px) to represent tree canopies, positioned in the upper half of the tile to leave room for units
- [X] T023 [US3] Implement mountain detail in `renderTerrainDetail` in `src/renderer/tilemap.ts`: draw a filled triangle using `poly([cx, y+4, cx+8, y+tileSize-6, cx-8, y+tileSize-6])` in dark gray (`0x505050`) to represent a peak silhouette
- [X] T024 [US3] Implement water detail in `renderTerrainDetail` in `src/renderer/tilemap.ts`: draw 2 short horizontal arcs/lines using lighter blue (`0x4090e0`) in the middle third of the tile to represent ripples
- [X] T025 [US3] Call `this.renderTerrainDetail(tile, g, x, y, tileSize)` inside `renderTiles()` in `src/renderer/tilemap.ts`, immediately after the `g.fill()` call for the base color; cache the detail on first draw (only re-draw if `g` is freshly created, since terrain never changes)

**Checkpoint**: US3 complete — all five terrain types have visible decorative detail in the rendered game

---

## Phase 6: User Story 4 — Hover Highlight for Reachable Tiles (Priority: P3)

**Goal**: With a unit selected, hovering the cursor over a reachable tile shows a distinct bright highlight; hovering over an attackable enemy tile shows an attack-hover color. No highlight when no unit is selected.

**Independent Test**: Select a unit → move cursor over highlighted tiles → each reachable tile shows a bright hover overlay as the cursor passes over it; non-reachable tiles show no hover effect.

### Implementation for User Story 4

- [X] T026 [US4] Add optional 4th parameter `hoverCoord: TileCoord | null = null` to `TilemapRenderer.render()` in `src/renderer/tilemap.ts` and forward it to `renderHighlights()`
- [X] T027 [US4] Add hover rendering in `renderHighlights()` in `src/renderer/tilemap.ts`: if `hoverCoord` is in `reachable`, draw a bright move-hover rect (`0x88ccff`, alpha 0.55) over that tile; if `hoverCoord` is in `attackable`, draw an attack-hover rect (`0xff8888`, alpha 0.55); otherwise no hover drawn
- [X] T028 [US4] Add `private hoverCoord: TileCoord | null = null` field and `setHoverCoord(coord: TileCoord | null): void` method to `GameRenderer` in `src/renderer/renderer.ts`; pass `this.hoverCoord` as the 4th argument in the `this.tilemapRenderer.render(...)` call inside `render()`
- [X] T029 [US4] Add `mousemove` listener on the canvas in `InputHandler.setupCanvasClick()` in `src/input/input.ts`: apply the same coordinate transform as the `click` handler to compute the hovered `TileCoord`; call `this.renderer.setHoverCoord(coord)` only when a unit is selected (`this.selectedUnitId !== null`), otherwise call `this.renderer.setHoverCoord(null)`
- [X] T030 [US4] Add `mouseleave` listener on the canvas in `InputHandler.setupCanvasClick()` in `src/input/input.ts`: call `this.renderer.setHoverCoord(null)` to clear hover when the cursor exits the canvas
- [X] T031 [US4] Trigger a lightweight re-render of the tilemap layer on each hover change in `src/input/input.ts`: after calling `setHoverCoord`, call `this.renderer.render(this.getState(), this.humanPlayerId)` so the hover highlight updates each frame (this is cheap since tilemap rendering is the same path already called on state changes)

**Checkpoint**: US4 complete — hover highlights appear and disappear correctly as cursor moves over reachable/attackable tiles

---

## Phase 7: User Story 5 — Sound Feedback (Priority: P4)

**Goal**: Brief synthesized audio tones play when a unit is selected, moved, or attacks. Audio failures are silent.

**Independent Test**: Enable audio in the browser, play a game session — three distinct sounds are audible for select, move, and attack actions.

### Implementation for User Story 5

- [X] T032 [US5] Implement `SoundManager` in `src/audio/sound.ts` (expanding the stub from T001): add `private ctx: AudioContext | null = null` field; add private `getCtx(): AudioContext | null` that lazily creates the `AudioContext` on first call (wrapped in `try/catch` returning `null` on failure)
- [X] T033 [US5] Implement `playSelect()` in `src/audio/sound.ts`: create an `OscillatorNode` (type `sine`, frequency 880 Hz) + `GainNode` (initial gain 0.15, ramp to 0 over 80ms); connect and start; disconnect after 100ms; wrap entire body in `try/catch` that silently discards errors
- [X] T034 [US5] Implement `playMove()` in `src/audio/sound.ts`: create an `OscillatorNode` (type `sine`, frequency 440 Hz with `linearRampToValueAtTime` to 660 Hz at +150ms) + `GainNode` (gain 0.12, ramp to 0 over 150ms); wrap in `try/catch`
- [X] T035 [US5] Implement `playAttack()` in `src/audio/sound.ts`: create an `OscillatorNode` (type `square`, frequency 220 Hz) + `GainNode` (gain 0.18, fast ramp to 0 over 200ms); wrap in `try/catch`
- [X] T036 [US5] Update `InputHandler` constructor in `src/input/input.ts` to accept an optional `private sound?: SoundManager` parameter; call `this.sound?.playSelect()` in `selectUnit()`, `this.sound?.playMove()` in `doMove()` on success (inside the `onComplete` callback from T016), `this.sound?.playAttack()` in `doAttack()` on success (inside the `onComplete` callback from T017)
- [X] T037 [US5] Instantiate `new SoundManager()` in `main.ts` and pass it as the 6th argument to the `InputHandler` constructor in `src/main.ts`

**Checkpoint**: US5 complete — three distinct tones play for select/move/attack; no errors thrown when audio is blocked

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, type safety, and cleanup

- [X] T038 Run `npm test` and confirm all tests pass (pathfinding + rules + full existing suite) with zero regressions
- [X] T039 [P] Run `npm run lint` (TypeScript type check) and fix any type errors introduced by new method signatures — particularly the 4th parameter added to `TilemapRenderer.render()` and the `SoundManager` parameter in `InputHandler`
- [X] T040 Manual end-to-end smoke test per `quickstart.md`: play a full game session exercising all five user stories — attack fix, smooth animations, terrain detail, hover highlights, and all three sounds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — confirms baseline
- **US1 (Phase 3)**: Depends on Phase 2 — no dependencies on other stories
- **US2 (Phase 4)**: Depends on Phase 2 — no game-logic dependencies; can start after US1 or in parallel
- **US3 (Phase 5)**: Depends on Phase 2 — fully independent of US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 — touches `tilemap.ts` and `renderer.ts`; independent of US2 logic but may need US1 complete to test attack-hover correctly
- **US5 (Phase 7)**: Depends on Phase 2 — fully independent except `input.ts` which US2 also modifies; sequence after US2 to avoid merge conflicts on `input.ts`
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: No story dependencies — implement first
- **US2 (P2)**: No story dependencies on US1 for game logic; `input.ts` changes should follow US1 to avoid conflicts
- **US3 (P3)**: Fully independent — only touches `tilemap.ts`
- **US4 (P3)**: Partially shares `tilemap.ts` with US3 and `renderer.ts` with US2 — implement after US3 to avoid conflicts on `tilemap.ts`
- **US5 (P4)**: Partially shares `input.ts` with US2 — implement after US2

### Recommended Sequential Order (single developer)

US1 → US2 → US3 → US4 → US5 → Polish

Each story can be committed and tested independently before the next begins.

### Within Each User Story

- For US1: Write failing tests (T003–T005) → implement fixes (T006–T007) → run tests (T008) → manual test (T009)
- For US2–US5: Implement → manual smoke test → commit

### Parallel Opportunities (if two developers available)

```bash
# After Phase 2 (Foundational):
Developer A: US1 (pathfinding.ts, rules.ts) + US2 (units.ts, renderer.ts, input.ts)
Developer B: US3 (tilemap.ts terrain detail) in parallel with Developer A on US1

# After US1 + US3 complete:
Developer A: US2 (input.ts changes)
Developer B: US4 (hover — tilemap.ts + renderer.ts)

# After US2 + US4 complete:
Developer A or B: US5 (audio/sound.ts, main.ts, input.ts)
```

---

## Implementation Strategy

### MVP First (US1 Only — fully fixes broken combat)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: US1 — Combat Fixes (T003–T009)
4. **STOP and VALIDATE**: `npm test` passes, manual attack smoke test passes
5. Commit and demo — game is now playable with correct combat

### Incremental Delivery

1. Setup + Foundational → Baseline confirmed
2. **US1** → Combat fixed, game is playable (MVP)
3. **US2** → Animations added, game feels responsive
4. **US3** → Terrain looks less flat, visual polish applied
5. **US4** → Hover highlights improve UX clarity
6. **US5** → Sound feedback added, game feels complete
7. Each story is independently committable and demoable

---

## Notes

- `[P]` tasks = different files, no shared state dependencies, safe to parallelize
- `[USn]` label maps each task to a specific user story for traceability
- US1 uses TDD (Constitution principle II) — tests written and confirmed failing before implementation
- US2–US5 changes are display-layer only (no `GameState` mutation) — verified manually via browser
- Sequence US5 after US2 to avoid edit conflicts on `src/input/input.ts`
- Sequence US4 after US3 to avoid edit conflicts on `src/renderer/tilemap.ts`
- Stop at each **Checkpoint** to verify the story works independently before proceeding
