# Feature Specification: 3D WebGL Rendering Upgrade

**Feature Branch**: `016-canvas-to-webgl`
**Created**: 2026-03-28
**Status**: Draft
**Input**: User description: "Switch the UI rendering from 2D Canvas to 3D Webgl. Update all the assets and graphics to support this."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Game Renders in 3D WebGL (Priority: P1)

When a player loads the game, all visual elements — map tiles, units, bases, fog of war, and UI overlays — are rendered using hardware-accelerated 3D WebGL with a perspective or isometric viewpoint rather than the flat top-down 2D canvas view.

**Why this priority**: This is the core deliverable. All other stories depend on rendering working correctly first.

**Independent Test**: Launch the game, verify the browser is using WebGL context, and confirm the map appears with depth/perspective. Delivers a fully playable (if visually rough) 3D game world.

**Acceptance Scenarios**:

1. **Given** the game is launched in a WebGL-capable browser, **When** the main game scene loads, **Then** all tiles, terrain, and units are rendered with visible depth/perspective consistent with an isometric or 3D viewpoint.
2. **Given** the game is running, **When** a player inspects the browser rendering context, **Then** the canvas element uses a WebGL (or WebGL2) context, not a 2D context.
3. **Given** the game is running on a device without WebGL support, **When** the game attempts to initialize, **Then** the player sees a clear error message explaining the requirement.

---

### User Story 2 - Updated Tile and Terrain Graphics (Priority: P2)

All map tiles (grass, forest, mountain, water, desert, snow) and terrain features display as 3D-styled visuals — either via updated sprite art with depth shading or as rendered 3D geometry — so the world feels grounded and spatially coherent.

**Why this priority**: Terrain covers the majority of screen real estate; upgrading tile visuals delivers the largest immediate visual impact after the renderer switch.

**Independent Test**: Generate a new map and verify all terrain tile types render with 3D depth cues (shading, height variation, or isometric projection). Each tile type remains visually distinguishable.

**Acceptance Scenarios**:

1. **Given** a map is generated, **When** tiles are displayed, **Then** each terrain type has a distinct 3D-styled appearance with visible depth shading or geometric form.
2. **Given** mountain terrain exists on the map, **When** viewed in 3D, **Then** mountains appear visually elevated relative to flat terrain.
3. **Given** water terrain exists, **When** viewed in 3D, **Then** water appears at a lower visual elevation than land tiles.

---

### User Story 3 - Updated Unit and Base Graphics (Priority: P3)

Player and AI units and bases are represented by 3D-styled visuals that are clearly readable against the updated terrain, with team colors and status indicators remaining visible and distinguishable.

**Why this priority**: Units are the primary interactive objects; they must be visually distinct and readable after the terrain upgrade.

**Independent Test**: Spawn units for multiple teams, verify each unit and base renders in 3D style with correct team color and is distinguishable from background terrain.

**Acceptance Scenarios**:

1. **Given** units are present on the map, **When** rendered in 3D WebGL, **Then** each unit displays with team color, is visually distinguishable from terrain, and appears raised/elevated above the tile surface.
2. **Given** a base tile is captured by a team, **When** rendered, **Then** the base structure appears as a 3D form with the correct team color.
3. **Given** a unit is selected, **When** rendered, **Then** the selection indicator renders correctly in 3D space without clipping into or below the tile surface.

---

### User Story 4 - UI Overlays and HUD Remain Functional (Priority: P4)

All HUD elements — turn indicator, team scores, action panels, damage numbers, fog of war, and win/loss screens — continue to work correctly and remain readable over the 3D game world.

**Why this priority**: Game is unplayable without working UI even if the 3D world renders correctly.

**Independent Test**: Play through a full game turn — move a unit, attack an enemy, observe damage numbers, end turn — and verify all UI elements display correctly without graphical artifacts.

**Acceptance Scenarios**:

1. **Given** a unit attacks, **When** damage numbers appear, **Then** they float above the correct 3D position and are readable against the new background.
2. **Given** fog of war is active, **When** tiles are in fog, **Then** the fog overlay renders correctly over the 3D terrain without exposing hidden tiles.
3. **Given** a game ends, **When** the win/loss screen appears, **Then** the overlay displays correctly over the 3D scene.

