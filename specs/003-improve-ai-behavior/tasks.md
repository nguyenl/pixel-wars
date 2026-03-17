# Tasks: Improve AI Behavior

**Input**: Design documents from `/specs/003-improve-ai-behavior/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Included per Constitution Principle II (Test-First Development). Tests MUST fail before the fix is applied, then pass after.

**Organization**: Tasks are grouped by user story. The foundational phase contains the core bug fix that unblocks all four user stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Confirm baseline state before any changes.

- [x] T001 Run `npm test` on current branch and record which tests exist and pass — establishes baseline before any changes

---

## Phase 2: Foundational — Red Phase (Tests First)

**Purpose**: Write all failing tests before touching production code. Each test must fail on the current broken codebase. This is the core testing foundation for all four user stories.

**⚠️ CRITICAL**: All tests in this phase MUST fail before Phase 3 begins. Do not proceed to Phase 3 until you have confirmed the red phase is complete.

- [x] T002 Create `tests/ai.test.ts` with test scaffold: import `computeTurn` from `src/game/ai/ai.ts` and `applyAction` from `src/game/state.ts`; write a `makeAiTurnState()` helper that returns a fresh `GameState` with `phase: 'ai'`, `currentPlayer: 'player2'`, the AI owning one city and one scout unit at starting position with 200 funds

- [x] T003 [P] Write failing test in `tests/ai.test.ts`: `computeTurn()` returns at least one action of type `'produce'` when AI has ≥100 funds and at least one city with no active production queue

- [x] T004 [P] Write failing test in `tests/ai.test.ts`: every action returned by `computeTurn()` applies successfully via `applyAction()` — i.e., `result.ok === true` for each action

- [x] T005 [P] Write failing test in `tests/ai.test.ts`: after sequentially applying all actions returned by `computeTurn()` to the state, at least one AI-owned unit occupies a different `{row, col}` tile than its starting position

- [x] T006 [P] Write failing test in `tests/ai.test.ts`: `computeTurn()` returns at least one action of type `'attack'` when an AI scout is placed adjacent (Chebyshev distance 1) to a weaker player unit

- [x] T007 Run `npm test` — confirm **all four new tests fail** (red phase complete). Do not proceed to Phase 3 until this is confirmed

---

## Phase 3: Foundational — Green Phase (Core Fix)

**Purpose**: Apply the minimal fix that makes all Phase 2 tests pass. No other production code changes until tests are green.

**⚠️ CRITICAL**: No user story phases can begin until this phase is complete and `npm test` shows all Phase 2 tests passing.

- [x] T008 Fix phase gate in `src/game/state.ts`: in the `applyAction()` switch, for the `'move'`, `'attack'`, and `'produce'` cases, change the phase check from `state.phase !== 'orders'` to `state.phase !== 'orders' && state.phase !== 'ai'` — three lines changed in total

- [x] T009 Run `npm test` — confirm **all four tests from Phase 2 now pass** (green phase complete)

- [x] T010 [P] Add action failure logging in `src/game/ai/ai.ts`: in `applyActionSafe()`, after validation failure, add `console.warn('[AI] Move/Attack/Produce rejected:', action, err)`

- [x] T011 [P] Add error logging in `src/main.ts`: in the AI action loop where `result.ok === false`, add `console.error('[AI] Unexpected action failure:', action, result);`

**Checkpoint**: Phase gate fix applied. All foundational tests pass. Dev logging in place. User story verification can now begin.

---

## Phase 4: User Story 1 — AI Produces Units (Priority: P1) 🎯 MVP

**Goal**: AI queues unit production in idle cities and new units appear on the map over time.

**Independent Test**: Start a new game, press End Turn 3 times without any player actions. At least one new AI unit should appear on the map (in addition to its starting scout).

- [x] T012 [US1] Run `npm test` — confirm the `'produce'` action test (T003) passes and the AI's production action applies cleanly with no error

- [ ] T013 [US1] Manual verification per `quickstart.md`: start game in browser (`npm run dev`), press End Turn 3 times, confirm a second AI unit is visible on the map — meets SC-001

**Checkpoint**: User Story 1 complete. AI production is verified automated and manually.

---

## Phase 5: User Story 2 — AI Moves Units (Priority: P1)

**Goal**: Every AI unit moves toward a meaningful objective each turn. No AI unit remains stationary when it has movement points.

**Independent Test**: Start a new game, press End Turn once. Every AI unit should be on a different tile than its starting position.

- [x] T014 [US2] Run `npm test` — confirm the unit position change test (T005) passes and the `applyAction()` success test (T004) passes

- [ ] T015 [US2] Manual verification per `quickstart.md`: start game, press End Turn, observe AI scout moving across the map with visible movement animation — meets SC-002

**Checkpoint**: User Story 2 complete. AI movement is verified automated and manually.

---

## Phase 6: User Story 3 — AI Attacks Player Units (Priority: P2)

**Goal**: AI units attack player units when the engagement is tactically sound.

**Independent Test**: Position a player unit adjacent to an AI unit (via cheating or a test state), press End Turn. The AI should initiate an attack.

- [x] T016 [US3] Run `npm test` — confirm the attack action test (T006) passes

- [ ] T017 [US3] Manual verification: move a player scout adjacent to an AI unit, press End Turn, confirm the AI attacks (combat animation plays and unit HP changes) — meets SC-004

**Checkpoint**: User Story 3 complete. AI combat engagement is verified automated and manually.

---

## Phase 7: User Story 4 — AI Captures Settlements (Priority: P2)

**Goal**: AI units move onto unowned settlements, which then change ownership to the AI.

**Independent Test**: Skip 5 turns without acting. Use a scout to explore AI territory. At least one neutral settlement near the AI's start should be AI-owned.

- [x] T018 [US4] Write test in `tests/ai.test.ts`: inject a neutral town on the AI scout's tile; call `endAiTurn()` directly; assert the town's owner becomes `'player2'` — tests capture mechanic (SC-003)

- [x] T019 [US4] Run `npm test` — confirm T018 passes (capture is handled by existing `resolveCaptures()` logic once movement works; no additional fix expected)

- [ ] T020 [US4] Manual verification: start game, press End Turn 5 times, scout near AI starting city, confirm at least one nearby town shows as AI-owned — meets SC-003

**Checkpoint**: All four user stories complete. Full AI turn loop (produce → move → attack → capture) is functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, lint, and passive-player loss scenario.

- [x] T021 Run full test suite and lint: `npm test && npm run lint` — zero failures, zero regressions across all existing and new tests

- [ ] T022 [P] Open browser DevTools console during AI turn — confirm **no** `[AI] Action rejected:` warnings appear during normal gameplay (validates T010 logging is silent when AI works correctly)

- [ ] T023 [P] Manual end-to-end SC-005: start a new game, press End Turn repeatedly without any player actions, confirm the AI wins the game within 30 turns (player loses all cities)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Red Phase)**: Depends on Phase 1 — write all tests before any code changes
- **Phase 3 (Green Phase)**: Depends on Phase 2 — fix only after all tests are confirmed failing
- **Phases 4–7 (User Stories)**: All depend on Phase 3 completion; can be worked in order P1 → P1 → P2 → P2
- **Phase 8 (Polish)**: Depends on all user story phases

### User Story Dependencies

- **US1 (Production, P1)**: No dependency on other user stories
- **US2 (Movement, P1)**: No dependency on other user stories
- **US3 (Attack, P2)**: Logically depends on US2 (AI must move before it can attack), but tests independently pass
- **US4 (Capture, P2)**: Logically depends on US2 (capture requires movement), but tests independently pass

### Within Each Phase

- Tests (T002–T006) MUST be written and confirmed failing before T008 is applied
- T008 is the only production code change that unblocks all four user stories
- T010 and T011 are independent logging additions (marked [P])
- Each user story phase has one automated verification task and one manual task

### Parallel Opportunities

- T003, T004, T005, T006 — all write to `tests/ai.test.ts` sections; write sequentially (same file)
- T010 and T011 — different files, can be done in parallel after T009
- T022 and T023 — manual checks, independent, can be done in parallel

---

## Parallel Example: Phase 2 (Test Writing)

```bash
# T002 first (scaffold/helper) — then T003–T006 in order (all same file):
Write makeAiTurnState() helper
Write produce action test
Write applyAction success test
Write unit position change test
Write attack action test
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Baseline check
2. Complete Phase 2: Write all failing tests (red)
3. Complete Phase 3: Apply phase gate fix (green) — **this single fix unlocks all behavior**
4. Complete Phase 4: Verify AI production (US1) ← MVP milestone
5. Complete Phase 5: Verify AI movement (US2) ← MVP milestone
6. **STOP and VALIDATE**: The AI is now a functional opponent

### Full Delivery

7. Complete Phase 6: Verify AI attacks (US3)
8. Complete Phase 7: Verify AI captures (US4)
9. Complete Phase 8: Polish and end-to-end validation

### Key Insight

The entire fix is **one change in one function** (`applyAction()` in `state.ts`, ~3 lines). All four user stories are unblocked by this single fix because the AI logic for production, movement, attack, and capture was already implemented — it just couldn't execute due to the phase gate rejecting every generated action.

---

## Notes

- [P] tasks = different files or fully independent — safe to parallelize
- Each user story phase is independently verifiable via its manual test
- Constitution II (Test-First): Tests in Phase 2 MUST fail before Phase 3 begins
- Constitution I (Simplicity First): The fix is ~3 lines; no new abstractions required
- Commit after T009 (green phase), after each user story verification, and after T021 (clean lint)
- If any user story phase reveals latent bugs in the existing AI logic, fix them within that story's phase before moving to the next
