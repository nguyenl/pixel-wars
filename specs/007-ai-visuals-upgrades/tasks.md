# Tasks: AI Visuals, Map Expansion & Settlement Upgrades

**Input**: Design documents from `/specs/007-ai-visuals-upgrades/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — plan.md specifies test files as deliverables (tests/upgrade.test.ts, tests/mapgen.test.ts, tests/ai.test.ts).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project already exists with all dependencies and tooling in place.

*No tasks — project structure, TypeScript, PixiJS, Vitest, and linting are already configured.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No new foundational infrastructure needed. All user stories modify existing files and follow established patterns (action validation/application, PixiJS rendering, constants).

*No tasks — existing codebase provides all required infrastructure.*

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — AI Turn Visibility (Priority: P1) :dart: MVP

**Goal**: Animate AI unit movements and attacks sequentially during the AI's turn so the player can see every action the AI takes.

**Independent Test**: Start a game, end your turn, and observe each AI unit animating along its movement path one at a time. Attacks animate after movement completes. Death animations play for destroyed units. Player input is locked until all AI actions finish.

### Implementation for User Story 1

- [x] T001 [US1] Refactor `runAiTurn()` in src/main.ts to use callback-based sequential animation playback — after `computeTurn()` returns actions, iterate through each action: apply it via `applyAction()`, trigger the corresponding animation (`animateMove` for move actions, `animateAttack` for attack actions) on the renderer, and wait for the animation's `onComplete` callback before proceeding to the next action; after all actions complete, call `endAiTurn()` to transition back to the player's turn
- [x] T002 [P] [US1] Lock player input during AI turn phase in src/input/input.ts — guard `handleTileClick()` and hover handlers to no-op when `state.phase === 'ai'`; disable the End Turn button in src/renderer/ui.ts during the AI phase
- [x] T003 [US1] Activate `playDeath()` animation in src/renderer/renderer.ts during AI attack actions — when an attack action results in a unit being destroyed (HP reaches 0), play the death animation on the defeated unit's sprite after the attack animation completes, then remove the sprite before proceeding to the next action

**Checkpoint**: AI units visually animate their moves, attacks, and kills. Player can follow each action sequentially.

---

## Phase 4: User Story 2 — AI Thinking Indicator (Priority: P2)

**Goal**: Display a visual "thinking" indicator while the AI computes its moves, powered by a Web Worker to keep the UI responsive during the up-to-5-second computation window.

**Independent Test**: End your turn and verify a thinking indicator (pulsing text or spinner) appears during AI computation. The UI remains responsive (no freezing). When computation finishes, the indicator disappears and AI actions begin animating.

### Implementation for User Story 2

- [x] T004 [P] [US2] Create Web Worker file src/game/ai/ai.worker.ts — import `computeTurn` from `./ai`, listen for `message` events containing serialized `GameState`, run `computeTurn(state)`, post the resulting `Action[]` array back via `postMessage`; ensure all game logic imports are Worker-compatible (no DOM/PixiJS dependencies)
- [x] T005 [P] [US2] Add thinking indicator overlay to src/renderer/renderer.ts — create `showThinkingIndicator()` and `hideThinkingIndicator()` methods that render/remove a PixiJS text element ("AI is thinking...") with a pulsing alpha animation centered on the stage, drawn above the game layer
- [x] T006 [US2] Integrate Web Worker into AI turn flow in src/main.ts — instantiate the Worker (from `ai.worker.ts`), when AI turn begins: show thinking indicator via renderer, post game state to Worker; on Worker `message` response: hide thinking indicator, feed the returned actions into the sequential animation pipeline from T001; handle Worker errors gracefully (fall back to main-thread `computeTurn` if Worker fails)

**Checkpoint**: Thinking indicator appears during AI computation. UI stays responsive. Indicator disappears when actions begin animating.

---

## Phase 5: User Story 3 — Distinct Settlement & City Visuals (Priority: P3)

**Goal**: Replace the current colored diamond shapes with recognizable city and town building graphics so players can distinguish settlement types at a glance.

**Independent Test**: Start a new game and visually verify that cities display multi-building silhouettes (3-4 buildings with a central tower) and towns display small house clusters (2 houses with triangular roofs). Owner colors remain visible as borders/outlines. Cities and towns are clearly distinct from each other.

### Implementation for User Story 3

- [x] T007 [US3] Replace city settlement rendering in src/renderer/tilemap.ts — remove the existing diamond drawing code for cities and draw a cluster of 3-4 rectangles of varying height with one taller central tower using PixiJS Graphics API; fill with neutral building tone (e.g., 0x888888); apply owner-color border/outline (player1: 0x4488ff, player2: 0xff4444, neutral: 0xaaaaaa); city graphic occupies ~60% of tile width, centered on tile
- [x] T008 [US3] Replace town settlement rendering in src/renderer/tilemap.ts — remove the existing diamond drawing code for towns and draw 2 small triangular-roof houses side by side using PixiJS Graphics API; fill with neutral building tone; apply same owner-color border scheme; town graphic occupies ~40% of tile width, centered on tile, visually smaller than city

**Checkpoint**: Cities and towns are visually distinct and recognizable on the map. Owner colors remain visible.

---

## Phase 6: User Story 4 — Larger Maps (Priority: P4)

**Goal**: Double all map dimensions for more expansive and strategic gameplay.

**Independent Test**: Select each map size option and verify: small generates 20x20, medium generates 30x30, large generates 40x40. Settlements are distributed proportionally across the larger area. Terrain features appear at appropriate scale.

### Implementation for User Story 4

- [x] T009 [US4] Update `MAP_SIZE_CONFIG` in src/game/constants.ts — change dimensions to small: 20x20, medium: 30x30, large: 40x40
- [x] T010 [US4] Update map generation parameters in src/game/mapgen.ts — scale minimum settlement separation distances (small: 5, medium: 7, large: 9), update town count ranges (small: 6-8, medium: 10-12, large: 16-20), scale starting city separation proportionally (1.5x new minimum separation), reduce noise frequency (e.g., 0.15 to 0.10) to maintain terrain feature size on larger maps, increase MAX_GEN_ATTEMPTS if needed for stricter placement constraints
- [x] T011 [P] [US4] Update map size labels in src/renderer/ui.ts — change main menu button text to "Small 20x20", "Medium 30x30", "Large 40x40"
- [x] T012 [US4] Update map generation tests in tests/mapgen.test.ts — adjust assertions for doubled map dimensions, scaled settlement counts, and updated separation distances

**Checkpoint**: All three map sizes generate at doubled dimensions with proportionally distributed settlements and well-scaled terrain.

---

## Phase 7: User Story 5 — Upgrade Settlement to City (Priority: P5)

**Goal**: Allow players (and AI) to upgrade a town they own into a city for $500, granting city-level income, unit production capability, and increased vision range.

**Independent Test**: Capture a town, accumulate $500+, select the town, click "Upgrade to City ($500)". Verify: town becomes a city, $500 deducted, city visual appears immediately, city generates $100/turn (up from $50), and unit production becomes available. Verify upgrade button is hidden/disabled when funds < $500 or settlement is already a city.

### Implementation for User Story 5

- [x] T013 [P] [US5] Add `UpgradeAction` type to src/game/types.ts — define `interface UpgradeAction { type: 'upgrade'; settlementId: string }`, add to the `Action` union type; add `'settlement-not-town'` and `'not-owner'` to `ActionError` union if not already present
- [x] T014 [P] [US5] Add upgrade constants to src/game/constants.ts — `UPGRADE_COST = 500` and `AI_UPGRADE_THRESHOLD = 600` (minimum AI gold to consider upgrading = upgrade cost + cheapest unit cost)
- [x] T015 [US5] Implement upgrade validation and application in src/game/rules.ts — add `validateUpgrade(state, action)` checking: phase is 'orders' or 'ai', settlement exists, settlement type is 'town', settlement owner matches current player, player funds >= UPGRADE_COST; extend `applyAction()` to handle 'upgrade' actions: change `settlement.type` from 'town' to 'city', deduct UPGRADE_COST from player funds, recompute fog of war (city vision range 3 vs town vision range 2)
- [x] T016 [P] [US5] Add "Upgrade to City ($500)" button to settlement info panel in src/renderer/ui.ts — display only when selected settlement is a player-owned town during the 'orders' phase; show disabled state with "Insufficient funds" text if player gold < 500; hide for cities and non-owned settlements
- [x] T017 [US5] Handle upgrade action dispatch in src/input/input.ts — wire the upgrade button click to create `{ type: 'upgrade', settlementId }` and dispatch via `applyAction()`; update `handleTileClick()` to show the upgrade button (instead of production menu) when clicking a player-owned town
- [x] T018 [US5] Add AI upgrade heuristic to src/game/ai/ai.ts in `computeTurn()` — evaluate before unit action computation: if AI funds >= AI_UPGRADE_THRESHOLD and AI owns at least one town, select the most strategically valuable town to upgrade (prioritize towns near enemy territory or when AI has fewer than 2 cities); insert the upgrade action at the beginning of the returned action list; limit to one upgrade per turn to preserve funds for unit production
- [x] T019 [US5] Write upgrade action tests in tests/upgrade.test.ts — test validation: rejects when insufficient funds, when not owner, when settlement is already a city, when wrong phase; test application: settlement type changes to 'city', player funds decrease by 500, fog of war recomputed with city vision range
- [x] T020 [US5] Update AI tests in tests/ai.test.ts — test that AI upgrade heuristic produces an upgrade action when funds >= AI_UPGRADE_THRESHOLD and a town is available; test that no upgrade is produced when funds are below threshold or no towns are owned

**Checkpoint**: Players and AI can upgrade towns to cities. All validation rules enforced. Visual updates immediately on upgrade.

---

## Phase 8: User Story 6 — Increased AI Thinking Time (Priority: P6)

**Goal**: Increase the AI's maximum computation time from 2.5 seconds to 5 seconds for deeper strategic play on larger maps.

**Independent Test**: Observe that the AI's computation phase can take up to 5 seconds on large maps before moves begin animating. The AI still proceeds immediately if it finishes before the time limit.

### Implementation for User Story 6

- [x] T021 [US6] Update `AI_TIME_BUDGET_MS` from 2500 to 5000 in src/game/constants.ts

**Checkpoint**: AI uses up to 5 seconds for computation. Iterative deepening and deadline enforcement handle the increased budget automatically.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories.

- [x] T022 Run quickstart.md validation — execute `npm test && npm run lint`, start dev server via `npm run dev`, verify all six user stories work together in a complete game session
- [x] T023 Cross-story integration verification — play a full game on a large (40x40) map verifying: AI thinking indicator shows during 5s computation, AI moves animate sequentially with death animations, cities and towns display correct graphics, upgrade works for player and AI, map generates with correct settlement distribution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks — already complete
- **Foundational (Phase 2)**: No tasks — already complete
- **User Stories (Phase 3-8)**: Can proceed immediately
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories. Modifies: src/main.ts, src/input/input.ts, src/renderer/renderer.ts, src/renderer/ui.ts
- **US2 (P2)**: Enhanced by US1 (animation pipeline to feed actions into). Modifies: src/game/ai/ai.worker.ts (new), src/renderer/renderer.ts, src/main.ts
- **US3 (P3)**: No dependencies. Modifies: src/renderer/tilemap.ts
- **US4 (P4)**: No dependencies. Modifies: src/game/constants.ts, src/game/mapgen.ts, src/renderer/ui.ts, tests/mapgen.test.ts
- **US5 (P5)**: No hard dependencies. Enhanced by US3 (city graphic appears on upgrade). Modifies: src/game/types.ts, src/game/constants.ts, src/game/rules.ts, src/renderer/ui.ts, src/input/input.ts, src/game/ai/ai.ts, tests/upgrade.test.ts, tests/ai.test.ts
- **US6 (P6)**: Best paired with US2 (Worker prevents 5s UI freeze). Modifies: src/game/constants.ts

### Recommended Implementation Order

The plan.md constitution check recommends: **US6 → US4 → US3 → US5 → US2 → US1** (simplest first, most complex last).

This ordering minimizes merge conflicts and ensures:
1. **US6** (1 task) — trivial constant change, immediate value
2. **US4** (4 tasks) — standalone constant/mapgen changes, no renderer conflicts
3. **US3** (2 tasks) — isolated renderer changes in tilemap.ts
4. **US5** (8 tasks) — largest story, touches many files but mostly in game logic
5. **US2** (3 tasks) — Worker + thinking indicator, modifies main.ts and renderer.ts
6. **US1** (3 tasks) — animation orchestration in main.ts, benefits from US2's Worker being in place

### File Conflict Map

Files modified by multiple stories (implement these stories sequentially):
- **src/main.ts**: US1 (animation playback), US2 (Worker integration) — implement US2 then US1
- **src/renderer/renderer.ts**: US1 (death animation), US2 (thinking indicator) — implement US2 then US1
- **src/renderer/ui.ts**: US1 (disable End Turn), US4 (map labels), US5 (upgrade button) — low conflict, different UI sections
- **src/game/constants.ts**: US4 (map sizes), US5 (upgrade cost), US6 (AI budget) — low conflict, different constants
- **src/input/input.ts**: US1 (lock input), US5 (upgrade dispatch) — different code sections

### Within Each User Story

- Types/constants before logic (models before services)
- Logic (rules.ts) before UI (ui.ts, input.ts)
- Core implementation before tests
- Story complete before moving to next priority

### Parallel Opportunities

Within stories:
- **US2**: T004 (Worker file) and T005 (thinking indicator) in parallel — different files
- **US4**: T011 (UI labels) in parallel with T010 (mapgen) — different files
- **US5**: T013 (types) and T014 (constants) in parallel — different files; T016 (UI) in parallel with T015 (rules) — different files

Across stories (following recommended order):
- **US6 + US4 + US3** can all proceed in parallel if desired — no file conflicts
- **US5** can overlap with US3 (no shared files except constants.ts, different constants)
- **US2 and US1** should be sequential (shared files: main.ts, renderer.ts)

---

## Parallel Example: User Story 5

```bash
# Launch types and constants in parallel (different files):
Task T013: "Add UpgradeAction type to src/game/types.ts"
Task T014: "Add upgrade constants to src/game/constants.ts"

