# Tasks: Map Pan/Zoom & Ghost UI Fix

**Input**: Design documents from `/specs/008-map-pan-zoom-fix/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: TDD for pure functions (`clampPan`, `screenToTile`) per Constitution Principle II. No other tests requested.

**Organization**: Tasks grouped by user story. US1 (ghost fix) is independent. US2 (pan) and US3 (zoom) share foundational viewport state established in Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Test Infrastructure)

**Purpose**: Write failing tests for the two pure functions before implementation begins. These tests define the expected behavior of `clampPan` and `screenToTile` and MUST fail until Phase 2.

- [X] T001 Write failing unit tests for `clampPan` in `tests/renderer/viewport.test.ts` — cover: map fits (centers), map too wide (clamps pan to boundary), map too tall (clamps pan to boundary), zoom-adjusted map dimensions
- [X] T002 Write failing unit tests for `screenToTile` in `tests/renderer/viewport.test.ts` — cover: center of tile 0,0 at 1× zoom, center tile with pan offset, center tile at 2× zoom, point outside map returns null, point at exact map boundary

**Checkpoint**: `npm test` — both test suites fail. No implementation files exist yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the two pure math functions that all viewport operations depend on. These are the only code that can be unit-tested independently of PixiJS.

**⚠️ CRITICAL**: US2 and US3 cannot be implemented until this phase is complete.

- [X] T003 Create `src/renderer/viewport.ts` and implement `clampPan(panX, panY, zoom, canvasW, canvasH, mapCols, mapRows, tileSize): { x: number; y: number }` — if map fits in canvas at current zoom, return centered position; otherwise clamp to `[canvasW - mapPixelW, 0]` / `[canvasH - mapPixelH, 0]`
- [X] T004 Implement `screenToTile(screenX, screenY, panX, panY, zoom, tileSize, mapCols, mapRows): { row: number; col: number } | null` in `src/renderer/viewport.ts` — apply inverse viewport transform (`worldX = (screenX - panX) / zoom`), floor to tile coords, return null if out of map bounds

**Checkpoint**: `npm test` — T001 and T002 test suites now pass. `npm run lint` clean.

---

## Phase 3: User Story 1 — Ghost Info Panel Fix (Priority: P1) 🎯 MVP

**Goal**: Ensure all DOM elements from a previous game session are fully removed before a new game renders.

**Root cause** (from research.md): `GameRenderer.destroy()` in `src/renderer/renderer.ts:185` calls `this.app.destroy(true)` (removes PixiJS canvas) but never calls `this.uiRenderer.destroy()` (removes DOM elements). On game reset, `div#hud` and all other UI divs remain in the DOM. The new session appends a second set of identical divs on top — the old ones show through.

**Independent Test**: Play a game, reach victory, return to menu, start a second game. Verify only one HUD bar is visible at the top — no doubled or faintly visible text.

- [X] T005 [US1] Add `this.uiRenderer.destroy()` call inside `GameRenderer.destroy()` in `src/renderer/renderer.ts` (line 185–188), immediately before `this.app.destroy(true)`

**Checkpoint**: `npm run dev` — play two games in sequence, confirm no ghost panel. `npm test` still passes.

---

## Phase 4: User Story 2 — Map Panning (Priority: P2)

**Goal**: Allow the player to click-drag on the canvas to scroll the map viewport. Pan is clamped so the map never fully disappears off screen.

**Independent Test**: Load a Large map (40×40), drag the canvas — previously off-screen tiles become visible. Drag to map edge — viewport stops, no empty space visible. Click a unit without dragging — selection works normally.

### Implementation

- [X] T006 [US2] Add viewport state fields and constants to `GameRenderer` class in `src/renderer/renderer.ts`: private fields `panX = 0`, `panY = 0`, `zoom = 1`, `isPanning = false`, `wasDragging = false`, `dragStartX = 0`, `dragStartY = 0`, `panStartX = 0`, `panStartY = 0`; module-level constants `MIN_ZOOM = 0.5`, `MAX_ZOOM = 2.5`, `ZOOM_STEP = 1.1`, `DRAG_THRESHOLD = 4`; track previous map size for change detection with `private viewportInitialized = false`

