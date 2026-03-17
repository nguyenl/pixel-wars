# Tasks: Alpha-Beta AI Opponent

**Input**: Design documents from `/specs/006-alpha-beta-ai/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included per Constitution Principle II (Test-First Development). Tests are written before implementation and must fail before implementation begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared types and constants needed by all user stories

- [X] T001 Add `SearchResult`, `CandidateAction`, `EvaluationWeights`, and `SearchConfig` interfaces to `src/game/types.ts`
- [X] T002 Add `AI_TIME_BUDGET_MS` (2500) and `AI_MAX_CANDIDATES` (5) constants and `DEFAULT_EVALUATION_WEIGHTS` to `src/game/constants.ts`

---

## Phase 2: Foundational — Board Evaluation Function (Blocking Prerequisite)

**Purpose**: The evaluation function is the leaf-node scorer for the search tree. All search-dependent user stories require it.

**⚠️ CRITICAL**: No search work (US1, US2, US3) can begin until this phase is complete.

### Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T003 [P] Write test: AI-advantaged board (more units, more settlements) scores positive in `tests/game/ai/evaluate.test.ts`
- [X] T004 [P] Write test: player-advantaged board scores negative in `tests/game/ai/evaluate.test.ts`
- [X] T005 [P] Write test: equal board scores near zero in `tests/game/ai/evaluate.test.ts`
- [X] T006 [P] Write test: city ownership is weighted higher than town ownership in `tests/game/ai/evaluate.test.ts`
- [X] T007 [P] Write test: material score accounts for HP-weighted unit values (damaged unit < full HP unit) in `tests/game/ai/evaluate.test.ts`
- [X] T008 [P] Write test: terminal state (all enemy cities destroyed) returns extreme positive score in `tests/game/ai/evaluate.test.ts`
- [X] T009 [P] Write test: terminal state (all AI cities destroyed) returns extreme negative score in `tests/game/ai/evaluate.test.ts`

### Implementation

- [X] T010 Implement `evaluateBoard(state: GameState, aiPlayer: PlayerId, weights: EvaluationWeights): number` in `src/game/ai/evaluate.ts`. Components: material (HP-weighted unit cost), city ownership (weight 5.0), town ownership (weight 2.0), income differential (weight 0.5), threat to enemy cities (weight 1.0), undefended settlement penalty (-1.5), low HP penalty (-0.5). Export `DEFAULT_EVALUATION_WEIGHTS`. Detect terminal states (victory/loss) and return +/-Infinity.
- [X] T011 Verify all evaluation tests (T003-T009) pass. Fix any failures.

**Checkpoint**: `evaluateBoard` is independently testable and usable — run `npm test` to verify.

---

## Phase 3: User Story 4 — AI Evaluates Board Positions Strategically (Priority: P2)

**Goal**: Validate that the evaluation function produces strategically meaningful scores — material vs. positional trade-offs, sacrifice decisions.

**Independent Test**: Create board states where material and positional advantages conflict. Verify the evaluation function distinguishes them and prefers the strategically superior position.

> **Note**: US4 is placed here because it validates the foundational evaluation work before search is built on top of it. No search dependency.

### Tests

- [X] T012 [P] [US4] Write test: sacrificing a scout (100 cost) to capture an undefended enemy city produces a higher evaluation than keeping the scout in `tests/game/ai/evaluate.test.ts`
- [X] T013 [P] [US4] Write test: board with more units but fewer settlements scores differently than board with fewer units but more settlements in `tests/game/ai/evaluate.test.ts`
- [X] T014 [P] [US4] Write test: AI units within attack range of enemy city increase the evaluation score (threat component) in `tests/game/ai/evaluate.test.ts`

### Implementation

- [X] T015 [US4] Tune evaluation weights if any US4 tests fail — adjust `DEFAULT_EVALUATION_WEIGHTS` in `src/game/constants.ts` and component logic in `src/game/ai/evaluate.ts` until all trade-off tests pass.

**Checkpoint**: Board evaluation correctly captures strategic trade-offs. Run `npm test` to verify.

---

## Phase 4: User Story 3 — AI Prioritizes Promising Moves First (Priority: P2)

**Goal**: Generate and order candidate actions for AI units so that the most promising moves (attacks, captures) are evaluated first by the search.

**Independent Test**: Create board states with multiple possible actions. Verify candidate actions are generated and sorted with kill shots and attacks before passive moves.

### Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] [US3] Write test: `generateCandidateActions` returns attack actions for units adjacent to enemies in `tests/game/ai/movegen.test.ts`
- [X] T017 [P] [US3] Write test: `generateCandidateActions` returns move actions toward objectives for units with no adjacent enemies in `tests/game/ai/movegen.test.ts`
- [X] T018 [P] [US3] Write test: `generateCandidateActions` returns produce actions for owned idle cities with sufficient funds in `tests/game/ai/movegen.test.ts`
- [X] T019 [P] [US3] Write test: kill shot actions are ordered before non-lethal attacks in `tests/game/ai/movegen.test.ts`
- [X] T020 [P] [US3] Write test: attack actions are ordered before move-only actions in `tests/game/ai/movegen.test.ts`
- [X] T021 [P] [US3] Write test: hold position (no-op) is always included as a candidate in `tests/game/ai/movegen.test.ts`
- [X] T022 [P] [US3] Write test: number of candidates per unit does not exceed `maxCandidatesPerUnit` from `SearchConfig` in `tests/game/ai/movegen.test.ts`
- [X] T023 [P] [US3] Write test: units with no movement points and no attack targets return only hold position in `tests/game/ai/movegen.test.ts`

### Implementation

- [X] T024 [US3] Implement `generateCandidateActions(state: GameState, unitId: string, config: SearchConfig): CandidateAction[]` in `src/game/ai/movegen.ts`. For each AI unit, generate up to `config.maxCandidatesPerUnit` candidate actions: (1) kill shots scored highest, (2) attacks sorted by expected damage minus counterattack risk, (3) moves toward objectives using existing `computeUtility` from `scoring.ts` and `reachableMap`/`findPath` from `pathfinding.ts`, (4) produce actions at cities, (5) hold position as baseline. Sort by `orderScore` descending, truncate to top-K.
- [X] T025 [US3] Implement `generateAllUnitActions(state: GameState, playerId: PlayerId, config: SearchConfig): CandidateAction[][]` in `src/game/ai/movegen.ts`. Returns an array of candidate action lists, one per unit belonging to `playerId`. Units sorted by strategic priority: units adjacent to enemies first, then by distance to nearest objective. Export `sortUnitsByPriority` helper for deterministic unit ordering in the search tree.
- [X] T026 [US3] Verify all move generation tests (T016-T023) pass. Fix any failures.

**Checkpoint**: Move generation produces correctly ordered candidate actions. Run `npm test` to verify.

---

## Phase 5: User Story 1 — AI Makes Competitive Decisions Within Time Limit (Priority: P1) 🎯 MVP

**Goal**: The core alpha-beta search with time budget. The AI evaluates multi-turn consequences and completes its turn within the configured time limit.

**Independent Test**: Run `computeTurn` on a game state with multiple units. Verify it returns actions within 2.5 seconds and that the actions reflect look-ahead reasoning (e.g., avoiding traps).

### Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T027 [P] [US1] Write test: `alphaBeta` at depth 1 returns the action with highest immediate evaluation in `tests/game/ai/search.test.ts`
- [X] T028 [P] [US1] Write test: `alphaBeta` at depth 2+ avoids a move that looks good immediately but leads to unit loss on opponent's response in `tests/game/ai/search.test.ts`
- [X] T029 [P] [US1] Write test: `search` completes within `timeBudgetMs` on a 10x10 board with 4 units per side in `tests/game/ai/search.test.ts`
- [X] T030 [P] [US1] Write test: `search` completes within `timeBudgetMs` on a 20x20 board with 10 units per side in `tests/game/ai/search.test.ts`
- [X] T031 [P] [US1] Write test: `SearchResult.bestActions` are all valid — each applies successfully via `applyAction` in sequence in `tests/game/ai/search.test.ts`
- [X] T032 [P] [US1] Write test: `search` returns fallback heuristic actions when `timeBudgetMs` is set to 1ms (too short for any search) in `tests/game/ai/search.test.ts`
- [X] T033 [P] [US1] Write test: `search` on a board with no AI units returns empty bestActions in `tests/game/ai/search.test.ts`
- [X] T034 [P] [US1] Write test: alpha-beta pruning reduces nodes evaluated compared to full minimax (no pruning) on the same board state in `tests/game/ai/search.test.ts`

### Implementation

- [X] T035 [US1] Implement `alphaBeta(state: GameState, depth: number, alpha: number, beta: number, isMaximizing: boolean, aiPlayer: PlayerId, config: SearchConfig, deadline: number): { score: number; actions: Action[] }` in `src/game/ai/search.ts`. Core minimax with alpha-beta pruning. At depth 0 or terminal state, call `evaluateBoard`. Otherwise, generate candidate actions via `generateCandidateActions`/`generateAllUnitActions`, apply each via `applyAction`, recurse. Prune when alpha >= beta. Check `performance.now() >= deadline` at each node expansion and abort if exceeded.
- [X] T036 [US1] Implement `search(state: GameState, config: SearchConfig): SearchResult` in `src/game/ai/search.ts`. Iterative deepening wrapper: start at depth 1, increment depth each iteration. Each iteration runs `alphaBeta`. Track `bestActions` from the deepest fully completed iteration. If time expires mid-iteration, discard that iteration's partial result and return previous iteration's result. If depth 1 doesn't complete, call fallback heuristic. Populate `SearchResult` fields: `bestActions`, `searchDepth`, `nodesEvaluated`, `timeElapsedMs`, `usedFallback`.
- [X] T037 [US1] Implement `heuristicFallback(state: GameState): Action[]` in `src/game/ai/search.ts`. Extracts the greedy objective-based move generation logic from the current `computeTurn` in `src/game/ai/ai.ts` (buildObjectives → assign units → decideUnitActions). This ensures the AI always produces actions even if search time is exhausted.
- [X] T038 [US1] Modify `computeTurn(state: GameState): Action[]` in `src/game/ai/ai.ts` to use the new search. Replace the greedy logic with: (1) `updateKnownWorld(state)`, (2) `search(state, defaultConfig) → SearchResult`, (3) return `SearchResult.bestActions` concatenated with `EndTurnAction`. Preserve the existing `computeTurn` function signature. **Note**: The game loop (`src/game/turns.ts`) required a fix — see T054.
- [X] T039 [US1] Verify all search tests (T027-T034) pass. Fix any failures.

### Integration Tests

- [X] T040 [US1] Update existing tests in `tests/game/ai.test.ts`: verify `computeTurn` still returns non-empty action list ending with EndTurnAction, all actions pass `applyAction` validation, and execution completes within `AI_TIME_BUDGET_MS`.
- [X] T041 [US1] Add integration test in `tests/game/ai.test.ts`: on a board where AI infantry is adjacent to a weak enemy scout (1 HP), verify the AI attacks it (kill shot detection through search).
- [X] T042 [US1] Add integration test in `tests/game/ai.test.ts`: on a board with idle AI cities and sufficient funds, verify `computeTurn` includes at least one produce action.

**Checkpoint**: Alpha-beta AI makes competitive decisions within time budget. This is the MVP. Run `npm test && npm run lint` to validate.

---

## Phase 6: User Story 2 — AI Searches Deeper When Time Allows (Priority: P2)

**Goal**: Validate that iterative deepening adapts search depth to board complexity and always uses the best completed iteration.

**Independent Test**: Compare `SearchResult.searchDepth` on simple vs. complex boards. Simple boards should achieve deeper search within the same time budget.

> **Note**: The iterative deepening mechanism is implemented in T036 (US1). This phase validates its adaptive behavior with targeted tests.

### Tests

- [X] T043 [P] [US2] Write test: `search` on a simple board (2 units per side, 10x10) achieves `searchDepth >= 4` within default time budget in `tests/game/ai/search.test.ts`
- [X] T044 [P] [US2] Write test: `search` on a complex board (8+ units per side, 20x20) achieves `searchDepth >= 1` within default time budget in `tests/game/ai/search.test.ts`
- [X] T045 [P] [US2] Write test: `searchDepth` on a simple board is greater than `searchDepth` on a complex board (same time budget) in `tests/game/ai/search.test.ts`
- [X] T046 [P] [US2] Write test: when time budget expires mid-iteration, `SearchResult.bestActions` matches the previous fully completed iteration's result (not the partial one) in `tests/game/ai/search.test.ts`

### Implementation

- [X] T047 [US2] If any US2 tests fail, adjust the iterative deepening loop in `src/game/ai/search.ts` — tune time check frequency, move generation budget, or candidate count to ensure adaptive depth behavior. Verify all US2 tests pass.

**Checkpoint**: Iterative deepening adapts to board complexity. Run `npm test` to verify.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, performance validation, and cleanup

- [X] T048 [P] Add edge case test in `tests/game/ai/search.test.ts`: AI with no units and no cities returns empty actions (game should be over)
- [X] T049 [P] Add edge case test in `tests/game/ai/search.test.ts`: AI with units but no legal moves (all moved/attacked, cities producing) returns empty actions promptly without consuming full time budget
- [X] T050 [P] Add edge case test in `tests/game/ai/search.test.ts`: first turn (1 unit, 1 city) produces at least a produce action and a move action
- [X] T051 [P] Add edge case test in `tests/game/ai/evaluate.test.ts`: evaluation only considers AI's known world (`aiKnownWorld`), not hidden tiles/units (FR-007 fog of war compliance)
- [X] T052 Run full test suite (`npm test && npm run lint`) and fix any regressions in existing tests caused by `computeTurn` changes
- [X] T053 Run quickstart.md validation: `npm install && npm run dev` — manually verify AI plays a full game, makes moves within time budget, and game renders correctly
- [X] T054 **BUG FIX**: `endTurn()` in `src/game/turns.ts` did not call `startTurn` for player2 (AI). This meant AI units were never reset (movementPoints, hasAttacked), AI production never spawned, and AI never collected income after turn 1. Fixed by calling `startTurn` for player2 inside `endTurn()` and overriding phase to `'ai'`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types/constants) — BLOCKS all search-dependent stories
- **US4 (Phase 3)**: Depends on Phase 2 (evaluation function) — validates evaluation quality
- **US3 (Phase 4)**: Depends on Phase 1 (types) — can run in parallel with Phase 3
- **US1 (Phase 5)**: Depends on Phase 2 (evaluate) AND Phase 4 (movegen) — the core search MVP
- **US2 (Phase 6)**: Depends on Phase 5 (search implementation) — validates adaptive depth
- **Polish (Phase 7)**: Depends on Phases 5 and 6

### User Story Dependencies

```
Phase 1 (Setup)
    │
    v
