# Tasks: Remove Grid Lines

**Input**: Design documents from `/specs/011-remove-grid-lines/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: No test tasks — this is a visual-only change with no new logic. Existing tests validate gameplay is unaffected.

**Organization**: Single user story, single file change.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Phase 1: User Story 1 - Seamless Tile Display (Priority: P1) 🎯 MVP

**Goal**: Remove 1-pixel grid lines between all tiles and highlights so the map renders as a continuous landscape.

**Independent Test**: Launch the game, visually confirm no gaps between adjacent tiles. Select a unit and confirm movement/attack/hover highlights also have no gaps.

### Implementation for User Story 1

- [x] T001 [US1] Change terrain tile rect dimensions from `tileSize - 1` to `tileSize` in `renderTiles` method in src/renderer/tilemap.ts
- [x] T002 [US1] Change movement highlight rect dimensions from `tileSize - 1` to `tileSize` in `renderHighlights` method in src/renderer/tilemap.ts
- [x] T003 [US1] Change attack highlight rect dimensions from `tileSize - 1` to `tileSize` in `renderHighlights` method in src/renderer/tilemap.ts
- [x] T004 [US1] Change hover-on-reachable highlight rect dimensions from `tileSize - 1` to `tileSize` in `renderHighlights` method in src/renderer/tilemap.ts
- [x] T005 [US1] Change hover-on-attackable highlight rect dimensions from `tileSize - 1` to `tileSize` in `renderHighlights` method in src/renderer/tilemap.ts

**Checkpoint**: All grid lines removed. Map and highlights render seamlessly.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [x] T006 Run existing test suite to confirm no regressions (`npm test`)
- [ ] T007 Run quickstart.md validation — launch game and visually verify all acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 1)**: No dependencies — can start immediately
- **Polish (Phase 2)**: Depends on Phase 1 completion

### Within User Story 1

- T001–T005 are all in the same file but modify different methods/locations. They can be applied sequentially in a single edit pass.

### Parallel Opportunities

- T001–T005 modify different locations in the same file — best executed as a single batch edit rather than in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: All 5 rect dimension changes in src/renderer/tilemap.ts
2. **STOP and VALIDATE**: Run tests, launch game, verify visually
3. Complete Phase 2: Polish validation

### Execution Note

All 5 tasks (T001–T005) are simple find-and-replace operations in a single file. They can realistically be completed in one edit pass by replacing all `tileSize - 1` occurrences with `tileSize` in `src/renderer/tilemap.ts`.

---

## Notes

- All changes are in a single file: `src/renderer/tilemap.ts`
- No new files, no new dependencies, no architectural changes
- Commit after all rect changes are made
- Visual verification is the primary acceptance test
