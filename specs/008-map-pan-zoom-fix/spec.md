# Feature Specification: Map Pan/Zoom & Ghost UI Fix

**Feature Branch**: `008-map-pan-zoom-fix`
**Created**: 2026-03-16
**Status**: Draft
**Input**: User description: "For large map size, it doesn't fit my browser window. Add the ability to pan and zoom the map. Also, fix a bug where the top info panel from the previous game can be faintly seen behind the current window."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ghost Info Panel Invisible on New Game (Priority: P1)

When a player starts a new game or returns to the start screen, any UI elements from the previous game session — particularly the top info panel — must be fully hidden or removed. Currently, a faint remnant of the previous game's info panel is visible behind the new game's interface, which is visually confusing and makes the game feel broken.

**Why this priority**: This is a bug affecting every player who plays more than one game session. It degrades perceived quality and must be fixed before other UX improvements are layered on top.

**Independent Test**: Can be fully tested by playing a complete game, returning to the menu or starting a second game, and verifying the info panel from the first game is completely gone.

**Acceptance Scenarios**:

1. **Given** a game has been played to completion, **When** the player starts a new game, **Then** no UI elements from the previous game are visible anywhere on screen.
2. **Given** the top info panel was fully visible during the previous game, **When** a new game begins, **Then** the top info panel shows only the current game's information with no ghosting or transparency artifacts from the previous session.
3. **Given** a player returns to the main menu or start screen after a game, **When** the screen renders, **Then** the info panel area is either hidden or blank — not faintly showing prior game data.

---

### User Story 2 - Pan the Map by Dragging (Priority: P2)

A player with a large map that does not fit in the browser window can click and drag to pan the viewport and explore the full map. This allows full strategic visibility without requiring the map to be scaled down.

**Why this priority**: Without panning, large maps are inaccessible — players cannot see or interact with tiles outside the visible area. Panning is the minimum required to make large maps playable.

**Independent Test**: Can be fully tested by loading a large map and confirming the player can drag to reveal tiles that were initially off-screen, with the viewport correctly following the drag gesture.

**Acceptance Scenarios**:

1. **Given** a large map that exceeds the browser window, **When** the player clicks and drags on the map area, **Then** the map scrolls in the direction of the drag, revealing previously hidden tiles.
2. **Given** the player is panning, **When** the drag reaches the edge of the map, **Then** the viewport stops moving and does not scroll past the map boundary (no empty space beyond map edges).
3. **Given** the player releases the mouse after dragging, **When** no mouse button is held, **Then** the map stops panning and stays at the new position.
4. **Given** the player clicks on a unit or tile to select it, **When** the click does not involve dragging, **Then** the selection still works normally — panning does not interfere with normal click interactions.

---

### User Story 3 - Zoom the Map with the Scroll Wheel (Priority: P3)

A player can use the mouse scroll wheel to zoom in or out on the map, allowing them to zoom out for a strategic overview of a large map or zoom in for detailed inspection of specific tiles.

**Why this priority**: Zooming complements panning by letting the player choose their level of detail. It is additive value on top of panning and can be delivered independently.

**Independent Test**: Can be fully tested by scrolling the mouse wheel on the map and verifying the visible area scales appropriately around the cursor position.

**Acceptance Scenarios**:

1. **Given** the map is visible, **When** the player scrolls the mouse wheel up (zoom in), **Then** the map tiles grow larger and the viewport centers around the cursor position.
2. **Given** the map is visible, **When** the player scrolls the mouse wheel down (zoom out), **Then** the map tiles shrink and more of the map becomes visible.
3. **Given** the player zooms in to the maximum level, **When** they attempt to zoom in further, **Then** the zoom level remains at the maximum — no further enlargement occurs.
4. **Given** the player zooms out to the minimum level, **When** they attempt to zoom out further, **Then** the zoom level remains at the minimum — the map does not disappear or shrink past a usable size.
5. **Given** the player has panned and zoomed, **When** they click on a tile, **Then** the tile selection reflects the correct map coordinate — click targets are accurate at all zoom levels.

---

### Edge Cases

- What happens when the map is smaller than the browser window? Panning and zooming should still work but clamping ensures the map stays visible.
- How does panning interact with zooming? Zoom should center on cursor; after zooming, pan boundaries should update so the viewport cannot exceed the new scaled map extent.
- What happens if the player rapidly alternates between pan and zoom gestures? Each interaction should independently update the viewport without corrupting state.
- How does a zoom-out behave when the full map already fits in the viewport? Panning should be disabled or limited when the map fits within the window at the current zoom level.
- What if the browser window is resized while playing? The viewport should adapt gracefully, keeping the current map center visible if possible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST fully clear or hide all UI elements from a previous game session before rendering a new game's interface, ensuring no remnants of prior sessions are visible.
- **FR-002**: The top info panel MUST be completely hidden when not in an active game state (e.g., on the start screen, between games).
- **FR-003**: Players MUST be able to pan the map by clicking and dragging within the map area.
- **FR-004**: Pan movement MUST be clamped so the viewport cannot scroll beyond the map boundaries in any direction — no empty space outside the map should be visible during panning.
- **FR-005**: Players MUST be able to zoom the map in and out using the mouse scroll wheel.
- **FR-006**: Zoom MUST be centered on the current cursor position, so the tile under the cursor remains stationary as zoom changes.
- **FR-007**: The zoom level MUST be bounded between a defined minimum and maximum — the map cannot be zoomed to an unusable size in either direction.
- **FR-008**: Pan boundary clamping MUST account for the current zoom level — as the map is zoomed out, pan range decreases; when the full map fits in the window, panning is effectively disabled.
- **FR-009**: Normal click-to-select interactions on tiles and units MUST continue to function correctly at all zoom levels and pan offsets.
- **FR-010**: The map coordinate system (tile selection, AI targeting, unit movement) MUST correctly account for the current pan offset and zoom level at all times.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After starting a second game following a completed game, zero UI artifacts from the previous session are visible anywhere on screen.
- **SC-002**: On a large map (e.g., 30×30 tiles or larger), the player can navigate to any tile on the map using pan and zoom without any tile being permanently inaccessible.
- **SC-003**: Clicking a tile at any zoom level and pan offset correctly selects that tile — no click-target misalignment occurs.
- **SC-004**: Zooming in or out responds within one frame of the scroll event with no perceptible lag.
- **SC-005**: The viewport never displays empty/blank space beyond the map edges during panning or after zooming.

## Assumptions

- Panning is controlled exclusively via left-click drag on the map canvas; no keyboard-based pan (WASD/arrow keys) is required in this iteration.
- Default zoom range is 0.5× (zoomed out) to 2.5× (zoomed in), with 1.0× being the initial/default level. These values may be adjusted during implementation.
- The game currently has a single renderer/stage; the ghost panel bug is caused by inadequate cleanup between game sessions, not a fundamental architecture issue.
- Touch/pinch-to-zoom (mobile) is out of scope for this feature; only mouse-based controls are required.
- The map is always rectangular; clamping logic assumes a fixed-size grid.