- [X] T007 [US2] Refactor viewport application in `src/renderer/renderer.ts`: (a) add private `initViewport()` method — set `zoom=1`, compute centered `panX`/`panY` via `clampPan`, assign to `worldContainer.x`/`.y`/`.scale`; (b) add private `applyViewport()` method — assign `this.panX`/`this.panY` to `worldContainer.x`/`.y` and `this.zoom` to `worldContainer.scale`; (c) in `render()`, replace the `centerWorldContainer()` call with: if `!this.viewportInitialized` (new game) call `initViewport()` and set `viewportInitialized=true`, then call `applyViewport()`; (d) in `onResize()`, replace `centerWorldContainer()` with `clampPan` re-application and `applyViewport()`; (e) delete `centerWorldContainer()` private method

- [X] T008 [US2] Implement pan event handling in `src/renderer/renderer.ts`: add private `setupPanEvents(canvas: HTMLCanvasElement)` method with `mousedown` (record `dragStartX/Y`, `panStartX/Y`, set `wasDragging=false`), `mousemove` (if button held and distance > `DRAG_THRESHOLD`: set `isPanning=wasDragging=true`, compute new pan as `panStartX + dx`, call `clampPan`, call `applyViewport()`), `mouseup`/`mouseleave` (clear `isPanning`); call `setupPanEvents` at end of `init()`; add public `isDragging(): boolean` method returning `this.wasDragging`; add public `getZoom(): number` method returning `this.zoom`; update `getWorldOffset()` to return `{ x: this.panX, y: this.panY }` (remove dependence on worldContainer fields)

- [X] T009 [US2] Update coordinate transforms in `src/input/input.ts`: (a) at the top of the `'click'` event handler, add `if (this.renderer.isDragging()) return;`; (b) in both `'click'` and `'mousemove'` handlers, retrieve zoom via `const zoom = this.renderer.getZoom()` and divide screen-to-world transform: `const worldX = (e.clientX - rect.left - offset.x) / zoom` and `const worldY = (e.clientY - rect.top - offset.y) / zoom` (replaces current subtraction-only formula at input.ts:48–50 and 74–75)

**Checkpoint**: `npm run dev` — pan works on Large map; tile selection remains accurate while panned; clicking does not trigger pan; `npm test` passes.

---

## Phase 5: User Story 3 — Map Zooming (Priority: P3)

**Goal**: Allow the player to scroll the mouse wheel to zoom the map in/out, centered on the cursor position.

**Depends on**: Phase 4 complete — zoom state field and `getZoom()` already exist (value stays 1.0 until this phase wires the wheel event).

**Independent Test**: Scroll wheel on the map — tiles grow/shrink; the tile under the cursor stays fixed. Zoom to min (0.5×) — no further zoom out. Zoom to max (2.5×) — no further zoom in. Click a tile at any zoom level — correct tile selected.

### Implementation

- [X] T010 [US3] Implement zoom event handling in `src/renderer/renderer.ts`: add private `setupZoomEvents(canvas: HTMLCanvasElement)` method with a `'wheel'` event listener (call `e.preventDefault()` to suppress page scroll); compute `scaleFactor = e.deltaY < 0 ? ZOOM_STEP : 1/ZOOM_STEP`; clamp new zoom to `[MIN_ZOOM, MAX_ZOOM]`; compute cursor-relative world point: `const mouseX = e.clientX - canvas.getBoundingClientRect().left`, `const worldPointX = (mouseX - this.panX) / this.zoom`; set `this.zoom = newZoom`; set `this.panX = mouseX - worldPointX * this.zoom` (cursor-centered re-projection); repeat for Y axis; call `clampPan` to enforce boundaries; call `applyViewport()`; call `setupZoomEvents` at end of `init()`

