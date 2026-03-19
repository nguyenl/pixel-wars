# Tasks: Strategic AI Overhaul & Game Enhancements

**Input**: Design documents from `/specs/013-strategic-ai-overhaul/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/types-delta.md ✅

**Tests**: Included — constitution (Principle II) mandates test-first development.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend shared type definitions that all three stories depend on.

- [X] T001 Add `captureProgress: number` and `capturingUnit: string | null` fields to `Settlement` interface in `src/game/types.ts`
- [X] T002 Add `GameStats` interface (`unitsProduced`, `unitsLost`, `totalIncomeEarned`, `citiesAtEnd`) to `src/game/types.ts`
- [X] T003 Add `gameStats: Record<PlayerId, GameStats>` field to `GameState` interface in `src/game/types.ts`
- [X] T004 Extend `ObjectiveType` union with `'block-capture'` and `'defend'` in `src/game/types.ts`
- [X] T005 Initialize `captureProgress: 0, capturingUnit: null` on all settlements in `createGameState` in `src/game/state.ts`
- [X] T006 Initialize `gameStats` with zero-value `GameStats` for both players in `createGameState` in `src/game/state.ts`

**Checkpoint**: All new types defined and initialized — all three user stories can now proceed in parallel.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No additional foundational work beyond Phase 1 — existing codebase provides all infrastructure.

**⚠️ CRITICAL**: Phase 1 MUST be complete before any user story begins.

---

## Phase 3: User Story 1 — Two-Turn City Capture with Progress Indicator (Priority: P1) 🎯 MVP

**Goal**: Cities require two consecutive turns of occupation before ownership transfers. A visual progress bar is shown on cities under active capture.

**Independent Test**: Move a player unit onto a neutral city. Verify: (1) after end-turn, city is NOT captured and a progress bar appears; (2) after the second end-turn, ownership transfers; (3) if the unit moves away between turns, progress resets and indicator disappears.

### Tests for User Story 1

> **Write these tests FIRST — they MUST FAIL before implementation begins**

- [X] T007 [P] [US1] Write failing tests for two-turn capture logic (increment, reset on unit leave, reset on unit destruction, ownership transfer on turn 2) in `tests/unit/capture.test.ts`
- [X] T008 [P] [US1] Write failing tests for capture progress indicator visibility (shown at progress=1, hidden at progress=0) in `tests/unit/capture.test.ts`

### Implementation for User Story 1

- [X] T009 [US1] Rewrite `resolveCaptures` in `src/game/turns.ts` to: (a) detect foreign unit on settlement tile, (b) increment `captureProgress` if `capturingUnit` matches current occupant, (c) reset to `{captureProgress:0, capturingUnit:null}` if occupant changed or tile is empty, (d) transfer ownership and reset when `captureProgress` reaches 2 (depends on T001, T005)
- [X] T010 [US1] Add progress indicator rendering in `src/renderer/renderer.ts`: draw a PixiJS `Graphics` horizontal bar above any settlement where `captureProgress === 1`, colored by capturing unit's owner (blue=player1, red=player2); clear bar when `captureProgress === 0` (depends on T001)

- [X] T009b [BUG] Fix `resolveCaptures` in `src/game/turns.ts`: the friendly-settlement branch was unconditionally resetting `captureProgress` to 0 even when an enemy unit was actively on the tile, preventing AI captures of player cities from ever completing. Fix: skip the reset when an enemy unit is present on the tile. Regression test added to `tests/unit/capture.test.ts`.

**Checkpoint**: US1 fully functional — two-turn capture works and visual indicator appears. Tests pass.

---

## Phase 4: User Story 2 — Strategic AI with Omniscient Vision (Priority: P2)

**Goal**: The AI sees the entire map without fog-of-war restrictions, prioritizes economy before attacking, actively blocks player city captures, and transitions to offensive only when it has both an income lead and a unit count lead.

**Independent Test**: Observe AI behavior over several turns from game start: AI should build units and capture neutral cities before attacking. When player moves toward a neutral city, AI should redirect a unit to contest it. AI should not attack until its income per turn AND military unit count both exceed the player's.

### Tests for User Story 2

> **Write these tests FIRST — they MUST FAIL before implementation begins**

- [X] T011 [P] [US2] Write failing tests for `isOffensivePhase`: returns false when AI income ≤ player income; returns false when AI income > player income but AI units ≤ player units; returns true only when both conditions hold in `tests/unit/ai-phase.test.ts`
- [X] T012 [P] [US2] Write failing tests for omniscient unit/settlement enumeration: verify AI objective builder sees ALL units and settlements regardless of fog state in `tests/unit/ai-phase.test.ts`
- [X] T013 [P] [US2] Write failing tests for block-capture objective generation: verify a `block-capture` objective is emitted when a player unit is within 3 tiles of a neutral/AI city in `tests/unit/ai-phase.test.ts`

### Implementation for User Story 2

- [X] T014 [US2] Add `isOffensivePhase(state: GameState): boolean` pure function to `src/game/ai/ai.ts` — returns true iff AI income per turn strictly > player income per turn AND AI military unit count strictly > player military unit count (depends on T003)
- [X] T015 [US2] Remove fog filtering from AI objective building in `src/game/ai/objectives.ts`: replace `aiKnownWorld`-based settlement/unit lookups with direct reads from `state.settlements` and `state.units` to implement omniscient vision (depends on T004)
- [X] T016 [US2] Add `block-capture` objective type handling in `src/game/ai/objectives.ts`: for each neutral or AI-owned city where any player unit is within 3 Chebyshev tiles, emit an `Objective{ type: 'block-capture' }` with weight = city income value × 2 (depends on T004, T015)
- [X] T017 [US2] Add `defend` objective type handling in `src/game/ai/objectives.ts`: when `isOffensivePhase` is true, designate one unit per owned AI city as a defender by assigning it an `Objective{ type: 'defend' }` targeting the nearest own city; exclude these units from offensive candidate pool (depends on T004, T014)
- [X] T018 [US2] Update `buildObjectives` in `src/game/ai/objectives.ts` to accept and use `isOffensivePhase` flag: in expansion phase, weight neutral-city and block-capture objectives highly; in offensive phase, weight enemy-city and enemy-unit objectives highly (depends on T015, T016, T017)
- [X] T019 [US2] Update `computeUtility` in `src/game/ai/scoring.ts` to accept `isOffensivePhase: boolean` and apply phase-appropriate weights: expansion phase boosts settlement/block-capture scores; offensive phase boosts enemy-unit/aggressive scores (depends on T018)
- [X] T020 [US2] Wire `isOffensivePhase` into `computeTurn` in `src/game/ai/ai.ts`: compute the flag once per turn and thread it through to `buildObjectives` and `computeUtility` calls (depends on T014, T018, T019)

**Checkpoint**: US2 fully functional — AI demonstrates phased strategy, blocks player expansion, never attacks prematurely. Tests pass.

---

## Phase 5: User Story 3 — End-Game Scoreboard (Priority: P3)

**Goal**: When the game ends (win or loss), a side-by-side scoreboard panel shows Player vs AI stats (units produced, units lost, cities at end, total income earned) before returning to the main menu.

**Independent Test**: Trigger a game-over condition (capture all opponent cities). Verify scoreboard appears within 1 second showing stats for both sides. Confirm stats are accurate by cross-checking unit counts and income earned during the game.

### Tests for User Story 3

> **Write these tests FIRST — they MUST FAIL before implementation begins**

- [X] T021 [P] [US3] Write failing tests for `GameStats` accumulation: verify `unitsProduced` increments on produce action, `unitsLost` increments when unit HP reaches 0, `totalIncomeEarned` increments at turn income collection in `tests/unit/scoreboard.test.ts`
- [X] T022 [P] [US3] Write failing test for `citiesAtEnd`: verify it is set to each player's city count at the moment `checkVictory` fires in `tests/unit/scoreboard.test.ts`

### Implementation for User Story 3

- [X] T023 [US3] Increment `gameStats[owner].unitsProduced` in `applyProduce` in `src/game/state.ts` when a unit is successfully added to the map (depends on T002, T006)
- [X] T024 [US3] Increment `gameStats[unit.owner].unitsLost` in the combat resolution path in `src/game/state.ts` when a unit's HP reaches 0 (depends on T002, T006)
- [X] T025 [US3] Increment `gameStats[playerId].totalIncomeEarned` in `startTurn` in `src/game/turns.ts` when income is collected each turn (depends on T002, T006)
- [X] T026 [US3] Set `gameStats[playerId].citiesAtEnd` for both players in `checkVictory` in `src/game/turns.ts` using current city counts at game-end moment (depends on T002, T006)
- [X] T027 [US3] Add `showScoreboard(stats: Record<PlayerId, GameStats>, winner: PlayerId)` method to `UIRenderer` in `src/renderer/ui.ts`: render a full-screen HTML overlay with side-by-side stat table (Player vs AI rows for: Units Produced, Units Lost, Cities at End, Total Income Earned), a dismiss button that invokes the existing `onReturnToMenu` callback (depends on T002, T006)
- [X] T028 [US3] Replace `showVictoryScreen` call in `src/main.ts` (or the victory phase handler in `src/renderer/renderer.ts`) with `showScoreboard`, passing `state.gameStats` and `state.winner` — scoreboard renders for both win and loss outcomes (depends on T027)

**Checkpoint**: All three user stories complete. Scoreboard appears at game end with accurate stats. Tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation pass across all stories.

- [X] T029 [P] Run `npm test && npm run lint` and fix any type errors introduced by the new Settlement fields in existing code that destructures or spreads Settlement objects
- [X] T030 [P] Verify capture progress bar is cleared correctly when a settlement transfers ownership (owner changes → `captureProgress=0` → bar should not render)
- [X] T031 Smoke test full game session: start game, observe AI expansion phase, move player toward neutral city to trigger block-capture behavior, play to end, verify scoreboard appears with correct stats

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: N/A for this feature
- **US1 (Phase 3)**: Depends on Phase 1 (T001, T005)
- **US2 (Phase 4)**: Depends on Phase 1 (T001, T004) and conceptually on US1 (block-capture uses captureProgress semantics)
- **US3 (Phase 5)**: Depends on Phase 1 (T002, T006) — fully independent of US1 and US2
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 1 — no story dependencies
- **US2 (P2)**: Depends on Phase 1; benefits from US1 being complete (block-capture objective is more meaningful when two-turn capture is live) but can be implemented/tested independently
- **US3 (P3)**: Depends only on Phase 1 — fully independent of US1 and US2

### Within Each User Story

- Tests (T007–T008, T011–T013, T021–T022) MUST be written and confirmed FAILING before implementation tasks begin
- Type changes (Phase 1) before any implementation
- Logic changes (`turns.ts`, `state.ts`) before rendering changes (`renderer.ts`, `ui.ts`)

### Parallel Opportunities

- T001, T002, T003, T004 can run in parallel (different interfaces in same file — sequence them by line to avoid conflicts; T001→T002→T003→T004 is simplest)
- T005, T006 can run in parallel after types are defined
- T007, T008 can run in parallel (same file, different test groups — write sequentially)
- T011, T012, T013 can run in parallel (different test functions in same file)
- T015, T016, T017 can run in parallel after T004 (different functions in objectives.ts)
- T021, T022 can run in parallel (different test cases)
- T023, T024, T025, T026 can run in parallel (different functions/locations)
- T029, T030 can run in parallel

---

## Parallel Example: User Story 1 (Phase 3)

```
# Write tests first (can do in parallel as two test blocks):
Task T007: capture logic tests in tests/unit/capture.test.ts
Task T008: indicator visibility tests in tests/unit/capture.test.ts

# Confirm tests FAIL, then implement:
Task T009: turns.ts capture logic  ←  no renderer dependency
Task T010: renderer.ts indicator   ←  no turns.ts dependency
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 3: User Story 1 (T007–T010)
3. **STOP and VALIDATE**: Two-turn capture and progress bar working
4. Deploy/demo

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 3 (US1) → Two-turn capture ships → Demo
3. Phase 4 (US2) → Strategic AI ships → Demo
4. Phase 5 (US3) → Scoreboard ships → Demo
5. Phase 6 → Polish pass

---

## Notes

- Constitution Principle II mandates tests-first: tests must FAIL before implementation begins
- [P] tasks = different files or non-conflicting regions, safe to parallelize
- Commit after each logical group (conventional commit format: `feat:`, `fix:`, `test:`)
- Stop at each checkpoint to validate the story independently before continuing