Phase 2 (Foundational: evaluate.ts)
    │
    ├──────────────────┐
    v                  v
Phase 3 (US4)    Phase 4 (US3: movegen.ts)
    │                  │
    │                  v
    └────────> Phase 5 (US1: search.ts + ai.ts integration) 🎯 MVP
                       │
                       v
               Phase 6 (US2: iterative deepening validation)
                       │
                       v
               Phase 7 (Polish)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation follows test-first order
- Verify all tests pass before marking phase complete

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel (different files)
- **Phase 2**: All test tasks (T003-T009) can run in parallel (same test file, independent test cases)
- **Phase 3 & 4**: US4 (evaluation validation) and US3 (move generation) can run in parallel — they touch different files
- **Phase 5**: All test tasks (T027-T034) can run in parallel
- **Phase 6**: All test tasks (T043-T046) can run in parallel
- **Phase 7**: All edge case tests (T048-T051) can run in parallel

---

## Parallel Example: Phase 5 (User Story 1)

```bash
# Launch all US1 search tests together (they test independent behaviors):
Task: "T027 alphaBeta depth-1 returns best immediate action"
Task: "T028 alphaBeta depth-2 avoids traps"
Task: "T029 search completes within budget on 10x10"
Task: "T030 search completes within budget on 20x20"
Task: "T031 bestActions all valid via applyAction"
Task: "T032 fallback on 1ms budget"
Task: "T033 no AI units returns empty"
Task: "T034 pruning reduces node count"

# Then implement sequentially (each depends on previous):
Task: "T035 Implement alphaBeta"
Task: "T036 Implement search (iterative deepening)"
Task: "T037 Implement heuristicFallback"
Task: "T038 Modify computeTurn"
Task: "T039 Verify all tests pass"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + constants)
2. Complete Phase 2: Foundational (evaluation function)
3. Complete Phase 4: US3 (move generation — required by search)
4. Complete Phase 5: US1 (alpha-beta search + integration)
5. **STOP and VALIDATE**: Run `npm test && npm run lint`. Play a game via `npm run dev`.
6. The AI now uses alpha-beta search with time budget — core feature is functional.

### Incremental Delivery

1. Setup + Foundational → Evaluation function works
2. Add US4 → Evaluation quality validated (trade-off tests pass)
3. Add US3 → Move generation with ordering works
4. Add US1 → **Full alpha-beta AI is live (MVP!)**
5. Add US2 → Iterative deepening depth adaptation validated
6. Polish → Edge cases, regression fixes, manual validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US4 (evaluation) is placed before US3 (move generation) because it validates the foundational work, even though both are P2
- US3 (move generation) must complete before US1 (search) because the search depends on move generation
- The existing `computeTurn` function signature is preserved — however `endTurn()` in `turns.ts` required a fix to call `startTurn` for player2 (see T054)
- Constitution Principle II requires Red-Green-Refactor: write failing tests → implement → verify pass