**Checkpoint**: `npm run dev` — zoom in/out works; cursor point stays fixed; min/max enforced; tile clicks accurate at all zoom levels; `npm test` passes.

---

## Phase 6: Polish & Validation

**Purpose**: Verify all user stories work together end-to-end and ensure no regressions.

- [X] T011 Run `npm test && npm run lint` — fix any type errors or test failures introduced during implementation; verify all 14 existing game logic tests still pass alongside the new viewport tests
- [ ] T012 [P] Manually execute all verification scenarios from `specs/008-map-pan-zoom-fix/quickstart.md` — ghost panel (US1), pan boundary clamping (US2), drag-vs-click (US2), zoom centering (US3), click accuracy at non-1× zoom (US3)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — write tests immediately
- **Foundational (Phase 2)**: Depends on Phase 1 test files existing — implements pure functions to pass those tests
- **US1 (Phase 3)**: Independent — no dependency on Phase 1 or 2; can be done at any time
- **US2 (Phase 4)**: Depends on Phase 2 (`clampPan` and `screenToTile` must exist before wiring them in renderer)
- **US3 (Phase 5)**: Depends on Phase 4 (`zoom` state field and `applyViewport()` must exist)
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Fully independent — a one-line fix. Can be done before or after any other phase.
- **US2 (P2)**: Depends on Foundational (Phase 2) for `clampPan`.
- **US3 (P3)**: Depends on US2 (Phase 4) for viewport state and `applyViewport()`.

### Within Each Phase

- T003 before T004 (both in same file; write in order for clean diffs)
- T006 before T007 (state fields needed before methods that use them)
- T007 before T008 (applyViewport needed before pan event handler calls it)
- T008 before T009 (getZoom/isDragging must exist before input.ts calls them)

### Parallel Opportunities

- T001 and T002 can be written in the same editing session (same file, sequential blocks)
- T003 and T004 can be written together (same file)
- T005 (US1) is fully independent and can be done any time
- T011 and T012 (Polish) can run in parallel — one automated, one manual

---

## Parallel Execution Example: Phase 4 (US2)

```
Session 1: T006 → T007 → T008  (renderer.ts modifications, sequential)
Session 2: T009                  (input.ts modification, can start after T008 exposes getZoom/isDragging)
```

Note: This is a solo project — sequential execution is expected. The [P] markers flag tasks safe to batch when making edits.

---

## Implementation Strategy

### MVP First (User Story 1 Only — 5 minutes)

1. Complete Phase 1: Write tests (T001–T002)
2. Complete Phase 2: Implement pure functions (T003–T004)
3. Skip to Phase 3: Fix ghost panel (T005) — **independently shippable**
4. **STOP and VALIDATE**: Play two games, confirm no ghost panel
5. Commit: `fix: remove ghost HUD by calling uiRenderer.destroy() on game reset`

### Incremental Delivery

1. T001–T004: Setup + Foundational → viewport math tested and ready
2. T005: Ghost panel fix → shippable immediately
3. T006–T009: Pan → test independently with Large map
4. T010: Zoom → test independently at all zoom levels
5. T011–T012: Polish → confirm full integration

### Suggested Commit Sequence

```
fix: call uiRenderer.destroy() in GameRenderer.destroy()         ← after T005
feat: add clampPan and screenToTile pure viewport functions       ← after T004
feat: add viewport state and refactor render loop for pan/zoom    ← after T007
feat: implement map panning with drag threshold and boundary clamp← after T009
feat: implement cursor-centered scroll wheel zoom                 ← after T010
```

---

## Notes

- [P] tasks = no file conflicts with concurrently active tasks
- [Story] label maps task to user story for traceability
- US1 is a bug fix (one line) — do not over-scope it
- `viewport.ts` must not import from `pixi.js` — keep it a pure TypeScript math module for testability
- The `centerWorldContainer()` private method in renderer.ts is fully replaced by `initViewport()` + `applyViewport()` and must be deleted (not left as dead code)
- `tests/renderer/viewport.test.ts` is the only new test file — no renderer integration tests
