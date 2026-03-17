# Tasks: Aggressive AI & Spawn Render Fix

**Input**: Design documents from `/specs/005-aggressive-ai-spawn-fix/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No new project setup needed — all infrastructure exists. This phase verifies the codebase is in a working state before changes begin.

- [x] T001 Verify existing tests pass by running `npm test` and confirm no regressions in tests/game/ai.test.ts

**Checkpoint**: Baseline verified — all existing AI and rendering tests pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational/blocking work required. All changes build on the existing AI objective system and renderer. User stories can begin immediately after Phase 1.

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — AI Explores and Expands Across the Map (Priority: P1) 🎯 MVP

**Goal**: The AI sends units to explore unknown territory and capture neutral settlements. Units no longer sit idle when no enemies are visible.

**Independent Test**: Start a new game and end the player's turn repeatedly. Within 5 turns, AI units should have moved from their starting position, explored new tiles, and captured at least one neutral settlement.

### Tests for User Story 1

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T002 [P] [US1] Add test: `buildObjectives` returns explore objectives when AI has no visible enemies or settlements, in tests/game/ai.test.ts
- [x] T003 [P] [US1] Add test: explore objectives target tiles at the boundary of `aiKnownWorld` (tiles with at least one unknown neighbor), in tests/game/ai.test.ts
- [x] T004 [P] [US1] Add test: `computeTurn` returns at least one move action when the only objectives are explore-type, in tests/game/ai.test.ts
- [x] T005 [P] [US1] Add test: AI units spread across different explore objectives rather than all targeting the same tile, in tests/game/ai.test.ts

### Implementation for User Story 1

- [x] T006 [US1] Add exploration objective generation to `buildObjectives()` in src/game/ai/ai.ts — scan `state.aiKnownWorld` for known tiles with at least one unknown neighbor, create up to 5 spread-out `'explore'` objectives from those boundary tiles
- [x] T007 [US1] Handle the fallback case in `buildObjectives()` in src/game/ai/ai.ts — when no boundary tiles exist (entire visible area explored), create explore objectives toward unvisited map quadrants using map dimensions from state
- [x] T008 [US1] Verify explore objectives integrate with existing `decideUnitActions()` in src/game/ai/ai.ts — ensure units move toward explore objectives using existing pathfinding (reachableMap + findPath), no changes expected but validate the path works end-to-end
- [x] T009 [US1] Run tests to confirm all US1 tests pass: `npm test`

**Checkpoint**: AI units now move every turn toward unexplored territory. With exploration working, units naturally move off city tiles, unblocking production.

---

## Phase 4: User Story 2 — AI Builds Units Consistently (Priority: P1)

**Goal**: The AI queues unit production in every idle city it can afford, with strategic unit type selection based on current needs.

**Independent Test**: Start a new game and skip turns. After 3 turns, the AI should have produced at least one new unit.

### Tests for User Story 2

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T010 [P] [US2] Add test: AI queues production even when the city tile is occupied by a unit, in tests/game/ai.test.ts
- [x] T011 [P] [US2] Add test: AI produces scouts when it has no scouts and limited map vision, in tests/game/ai.test.ts
- [x] T012 [P] [US2] Add test: AI produces infantry when it already has scouts but needs settlement capture capability, in tests/game/ai.test.ts

### Implementation for User Story 2

- [x] T013 [US2] Remove the occupied-tile check from the production phase in `computeTurn()` in src/game/ai/ai.ts — delete the condition that skips cities where `tile.unitId !== null` (line ~239), allowing production to be queued regardless of tile occupancy
- [x] T014 [US2] Replace the rigid unit-type threshold with strategic selection in `computeTurn()` in src/game/ai/ai.ts — count existing unit types in the AI's army; if no scouts exist, prefer scout; if scouts exist but few infantry, prefer infantry; otherwise prefer artillery; fall back to cheapest affordable type
- [x] T015 [US2] Run tests to confirm all US1 and US2 tests pass: `npm test`

**Checkpoint**: AI now produces units every turn it can afford them. Combined with US1, the AI explores, expands, and builds an army.

---

## Phase 5: User Story 3 — AI Aggressively Attacks the Player (Priority: P2)

**Goal**: Once the AI has sufficient forces (3+ combat units), it enters aggression mode — increasing scoring weight for enemy targets, targeting player settlements, and being less deterred by threats.

**Independent Test**: Start a game, build a unit near AI territory, and skip turns. The AI should send units toward the player and attack when in range.

### Tests for User Story 3

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T016 [P] [US3] Add test: `computeUtility` applies higher enemy-unit weight when aggression mode is active, in tests/game/ai.test.ts
- [x] T017 [P] [US3] Add test: AI with 3+ combat units generates actions that move toward player units rather than only exploring, in tests/game/ai.test.ts
- [x] T018 [P] [US3] Add test: AI prioritizes attacking weakened (low HP) player units over full-health ones, in tests/game/ai.test.ts

### Implementation for User Story 3

- [x] T019 [US3] Add aggression mode detection to `computeTurn()` in src/game/ai/ai.ts — count AI combat units (infantry + artillery); set `aggressive = true` when count >= 3; pass the flag to the scoring phase
- [x] T020 [US3] Add aggression-aware weight overrides to `computeUtility()` in src/game/ai/scoring.ts — accept an optional `aggressive` boolean parameter; when true, increase `objectiveValueScore` weight for enemy-unit objectives from 2.0 to 3.0, and reduce `threatScore` weight from -0.5 to -0.2
- [x] T021 [US3] In `buildObjectives()` in src/game/ai/ai.ts, when aggression mode is active, add the player's known settlements (from `aiKnownWorld`) as high-value settlement objectives even if they are player-owned, so the AI actively targets the player's cities
- [x] T022 [US3] Run tests to confirm all US1, US2, and US3 tests pass: `npm test`

**Checkpoint**: AI now transitions from exploration to aggression as its army grows. It actively seeks and attacks the player.

---

## Phase 6: User Story 4 — Spawned Unit Renders on Top of City (Priority: P2)

**Goal**: Fix the rendering bug where newly spawned units' animated sprites appear at the wrong position because the idle animation's `baseY` is captured before the unit's tile position is set.

**Independent Test**: Queue a unit for production in a city, end the turn. The spawned unit should be immediately visible on top of the city graphic.

### Implementation for User Story 4

- [x] T023 [US4] In `UnitsRenderer.render()` in src/renderer/units.ts, after setting `container.x` and `container.y` to the tile position (line ~64-68), sync the idle animation's `baseY` by calling a new method or updating the idle state directly — ensure the `AnimationController.idles` map entry for this unit has its `baseY` set to the current `container.y`
- [x] T024 [US4] Add a public method `updateIdleBaseY(unitId: string, y: number)` to `AnimationController` in src/renderer/units.ts that updates `idles.get(unitId).baseY` to the given y value, so the idle bob oscillates around the correct position
- [x] T025 [US4] Verify the fix handles all cases in src/renderer/units.ts: (a) newly spawned units on cities, (b) units that move onto settlement tiles, (c) units already standing on settlements when game loads — all must render above the settlement graphic
- [ ] T026 [US4] Manually test: start a game, queue production in a city, end turn, confirm the new unit's animated sprite is visible on top of the city

**Checkpoint**: All unit sprites render correctly on top of settlements in all scenarios.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [x] T027 Run full test suite: `npm test && npm run lint`
- [ ] T028 Manual integration test: start a new game, take no actions, end turns repeatedly for 25 turns — verify AI explores, builds, captures settlements, and eventually attacks the player
- [x] T029 Verify AI turn computation stays under 100ms on a 20x20 map (existing T004 performance test)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: No blocking work — proceed to user stories
- **Phase 3 (US1 - Exploration)**: Depends on Phase 1 only
- **Phase 4 (US2 - Production)**: Depends on Phase 1 only, but benefits from US1 being done first (units move off cities)
- **Phase 5 (US3 - Aggression)**: Depends on US1 and US2 (needs units that move and an army to count)
- **Phase 6 (US4 - Render Fix)**: Independent — can be done in parallel with any AI phase (different file: units.ts vs ai.ts)
- **Phase 7 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Exploration)**: Independent — no dependencies on other stories
- **US2 (Production)**: Logically depends on US1 (units need to move off cities to unblock spawning), but implementation can proceed independently
- **US3 (Aggression)**: Depends on US1 + US2 — needs exploration objectives and a built army to trigger aggression mode
- **US4 (Render Fix)**: Fully independent — modifies src/renderer/units.ts, no overlap with AI files

### Parallel Opportunities

- **US4 can run in parallel with US1/US2/US3** — entirely different files (units.ts vs ai.ts + scoring.ts)
- **Within US1**: T002, T003, T004, T005 (tests) can all run in parallel
- **Within US2**: T010, T011, T012 (tests) can all run in parallel
- **Within US3**: T016, T017, T018 (tests) can all run in parallel

---

## Parallel Example: User Story 1 + User Story 4

```bash
# These can be launched simultaneously (different files):
# Agent 1: US1 exploration objectives in src/game/ai/ai.ts
Task: T002-T009 (AI exploration)

# Agent 2: US4 render fix in src/renderer/units.ts
Task: T023-T026 (idle baseY sync)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify baseline
2. Complete Phase 3: US1 — AI explores and moves
3. **STOP and VALIDATE**: AI units should move every turn
4. This alone makes the game significantly more challenging

### Incremental Delivery

1. US1 (Exploration) → AI moves and discovers map → Validate
2. US2 (Production) → AI builds army → Validate
3. US3 (Aggression) → AI attacks player → Validate
4. US4 (Render Fix) → Spawned units visible → Validate (can be done anytime)
5. Polish → Full integration test

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- US4 is fully independent from US1-US3 and can be done at any point
- US3 is the only story with hard dependencies on other stories (needs army from US2 and movement from US1)
- The AI's existing `Objective` interface already supports `'explore'` type — no type changes needed
- The rendering fix is positional (baseY sync), not z-order — the container hierarchy is correct
- Commit after each completed user story phase