---

### Edge Cases

- What happens when the player's device supports WebGL1 but not WebGL2 — does the game degrade gracefully or fail?
- How does the camera/perspective handle map edges — do tiles near the border appear correctly without clipping or distortion?
- What happens when zooming and panning — do 3D depth cues remain consistent across zoom levels?
- How does fog of war rendering interact with 3D elevation differences (e.g., does fog obscure elevated mountain tiles correctly)?
- What happens to performance on low-end mobile devices — does framerate remain acceptable?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST render all visual output using a WebGL (hardware-accelerated 3D) graphics context rather than a 2D canvas context.
- **FR-002**: All terrain tile types (grass, forest, mountain, water, desert, snow) MUST display with 3D-styled visuals including visible depth cues such as shading, elevation, or geometric form.
- **FR-003**: Mountain tiles MUST appear visually elevated above flat terrain; water tiles MUST appear visually lower than land tiles.
- **FR-004**: All unit sprites MUST be updated to 3D-styled representations that appear raised above the tile surface.
- **FR-005**: All base structures MUST be updated to 3D-styled representations with correct team color markings.
- **FR-006**: Team color indicators MUST remain clearly visible and distinguishable on units and bases in the 3D view.
- **FR-007**: The selection highlight for units MUST render correctly in 3D space without clipping into tile geometry.
- **FR-008**: Damage numbers MUST appear at the correct 3D world position above affected units.
- **FR-009**: Fog of war MUST render correctly over the 3D terrain, obscuring hidden areas without visual artifacts.
- **FR-010**: All existing HUD elements (turn counter, score panel, action menus, win/loss overlays) MUST remain functional and readable.
- **FR-011**: The game MUST display a clear error message when launched on a device that does not support WebGL.
- **FR-012**: Map panning and zooming MUST continue to work correctly in the 3D scene.
- **FR-013**: The 3D camera MUST use a consistent viewpoint (isometric or fixed perspective) that does not distort tiles near map edges.

### Key Entities

- **Tile Mesh**: A renderable 3D representation of a map tile, including elevation offset per terrain type and material/texture for visual appearance.
- **Unit Visual**: A 3D-styled sprite or mesh representing a game unit, positioned above its tile with team color applied.
- **Base Visual**: A 3D-styled structure mesh representing a captured or neutral base, positioned at tile center.
- **Scene Camera**: The 3D camera or projection that defines the player's viewpoint — determines the isometric/perspective angle and governs pan/zoom behavior.
- **WebGL Render Context**: The hardware-accelerated graphics context that replaces the 2D canvas context for all rendering operations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All terrain types render with visually distinct 3D depth cues; a test player can identify each terrain type by appearance alone without any labels.
- **SC-002**: A full game session (from map generation to win/loss screen) completes without any visual artifacts, missing assets, or rendering errors in the browser console.
- **SC-003**: The game maintains a playable frame rate (≥ 30 FPS) on mid-range hardware during normal gameplay on maps up to the maximum supported size.
- **SC-004**: All existing gameplay features (movement, combat, fog of war, AI turns, HUD) remain fully functional after the rendering switch — no gameplay regression.
- **SC-005**: The game loads and begins rendering within the same time as the current 2D version (no more than a 20% increase in initial load time).
- **SC-006**: On devices without WebGL support, the player receives an informative error message rather than a blank screen or unhandled exception.
- **SC-007**: Unit and base visuals are readable and distinguishable by team color at all supported zoom levels.

## Assumptions

- The 3D viewpoint will be **isometric or fixed oblique perspective** — the game is not expected to become a free-camera 3D game. The camera angle is fixed and consistent with a classic strategy game aesthetic.
- Assets (tile textures, unit visuals, base visuals) will be **procedurally generated or recreated programmatically** as part of this feature, since the project currently uses programmatic graphics rather than external art files.
- The underlying game logic (pathfinding, combat, AI, state management) is **not changed** — this is a rendering-layer change only.
- Mobile support is preserved: the 3D renderer must work in mobile browsers with WebGL support.
- The existing pan/zoom input handling is reused or adapted — the control scheme for navigating the map does not change.
- Performance on desktop mid-range hardware is the baseline; mobile is secondary but should not regress.