# Then rules and UI in parallel (different files):
Task T015: "Implement validate/apply upgrade in src/game/rules.ts"
Task T016: "Add upgrade button to src/renderer/ui.ts"

# Then sequential: input → AI → tests
Task T017: "Handle upgrade dispatch in src/input/input.ts"
Task T018: "Add AI upgrade heuristic to src/game/ai/ai.ts"
Task T019: "Write upgrade tests in tests/upgrade.test.ts"
Task T020: "Update AI tests in tests/ai.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — or US6 first for quick win)

1. Complete US6 (T021) — 1 task, trivial constant change
2. Complete US1 (T001-T003) — 3 tasks, core gameplay improvement
3. **STOP and VALIDATE**: Test AI turn animation independently
4. Deploy/demo if ready

### Incremental Delivery (Recommended Order)

1. US6 → AI thinks longer (1 task)
2. US4 → Maps are bigger (4 tasks)
3. US3 → Settlements look distinct (2 tasks)
4. US5 → Upgrade mechanic works (8 tasks)
5. US2 → Thinking indicator + Worker (3 tasks)
6. US1 → AI animations visible (3 tasks)
7. Polish → Full integration (2 tasks)
8. Each increment is independently deployable and testable

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Total: 23 tasks (21 implementation + 2 polish)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
