# Tasks: Mobile Browser Support

**Input**: Design documents from `/specs/010-mobile-browser-support/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included — plan.md specifies a gesture.test.ts for pure gesture math utilities.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: HTML and CSS foundation for mobile support (no behavioral changes yet)

- [x] T001 Update viewport meta tag in index.html to prevent page-level zoom: set `maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
- [x] T002 Add global CSS rules in index.html `<style>` block: `touch-action: none` on canvas, `overscroll-behavior: none` on body, `-webkit-user-select: none; user-select: none` on body

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract gesture recognition logic into testable pure functions, shared by US1 and US2

**⚠️ CRITICAL**: User story implementation depends on this phase

- [x] T003 Create gesture utility module at src/input/gesture.ts: define `ActivePointer` and `GestureState` types per data-model.md, export constants `TAP_DISTANCE_THRESHOLD = 10` and `TAP_TIME_THRESHOLD = 300`, implement pure functions `isTap(pointer: ActivePointer, upTime: number): boolean` (checks distance < 10px AND duration < 300ms), `pinchDistance(a: ActivePointer, b: ActivePointer): number` (euclidean distance between two pointer currentX/Y positions), and `pinchMidpoint(a: ActivePointer, b: ActivePointer): {x, y}` (midpoint between two pointers)
- [x] T004 Create tests for gesture utilities at tests/gesture.test.ts: test `isTap` returns true for short stationary touch, false for moved touch, false for long-held touch; test `pinchDistance` calculates correctly; test `pinchMidpoint` returns center point between two pointers

**Checkpoint**: Gesture math is tested and ready for integration

---

## Phase 3: User Story 1 — Select and Move Units on Mobile (Priority: P1) 🎯 MVP

**Goal**: Tap on units to select, tap reachable tiles to move, tap enemies to attack — all via touch input on mobile

**Independent Test**: On a mobile device, start a game, tap a unit to select it, tap a reachable tile to move it, tap an enemy to attack. All three actions work without mouse input.

### Implementation for User Story 1

- [x] T005 [US1] Replace mouse-based pan/drag tracking in src/renderer/renderer.ts with pointer events: convert `setupPanEvents()` to use `pointerdown`/`pointermove`/`pointerup`/`pointerleave` instead of `mousedown`/`mousemove`/`mouseup`/`mouseleave`. Track active pointers in a `Map<number, ActivePointer>` (import from gesture.ts). On `pointerdown`, add pointer to map and set `isPanning = true`. On `pointermove`, update pointer's `currentX/Y` and apply pan delta with existing `clampPan()` logic. On `pointerup`/`pointerleave`, remove pointer from map. Set `touch-action: none` CSS style on the canvas element in `init()`. Preserve the existing `wasDragging` flag using `TAP_DISTANCE_THRESHOLD` for touch pointers and existing `DRAG_THRESHOLD` (4px) for mouse pointers (check `e.pointerType`). Keep existing `isDragging()` method working so click/tap filtering still works.
- [x] T006 [US1] Replace click-based tile interaction in src/input/input.ts with pointer-event-based tap detection: remove `canvas.addEventListener('click', ...)` in `setupCanvasClick()`. Add `pointerup` event listener that calls the imported `isTap()` from gesture.ts using the pointer's start position/time vs the up event. If `isTap()` returns true AND `renderer.isDragging()` is false, convert the pointer's screen coordinates to tile coordinates (reuse existing worldX/worldY math) and call `handleTileClick()`. Keep the `mousemove` listener for desktop hover highlighting but guard it with `e.pointerType === 'mouse'` check (convert to `pointermove`). Remove `mouseleave` listener and replace with `pointerleave` that clears hover only for mouse pointerType.

**Checkpoint**: Units are selectable and movable via touch. Desktop mouse input still works identically.

---

## Phase 4: User Story 2 — Pan and Zoom the Map on Mobile (Priority: P1)

**Goal**: One-finger drag pans the map, two-finger pinch zooms in/out, with smooth gesture transitions

