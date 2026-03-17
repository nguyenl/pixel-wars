# Feature Specification: Mobile Browser Support

**Feature Branch**: `010-mobile-browser-support`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "Make the game mobile browser friendly. Move the status bar at the top to be at the top of the game window. The user should be able to zoom and pan on the mobile browser. Currently in a mobile browser, selecting and moving units does not work."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select and Move Units on Mobile (Priority: P1)

A player opens Pixel Wars on a mobile phone or tablet browser. They tap on one of their units to select it, see the reachable and attackable tile highlights, and then tap a destination tile to move or attack. The interaction feels natural and responsive — a single tap selects, a second tap on a valid tile executes the action — just as clicking does on desktop.

**Why this priority**: Without functioning unit selection and movement, the game is completely unplayable on mobile. This is the core blocker.

**Independent Test**: Open the game on a mobile device, start a new game, tap a unit to select it, tap a reachable tile to move it, and tap an enemy unit to attack. All three actions succeed without desktop input.

**Acceptance Scenarios**:

1. **Given** the game is loaded on a mobile browser and it is the player's turn, **When** the player taps on one of their units, **Then** the unit is selected and reachable/attackable tiles are highlighted.
2. **Given** a unit is selected and reachable tiles are highlighted, **When** the player taps a reachable tile, **Then** the unit moves to that tile with the movement animation.
3. **Given** a unit is selected and an enemy unit is within attack range, **When** the player taps the enemy unit, **Then** the attack executes with the combat animation.
4. **Given** a unit is selected, **When** the player taps an empty non-reachable tile, **Then** the unit is deselected.

---

### User Story 2 - Pan and Zoom the Map on Mobile (Priority: P1)

A player navigates the game map on a mobile device using familiar touch gestures. They drag one finger to pan the map and pinch with two fingers to zoom in and out. The gestures feel smooth and do not interfere with unit selection (a quick tap selects; a drag pans).

**Why this priority**: Without pan and zoom, the player cannot see the full map or focus on specific areas, making the game unusable on mobile.

**Independent Test**: Open the game on a mobile device, drag one finger across the screen to pan the map, and pinch to zoom in/out. The map moves and scales smoothly without accidentally selecting units.

**Acceptance Scenarios**:

1. **Given** the game map is displayed on a mobile browser, **When** the player drags one finger across the screen, **Then** the map pans in the direction of the drag.
2. **Given** the map is displayed, **When** the player pinches two fingers together, **Then** the map zooms out.
3. **Given** the map is displayed, **When** the player spreads two fingers apart, **Then** the map zooms in.
4. **Given** the player performs a quick tap (no drag), **When** the tap lands on a unit, **Then** the unit is selected (not treated as a pan gesture).
5. **Given** the player is zoomed in, **When** they pan the map, **Then** the map does not scroll past its edges (same clamping behavior as desktop).

---

### User Story 3 - Status Bar Positioned at Top of Game Window (Priority: P2)

The HUD status bar (showing player name, funds, turn number, phase, and the End Turn button) is displayed at the top of the game viewport rather than at the very top of the browser window. On mobile, this means it remains visible without being obscured by the browser's address bar or any safe-area insets, and it stays fixed at the top of the game canvas.

**Why this priority**: The status bar provides critical game information. Repositioning it improves usability on mobile where browser chrome can overlap fixed-top elements.

**Independent Test**: Open the game on a mobile browser, verify the status bar appears at the top of the game window below the browser chrome, and confirm it remains visible when scrolling or zooming.

**Acceptance Scenarios**:

1. **Given** the game is loaded on a mobile browser, **When** the player views the game, **Then** the status bar is visible at the top of the game viewport, not obscured by browser chrome.
2. **Given** the game is running, **When** the player taps the "End Turn" button on the status bar, **Then** the turn ends correctly (button is large enough to tap reliably).
3. **Given** the game is on a device with a notch or rounded corners, **When** the status bar renders, **Then** it respects safe-area insets and no content is clipped.

---

### User Story 4 - Mobile-Friendly UI Panels (Priority: P2)

The unit info panel, production menu, and upgrade panel are appropriately sized and positioned for touch interaction on mobile screens. Buttons and interactive elements are large enough to tap without precision issues.

**Why this priority**: Even with working input and map navigation, small or poorly-positioned UI elements make the game frustrating to play on mobile.

**Independent Test**: On a mobile device, select a unit and verify the info panel is readable. Tap a city and verify the production menu buttons are tappable without difficulty.

**Acceptance Scenarios**:

1. **Given** a unit is selected on a mobile device, **When** the unit info panel appears, **Then** it is readable and does not overlap critical game content.
2. **Given** a city is selected on a mobile device, **When** the production menu appears, **Then** all production buttons are large enough to tap accurately (minimum 44×44 point tap target).
3. **Given** any UI panel is displayed, **When** the player interacts with the game canvas behind it, **Then** taps on the panel do not pass through to the game map.

