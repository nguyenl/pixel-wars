# Tasks: Game UI Enhancements

**Input**: Design documents from `/specs/012-game-ui-enhancements/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not explicitly requested — test tasks omitted. Manual verification via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project setup needed — existing project with all dependencies already in place.

*(No tasks — project is already configured with TypeScript, PixiJS, Vitest)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared helper for computing settlement statistics from game state, used by the control panel and potentially other UI features.

- [ ] T001 Add `computePlayerStats` helper function that computes income per turn, city count, and town count from GameState and PlayerId in `src/renderer/ui.ts`

**Checkpoint**: Helper function ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Control Panel with Game Economy Overview (Priority: P1) 🎯 MVP

**Goal**: Display a persistent control panel showing income per turn, city count, and town count during gameplay.

**Independent Test**: Start a game, verify the control panel displays correct values. Capture a settlement, verify counts update. Upgrade a town, verify income recalculates.

### Implementation for User Story 1

- [ ] T002 [US1] Add control panel DOM element creation and rendering in `UIRenderer.renderHUD()` in `src/renderer/ui.ts` — position in top-right area, show income/turn, cities owned, towns owned using `computePlayerStats` helper
- [ ] T003 [US1] Add CSS styling for the control panel (compact layout, consistent with existing HUD dark theme) in `src/renderer/ui.ts`

**Checkpoint**: Control panel visible during gameplay, updates on every state change

---

## Phase 4: User Story 2 - Unit Stat Tooltip on Hover (Priority: P2)

**Goal**: Show detailed unit stats (type, HP, movement, attack, defense, range, vision) when hovering over any visible unit.

**Independent Test**: Hover over a Scout, Infantry, and Artillery unit — verify all stats display correctly. Hover over an enemy unit — verify same stats appear. Move cursor away — verify tooltip disappears. On mobile, long-press a unit — verify tooltip appears and disappears on release.

### Implementation for User Story 2

- [ ] T004 [P] [US2] Add `showTooltip(unit, screenX, screenY)` and `hideTooltip()` methods to `UIRenderer` in `src/renderer/ui.ts` — DOM overlay showing unit type, HP/maxHP, movement/max, attack, defense, range (Melee or number), vision. Position near cursor, clamp to screen bounds.
- [ ] T005 [US2] Add unit hover detection in the `pointermove` handler in `src/input/input.ts` — on mouse hover, check if tile has a visible unit (not in fog), call `UIRenderer.showTooltip()` with unit data and screen coordinates. Clear tooltip when no unit under cursor.
- [ ] T006 [US2] Add mobile long-press tooltip support in `src/input/input.ts` — track `pointerdown` timestamp, if held for 500ms without significant movement over a unit tile, show tooltip. Dismiss on `pointerup`. Ensure long-press does not trigger tile click.

**Checkpoint**: Hovering over units shows full stat tooltip; works on desktop (hover) and mobile (long-press)

---

## Phase 5: User Story 3 - Combat Damage Numbers (Priority: P3)

**Goal**: Display floating damage numbers above units during combat animations, for both initial attacks and counterattacks.

**Independent Test**: Attack an enemy unit — verify damage number floats up and fades above the defender. If counterattack occurs, verify second damage number appears above the attacker. During AI turn, verify damage numbers also appear for AI attacks.

### Implementation for User Story 3

- [ ] T007 [P] [US3] Add `showDamageNumber(worldX, worldY, damage, color?)` method to `GameRenderer` in `src/renderer/renderer.ts` — create a PixiJS `Text` in `worldContainer`, animate it floating upward ~30px and fading to alpha 0 over ~800ms using the PixiJS Ticker, then destroy the Text
- [ ] T008 [US3] Wire damage numbers into player attack flow in `src/input/input.ts` — in `doAttack()`, compute damage values from pre-combat HP vs `CombatResult` (via the post-action state), call `renderer.showDamageNumber()` for defender damage during the attack animation callback, and for attacker damage if counterattack occurred
- [ ] T009 [US3] Wire damage numbers into AI attack flow in `src/main.ts` — in `animateAiAttack()`, compute defender damage and attacker damage (if counterattack) from `preUnits` HP vs post-action state HP, call `renderer.showDamageNumber()` at appropriate animation points

**Checkpoint**: All combat encounters show floating damage numbers for both player and AI attacks

---

## Phase 6: User Story 4 - In-Game Instructions (Priority: P4)

**Goal**: Provide an accessible help overlay explaining all game mechanics, accessible via a help button in the HUD.

**Independent Test**: Click the "?" help button during gameplay — verify instructions overlay appears with all sections. Press Escape — verify overlay closes. Verify game input is blocked while overlay is open.

### Implementation for User Story 4

- [ ] T010 [P] [US4] Add `showInstructions()` and `hideInstructions()` methods to `UIRenderer` in `src/renderer/ui.ts` — full-screen DOM overlay (same pattern as victory screen) with sections: Game Objective, Moving Units, Attacking, Unit Types (Scout/Infantry/Artillery stats), Settlements (income, production, upgrading), Fog of War, Victory Conditions. Add close button and Escape key listener. Use `applyMobileStyles()`.
- [ ] T011 [US4] Add "?" help button to the HUD bar in `UIRenderer.renderHUD()` in `src/renderer/ui.ts` — small button styled consistently with existing HUD, positioned after the phase indicator. On click, call `showInstructions()`.

**Checkpoint**: Help button visible in HUD; clicking opens full instructions overlay; Escape and close button dismiss it

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify everything works together, run existing tests and lint

- [ ] T012 Run `npm test && npm run lint` and fix any failures
- [ ] T013 Verify all 4 features work together in a full game session (manual play-through)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: T001 — No dependencies, can start immediately
- **User Story 1 (Phase 3)**: Depends on T001 (computePlayerStats helper)
- **User Story 2 (Phase 4)**: No dependencies on other stories — can start after Phase 2
- **User Story 3 (Phase 5)**: No dependencies on other stories — can start after Phase 2
- **User Story 4 (Phase 6)**: No dependencies on other stories — can start after Phase 2
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001 (helper). No dependencies on other stories.
- **User Story 2 (P2)**: Independent. No dependencies on other stories.
- **User Story 3 (P3)**: Independent. No dependencies on other stories.
- **User Story 4 (P4)**: Independent. No dependencies on other stories.

### Within Each User Story

- UI methods before wiring/integration
- Helper functions before consumers

### Parallel Opportunities

- T004 (US2 tooltip UI) and T007 (US3 damage number renderer) and T010 (US4 instructions overlay) can all run in parallel — different files/methods
- After Phase 2, all four user stories can proceed in parallel

---

## Parallel Example: User Stories 2, 3, 4

```text
# These can all be launched in parallel after Phase 2:
Task T004: "Add showTooltip/hideTooltip to UIRenderer in src/renderer/ui.ts"
Task T007: "Add showDamageNumber to GameRenderer in src/renderer/renderer.ts"
Task T010: "Add showInstructions/hideInstructions to UIRenderer in src/renderer/ui.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001: Helper function
2. Complete T002-T003: Control panel UI
3. **STOP and VALIDATE**: Control panel shows correct income/cities/towns
4. Deploy/demo if ready

### Incremental Delivery

1. T001 → Foundation ready
2. T002-T003 → Control panel working (MVP!)
3. T004-T006 → Unit tooltips working
4. T007-T009 → Damage numbers working
5. T010-T011 → Instructions working
6. T012-T013 → Polish and verify

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- All UI follows existing patterns: DOM overlays for panels/tooltips, PixiJS for in-world graphics
- No new npm dependencies required
- Commit after each user story completion for clean vertical slices