**Independent Test**: On a mobile device, drag one finger to pan, pinch two fingers to zoom. Gestures feel smooth. Quick taps still select units (not misinterpreted as pan).

### Implementation for User Story 2

- [x] T007 [US2] Add pinch-to-zoom gesture handling in src/renderer/renderer.ts: extend the pointer event handlers from T005 to support multi-touch. When a second `pointerdown` fires while one pointer is already active, enter pinch mode: record `pinchStartDist` using `pinchDistance()` from gesture.ts and `pinchStartZoom = this.zoom`. On `pointermove` with two active pointers, compute new distance ratio, calculate `newZoom = pinchStartZoom * (currentDist / pinchStartDist)`, clamp to `[MIN_ZOOM, MAX_ZOOM]`, compute zoom center as `pinchMidpoint()`, adjust `panX/panY` to zoom toward that center point (same math as existing wheel zoom), apply `clampPan()`. Remove the existing `setupZoomEvents()` wheel listener and merge it: keep `wheel` event for desktop mouse (add `if (e.pointerType !== 'touch')` guard or just keep wheel as a separate handler alongside pointer events). On `pointerup` when transitioning from 2 pointers to 1, reset the remaining pointer as the new drag origin (`panStartX/Y = panX/panY`, `dragStartX/Y = remaining pointer currentX/Y`) to prevent map jumping.
- [x] T008 [US2] Ensure tap vs drag disambiguation works correctly for pan gestures in src/renderer/renderer.ts: when a single `pointermove` exceeds `TAP_DISTANCE_THRESHOLD` (10px for touch, 4px for mouse via `e.pointerType`), set `wasDragging = true` so the corresponding `pointerup` in input.ts does NOT trigger a tile click. Verify that the existing `isDragging()` check in the tap handler (T006) correctly prevents taps after drags.

**Checkpoint**: Full map navigation works on mobile. Tap/drag/pinch gestures are correctly disambiguated.

---

## Phase 5: User Story 3 — Status Bar Positioned at Top of Game Window (Priority: P2)

**Goal**: HUD status bar is visible at the top of the game viewport, respecting mobile safe-area insets

**Independent Test**: On a mobile device (especially one with a notch), verify the status bar is visible below browser chrome and not clipped by safe areas.

### Implementation for User Story 3

- [x] T009 [US3] Reposition HUD status bar in src/renderer/ui.ts: in `renderHUD()`, change the HUD element's CSS from `top: 0` to `top: env(safe-area-inset-top, 0px)`. Add `padding-left: max(16px, env(safe-area-inset-left, 0px))` and `padding-right: max(16px, env(safe-area-inset-right, 0px))` to handle landscape orientation on notched devices. The element should remain `position: fixed` with `left: 0; right: 0`.

**Checkpoint**: Status bar is correctly positioned on all device types.

---

## Phase 6: User Story 4 — Mobile-Friendly UI Panels (Priority: P2)

**Goal**: All buttons and interactive elements are comfortably tappable on mobile (minimum 44×44px tap targets)

**Independent Test**: On a mobile device, tap the End Turn button, production menu buttons, and upgrade button without difficulty.

### Implementation for User Story 4

- [x] T010 [P] [US4] Increase End Turn button tap target in src/renderer/ui.ts: update `END_TURN_BTN_STYLE` to set `min-height: 44px; min-width: 44px; padding: 8px 16px; font-size: 1rem`
- [x] T011 [P] [US4] Increase production menu button tap targets in src/renderer/ui.ts: update `PROD_BTN_STYLE` to set `min-height: 44px; padding: 10px 8px`. Update `CLOSE_BTN_STYLE` to set `min-height: 44px; min-width: 44px; padding: 8px 12px`
- [x] T012 [US4] Prevent touch pass-through on UI panels in src/renderer/ui.ts: add `pointerdown` event listener with `e.stopPropagation()` on the HUD element, unit info panel, production menu, and upgrade panel to prevent taps on UI from reaching the canvas below

**Checkpoint**: All UI elements are mobile-friendly and don't leak events to the game canvas.

---