---

### User Story 5 - Prevent Unwanted Browser Behaviors (Priority: P3)

When playing on mobile, the game prevents default mobile browser behaviors that would disrupt gameplay — such as pull-to-refresh, page bouncing/overscroll, double-tap-to-zoom on the page, and text selection on UI elements.

**Why this priority**: Without suppressing these defaults, the game feels broken on mobile. However, this is a polish concern after core input works.

**Independent Test**: On a mobile browser, attempt pull-to-refresh while playing, double-tap the canvas, and long-press a UI element. None of these trigger browser-default behaviors.

**Acceptance Scenarios**:

1. **Given** the game is running on a mobile browser, **When** the player pulls down on the game canvas, **Then** the browser does not trigger pull-to-refresh.
2. **Given** the game is running, **When** the player double-taps the canvas, **Then** the browser does not zoom the page (game zoom may apply if implemented).
3. **Given** the game is running, **When** the player long-presses on a UI element, **Then** no text selection or context menu appears.

---

### Edge Cases

- What happens when the player starts a two-finger pinch but lifts one finger mid-gesture? The gesture should transition smoothly to single-finger pan without jumping.
- What happens when the device is rotated from portrait to landscape during gameplay? The game should resize correctly and the status bar should reposition.
- What happens when the mobile keyboard appears (e.g., from an accidental input focus)? The game should not trigger any text input fields.
- What happens when the player taps on the boundary between two tiles? The nearest tile center should be selected.
- What happens when the player's touch drifts slightly during a tap (small movement)? A tap with minor drift (under a threshold) should still register as a tap, not a pan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST respond to touch input (tap, drag, pinch) on mobile browsers for all interactions currently handled by mouse input on desktop.
- **FR-002**: A single-finger tap MUST function as the equivalent of a mouse click for unit selection, movement commands, attack commands, city interaction, and button presses.
- **FR-003**: A single-finger drag MUST pan the map, equivalent to mouse-drag panning on desktop.
- **FR-004**: A two-finger pinch gesture MUST zoom the map in and out, equivalent to mouse-wheel zoom on desktop.
- **FR-005**: The system MUST distinguish between a tap (quick touch with minimal movement) and a drag (sustained touch with movement beyond a threshold) to prevent accidental panning when the player intends to tap.
- **FR-006**: The HUD status bar MUST be rendered at the top of the game viewport, accounting for browser chrome and safe-area insets on mobile devices.
- **FR-007**: All interactive UI elements (buttons, menu items) MUST have a minimum tap target size of 44×44 CSS pixels for comfortable touch interaction.
- **FR-008**: The game MUST prevent default mobile browser gestures that conflict with gameplay, including pull-to-refresh, page overscroll, double-tap-to-zoom, and long-press context menus.
- **FR-009**: The game viewport MUST prevent user scaling of the page itself (the game handles its own zoom), using appropriate viewport configuration.
- **FR-010**: The game MUST handle device orientation changes (portrait ↔ landscape) by resizing the canvas and repositioning UI elements correctly.
- **FR-011**: All existing desktop mouse interactions MUST continue to work identically — mobile support must not break desktop play.
- **FR-012**: Touch interactions on UI panels (unit info, production menu, upgrade panel) MUST NOT pass through to the game canvas beneath them.

## Assumptions

- The game targets modern mobile browsers (Safari on iOS 15+, Chrome on Android 10+) that support standard touch events.
- The existing viewport meta tag (`<meta name="viewport" content="width=device-width, initial-scale=1.0">`) will be updated as needed but no server-side changes are required (browser-only game).
- Hover highlighting (showing which tile the cursor is over) has no equivalent on mobile and will simply not display — this is acceptable since mobile users will rely on tile highlights from selection.
- The tile size (32px) and zoom range (0.5x–2.5x) remain the same; no tile-size adjustments are needed specifically for mobile since zoom handles readability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can complete a full game (start, select units, move, attack, capture cities, win) entirely via touch input on a mobile browser without needing desktop input.
- **SC-002**: Map pan and zoom gestures respond within one frame of the touch input (no perceptible lag) and feel smooth during continuous interaction.
- **SC-003**: 95% of intended taps on units and tiles register correctly as taps (not misinterpreted as pan gestures) during normal play.
- **SC-004**: All UI buttons and interactive elements are comfortably tappable on screens as small as 375px wide (iPhone SE / small Android) without zooming in.
- **SC-005**: No default browser behaviors (pull-to-refresh, page zoom, context menus) interrupt gameplay during a play session on mobile.
- **SC-006**: The status bar is fully visible and not obscured by browser chrome on mobile devices, including those with notches or dynamic islands.
