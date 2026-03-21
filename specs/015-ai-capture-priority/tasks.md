# Tasks: AI Settlement Capture Prioritization

**Input**: Design documents from `/specs/015-ai-capture-priority/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Scope**: ~20-line change to `src/game/ai/movegen.ts` only. No new files, no new dependencies.

**Tests**: Included per project constitution (Principle II: Test-First Development).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- All tasks include exact file paths

---

## Phase 3: User Story 1 — AI Captures Adjacent Undefended Settlement (Priority: P1) 🎯 MVP

**Goal**: AI units adjacent to an undefended neutral or enemy settlement move onto it to start or advance capture. Units mid-capture (captureProgress > 0) stay to complete it.

**Independent Test**: Place one AI unit at (3,3), one neutral settlement at (3,4) with no defending unit. Run `generateCandidateActions`; confirm the move to (3,4) has `orderScore` > any non-capture move candidate.

### Tests for User Story 1 (write first — must FAIL before T003/T004)

- [x] T001 [US1] Write failing test: AI unit adjacent to undefended neutral settlement — capture move orderScore equals CAPTURE_BONUS + 1000 (~5000) and is the highest-scored move candidate in `tests/game/ai/movegen.test.ts`
- [x] T002 [US1] Write failing test: AI unit on a settlement with captureProgress > 0 — hold-position candidate orderScore equals MID_CAPTURE_HOLD_SCORE (8000) in `tests/game/ai/movegen.test.ts`

### Implementation for User Story 1

- [x] T003 [US1] Add `CAPTURE_BONUS = 4000` constant; in the move-candidate loop (`for (const [destId] of reachable)`), check if `destTile` has a `settlementId` pointing to a settlement where `owner !== unit.owner` and `unitId === null` — if so, add `CAPTURE_BONUS` to `orderScore` for that move candidate in `src/game/ai/movegen.ts`
- [x] T004 [US1] Add `MID_CAPTURE_HOLD_SCORE = 8000` constant; in the hold-position block, check if the unit's current tile has a `settlementId` with `captureProgress > 0` and `capturingUnit === unit.id` — if so, use `MID_CAPTURE_HOLD_SCORE` instead of `0` as the hold orderScore in `src/game/ai/movegen.ts`

**Checkpoint**: Run `npm test`. T001 and T002 should now pass. Manually verify: AI unit adjacent to undefended settlement moves onto it.

---

## Phase 4: User Story 2 — Capture Beats Lower-Priority Actions (Priority: P2)

**Goal**: When an AI unit can either explore/reposition or capture an adjacent undefended settlement, it always chooses capture. `CAPTURE_BONUS = 4000` dominates exploration scores (~1000–1020).

**Independent Test**: Place AI unit at (3,3) with an undefended settlement at (3,4) and an unexplored region in the opposite direction. Run `generateCandidateActions`; confirm the capture move is ranked above all non-attack, non-capture moves.

### Tests for User Story 2 (write before T003 runs — must FAIL until T003 is done)

- [x] T005 [US2] Write failing test: unit with both explore-or-reposition and capture options available — confirm capture move `orderScore` (CAPTURE_BONUS + 1000 = 5000) exceeds the best non-capture move `orderScore` (max ~1020) in `tests/game/ai/movegen.test.ts`

### Implementation for User Story 2

- [x] T006 [US2] No additional code change: `CAPTURE_BONUS = 4000` from T003 produces `orderScore = 5000` for a capture move, which exceeds exploration/repositioning scores of ~1000–1020. Confirm T005 passes after T003 — verify no edge case exists where a non-capture move exceeds 4000 in `src/game/ai/movegen.ts`

**Checkpoint**: Run `npm test`. T005 should pass. US1 and US2 acceptance scenarios are both fully satisfied by the same CAPTURE_BONUS constant.

---

## Phase 5: User Story 3 — No Duplicate Capture Assignments (Priority: P3)

**Goal**: When two or more AI units are adjacent to the same undefended settlement, only the first one gets the `CAPTURE_BONUS`; other units are scored normally and directed to other objectives.

**Independent Test**: Place two AI units at (3,3) and (3,5), one neutral settlement at (3,4). Run `generateCandidateActions` for both units; confirm only one unit's move to (3,4) gets the `CAPTURE_BONUS`.

### Tests for User Story 3 (write before T008 — must FAIL until T008 is done)

- [x] T007 [US3] Write failing test: two AI units both adjacent to the same undefended settlement — after `generateCandidateActions` for both, at most one unit's candidates include a move to that settlement with `orderScore ≥ CAPTURE_BONUS + 1000`; the other unit's best move to that tile scores ≤ 1020 in `tests/game/ai/movegen.test.ts`

### Implementation for User Story 3

- [x] T008 [US3] Add duplicate-capture guard in the move-candidate loop: after identifying `destTile` has a capturable settlement, check if `settlement.capturingUnit !== null` and `state.units[settlement.capturingUnit]?.owner === unit.owner` — if so, skip adding `CAPTURE_BONUS` (the settlement is already claimed by a friendly unit) in `src/game/ai/movegen.ts`

**Checkpoint**: Run `npm test`. T007 should pass. All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T009 Run `npm test && npm run lint`; fix any type errors, linting violations, or test failures introduced by T003/T004/T008
- [x] T010 Update the file-level JSDoc comment at the top of `src/game/ai/movegen.ts` to document the two new scoring constants (`CAPTURE_BONUS`, `MID_CAPTURE_HOLD_SCORE`) and the duplicate-capture guard

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 3 (US1)**: No blockers — start immediately
- **Phase 4 (US2)**: T005 can be written before T003 (write failing test first); T006 depends on T003 being complete
- **Phase 5 (US3)**: T007 can be written before T008; T008 has no dependency on US1/US2 changes (different code path)
- **Phase 6 (Polish)**: Depends on T003, T004, T008 completion

### User Story Dependencies

- **US1 (P1)**: No dependencies — start here
- **US2 (P2)**: Shares implementation with US1 (same `CAPTURE_BONUS` constant); T005 test can be written in parallel with T001/T002 since it targets the same scoring property
- **US3 (P3)**: Independent — the duplicate guard is a separate `if` block added around the same CAPTURE_BONUS application

### Within Each User Story

- Tests MUST be written first and MUST fail before implementation
- Hold-score fix (T004) is independent of move-bonus fix (T003) — can be committed separately
- Duplicate-capture guard (T008) builds on T003 but is a separate code path

### Parallel Opportunities

- T001 and T002 (both test tasks for US1) can be written in a single pass since they're in the same file
- T003 and T004 modify different parts of `movegen.ts` (move loop vs hold block) and can be implemented in the same commit
- T005 can be written alongside T001/T002 since it tests the same scoring property from a different angle
- T007 can be written after T001/T002 without waiting for T003/T004 to be implemented

---

## Parallel Example: User Story 1

```bash
# Write all US1 failing tests in one pass:
Task: "T001 — adjacent-capture bonus test"
Task: "T002 — mid-capture hold score test"
# (same file, same describe block — write together)

# Then implement both scoring constants together:
Task: "T003 — CAPTURE_BONUS in move-candidate loop"
Task: "T004 — MID_CAPTURE_HOLD_SCORE in hold-position block"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001–T004)
2. **STOP and VALIDATE**: Run `npm test` — T001 and T002 pass; play one game and observe AI capturing adjacent settlements
3. Ship if ready

### Incremental Delivery

1. US1 (T001–T004) → test → confirm AI captures adjacent settlements ✅
2. US2 (T005–T006) → test → confirm capture beats exploration deterministically ✅
3. US3 (T007–T008) → test → confirm no duplicate assignments ✅
4. Polish (T009–T010) → lint, doc → ready to merge

---

## Notes

- All changes are confined to `src/game/ai/movegen.ts` and `tests/game/ai/movegen.test.ts`
- `CAPTURE_BONUS = 4000` was chosen to sit below non-lethal attacks (5000) and above exploration (~1020)
- `MID_CAPTURE_HOLD_SCORE = 8000` was chosen to sit below kill shots (10000+) but above non-lethal attacks (5000)
- The duplicate-capture guard uses the existing `settlement.capturingUnit` field — no new data structures
- Existing test IDs in `movegen.test.ts` are T016–T023; new tests should use T024+ or descriptive names