## Phase 7: User Story 5 — Prevent Unwanted Browser Behaviors (Priority: P3)

**Goal**: Suppress pull-to-refresh, double-tap-to-zoom, long-press context menus, and page overscroll on mobile

**Independent Test**: On a mobile browser, try pull-to-refresh, double-tap, long-press — none trigger default browser behaviors.

### Implementation for User Story 5

- [x] T013 [US5] Add document-level touch event suppression in src/renderer/renderer.ts `init()` method: add `document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false })` to prevent pull-to-refresh on Chrome Android. Add `document.addEventListener('contextmenu', (e) => e.preventDefault())` to prevent long-press context menus. These listeners should be added once during init and are global to the game page.
- [x] T014 [US5] Add CSS anti-selection and callout suppression in src/renderer/ui.ts: on every created DOM element (HUD, menus, panels), add inline styles `-webkit-touch-callout: none; -webkit-user-select: none; user-select: none` to prevent text selection on long-press. Apply this as a shared style helper or inline on each element.

**Checkpoint**: No browser default behaviors interfere with gameplay.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge cases, cleanup

- [x] T015 Verify desktop mouse input still works identically: run the game on desktop, confirm click-to-select, mouse-drag-to-pan, scroll-to-zoom, hover highlighting, all UI buttons work exactly as before. Fix any regressions introduced by pointer event conversion.
- [x] T016 Handle orientation change edge case in src/renderer/renderer.ts: verify the existing `resize` event handler fires on orientation change and correctly re-clamps pan/zoom. If not, add `window.addEventListener('orientationchange', () => this.onResize())` as a fallback.
- [x] T017 Run `npm test && npm run lint` and fix any failures or lint issues introduced by the changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — core mobile input
- **US2 (Phase 4)**: Depends on US1 (extends pointer events added in T005)
- **US3 (Phase 5)**: Depends on Foundational only — can run in parallel with US1/US2
- **US4 (Phase 6)**: Depends on Foundational only — can run in parallel with US1/US2
- **US5 (Phase 7)**: Depends on Setup (T001/T002 provide CSS layer) — can run in parallel with US1-US4
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Blocked by Foundational (Phase 2). No dependencies on other stories.
- **US2 (P1)**: Depends on US1 (T005 creates the pointer event infrastructure that T007 extends).
- **US3 (P2)**: Independent of US1/US2. Can start after Foundational.
- **US4 (P2)**: Independent of US1/US2. Can start after Foundational.
- **US5 (P3)**: Independent of all other stories. Can start after Setup.

### Parallel Opportunities

- T010 and T011 can run in parallel (different CSS constants, same file but non-overlapping)
- US3, US4, US5 can all run in parallel with each other
- US3 and US4 can run in parallel with US1/US2

---

## Parallel Example: User Story 4

```bash
# These two tasks modify different style constants in the same file — parallelizable:
Task: "T010 - Increase End Turn button tap target in src/renderer/ui.ts"
Task: "T011 - Increase production menu button tap targets in src/renderer/ui.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T004)
3. Complete Phase 3: User Story 1 — Tap to select/move/attack (T005-T006)
4. Complete Phase 4: User Story 2 — Pan and zoom gestures (T007-T008)
5. **STOP and VALIDATE**: Test on mobile device — game should be playable
6. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → Gesture utilities ready
2. Add US1 → Test tap interactions → Mobile taps work (MVP core!)
3. Add US2 → Test pan/zoom → Full map navigation on mobile
4. Add US3 → Status bar repositioned for mobile
5. Add US4 → UI buttons properly sized for touch
6. Add US5 → Browser defaults suppressed
7. Polish → Desktop regression check, orientation, lint

---

## Notes

- [P] tasks = different files or non-overlapping edits, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 priority but US2 depends on the pointer infrastructure from US1
- The Pointer Events API unifies mouse and touch, so desktop support is preserved by design
- No new npm dependencies required — all changes use browser-native APIs
- Manual testing on a real mobile device is essential; Chrome DevTools touch simulation is a useful supplement but does not catch all Safari iOS quirks
