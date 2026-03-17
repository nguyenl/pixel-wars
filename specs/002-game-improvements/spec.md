# Feature Specification: Game Improvements

**Feature Branch**: `002-game-improvements`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Improve the game with the following: The game should be centered vertically and horizontally on the screen. Create pixel art assets for the units. Start the game with 1 scout for each player for the city they own. Cities and towns have some vision. Maps are generated such that the opposing players are on opposite sides of the map. Maps are generated such that there are no islands and the players can reach each other."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Map Generation: Connected & Opposed Starting Positions (Priority: P1)

When a new game starts, the map is generated such that Player 1 begins on one side of the map and Player 2 begins on the opposite side. All land areas are fully connected — there are no isolated islands — so that players always have a viable land route to reach each other and any neutral settlement.

**Why this priority**: Map generation is the foundation of every game session. If the map is disconnected or players are not opposed, the game loop is broken before it begins.

**Independent Test**: Generate 10 maps of each size. Verify that (a) Player 1's starting city is always on one lateral side and Player 2's is on the opposite side, and (b) a land path exists between every pair of land tiles with settlements.

**Acceptance Scenarios**:

1. **Given** a new game is started, **When** the map is generated, **Then** Player 1's starting city is placed in the left or top half of the map and Player 2's starting city is in the right or bottom half (opposite quadrant).
2. **Given** a generated map, **When** any land tile with a settlement is inspected, **Then** a traversable land path exists from that tile to every other settlement on the map without crossing water.
3. **Given** map generation completes, **When** validated, **Then** no group of land tiles with settlements is completely surrounded by water and isolated from the rest of the land.
4. **Given** a Small, Medium, or Large map is generated, **When** the map is inspected, **Then** all three map sizes satisfy the connectivity and opposing-position constraints.

---

### User Story 2 - Starting Units: Scout per Player (Priority: P2)

Each player begins the game with one Scout unit already placed on their starting city tile, ready for orders on turn one — no production wait required.

**Why this priority**: Without starting units, players have no way to explore or act on turn one. The scout bootstraps early scouting and fog-of-war reveal, which is essential to the game experience from the very first turn.

**Independent Test**: Start a new game, immediately inspect both players' unit lists. Each player must have exactly one Scout on the map at their starting city.

**Acceptance Scenarios**:

1. **Given** a new game starts, **When** the map is first displayed, **Then** Player 1 has exactly one Scout unit positioned on their starting city tile.
2. **Given** a new game starts, **When** the map is first displayed, **Then** Player 2 (AI) has exactly one Scout unit positioned on their starting city tile.
3. **Given** the starting Scout exists, **When** it is the owning player's first turn, **Then** the Scout can immediately be selected and issued movement or attack orders without any production delay.
4. **Given** a player's starting Scout is destroyed, **When** that player's turn begins, **Then** they have no automatic replacement — a new unit must be produced via the standard production system.

---

### User Story 3 - Settlement Vision (Priority: P3)

Owned cities and towns reveal the tiles around them, contributing to the player's fog of war visibility even when no units are present nearby.

**Why this priority**: Settlement vision makes cities and towns strategically valuable beyond pure income. It also prevents the counterintuitive situation where a player cannot see their own capital city's surroundings.

**Independent Test**: Own a city with no adjacent units. Verify that tiles within the city's vision radius are visible to the owning player; tiles beyond are hidden.

**Acceptance Scenarios**:

1. **Given** a player owns a city with no units nearby, **When** the player views the map, **Then** tiles within the city's vision radius are visible and show terrain, units, and settlements.
2. **Given** a player owns a town with no units nearby, **When** the player views the map, **Then** tiles within the town's vision radius are visible.
3. **Given** a settlement is captured by the enemy, **When** ownership changes, **Then** the former owner no longer benefits from that settlement's vision, and the new owner immediately gains it.
4. **Given** a city and a town both owned by the same player are adjacent, **When** the player views the map, **Then** the combined vision of both settlements is applied (union of their vision radii).
5. **Given** a neutral settlement, **When** neither player owns it, **Then** neither player gains vision from it.

---

### User Story 4 - Pixel Art Unit Visuals (Priority: P4)

Each unit type (Scout, Infantry, Artillery) is displayed on the map using a distinct pixel art sprite. Player 1 and Player 2 units are visually differentiated by color or a color overlay, so each unit's type and ownership are immediately legible at a glance.

**Why this priority**: Pixel art visuals are the primary way players identify units on the map. Without them, gameplay comprehension and polish suffer significantly.

**Independent Test**: Start a game, produce or inspect all three unit types for both players. Verify each type has a unique sprite and each player's units are visually distinct from the opponent's.

**Acceptance Scenarios**:

1. **Given** a Scout is on the map, **When** the player views the map, **Then** the Scout is displayed as a unique pixel art sprite clearly different from Infantry and Artillery sprites.
2. **Given** an Infantry unit is on the map, **When** the player views the map, **Then** the Infantry is displayed as a unique pixel art sprite clearly different from Scout and Artillery sprites.
3. **Given** an Artillery unit is on the map, **When** the player views the map, **Then** the Artillery is displayed as a unique pixel art sprite clearly different from Scout and Infantry sprites.
4. **Given** both players have units of the same type on the map, **When** the player views the map, **Then** Player 1's unit and Player 2's unit are visually distinguishable (e.g., via player color).
5. **Given** fog of war hides a tile, **When** the tile is outside vision, **Then** no unit sprite is rendered on that tile regardless of what occupies it.

---

### User Story 5 - Game Viewport Centering (Priority: P5)

The game canvas is centered both horizontally and vertically within the browser window, regardless of window size or map size selected, so the game always appears centered on screen.

**Why this priority**: Centering the viewport is a baseline polish and usability requirement. Without it, the game may appear off-center or clipped, degrading the player experience.

**Independent Test**: Open the game in browser windows of varying sizes (narrow, wide, standard). Verify the game canvas is always centered both horizontally and vertically.

**Acceptance Scenarios**:

1. **Given** the game is opened in a standard-width browser window, **When** the main menu or game map is displayed, **Then** the game canvas is centered horizontally and vertically within the visible browser area.
2. **Given** the browser window is resized, **When** the resize completes, **Then** the game canvas remains centered without requiring a page refresh.
3. **Given** a Small map is displayed, **When** the canvas is smaller than the window, **Then** equal whitespace or background appears on all sides of the canvas.
4. **Given** a Large map is displayed, **When** the canvas exceeds the window dimensions, **Then** the game is scrollable and the initial view is centered on the map's center.

---

### Edge Cases

- What happens when map generation cannot satisfy the connectivity constraint within a reasonable number of attempts? (The generator retries with a new seed; after a configurable maximum number of retries, it falls back to a known-valid algorithm that guarantees connectivity.)
- What happens if a player's starting city tile is occupied by their starting Scout and an enemy unit attacks that tile on turn one? (Standard combat rules apply; the Scout defends, and if destroyed, the city remains but the Scout is gone.)
- What happens to settlement vision when a player loses their last unit but still owns settlements? (Settlements continue to provide vision as long as they are owned.)
- What happens on very small maps where placing players on "opposite sides" leaves little distance between starting cities? (The generator maximizes the distance between starting cities relative to map size; on Small maps the minimum guaranteed separation is half the map's shorter dimension.)
- What if a unit sprite asset fails to load? (A fallback colored placeholder shape is rendered so gameplay is not blocked.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate maps such that Player 1's starting city and Player 2's starting city are placed on opposite sides of the map (e.g., left half vs. right half, or top half vs. bottom half), maximizing their initial distance.
- **FR-002**: Map generation MUST guarantee that all land tiles containing settlements are reachable from all other settlement land tiles via a traversable land path (no isolated settlement islands).
- **FR-003**: Map generation MUST retry with a new random seed if the generated map fails the connectivity or opposing-position constraint, up to a maximum retry limit before falling back to a guaranteed algorithm.
- **FR-004**: Each player MUST begin every new game session with exactly one Scout unit pre-placed on their starting city tile, at no cost and with no production wait.
- **FR-005**: Owned cities MUST grant their owning player vision over tiles within a defined city vision radius (assumption: 3 tiles), updating fog of war as part of the standard visibility calculation each turn.
- **FR-006**: Owned towns MUST grant their owning player vision over tiles within a defined town vision radius (assumption: 2 tiles), updating fog of war as part of the standard visibility calculation each turn.
- **FR-007**: Settlement vision MUST transfer immediately when a settlement changes ownership: the new owner gains vision, the previous owner loses it.
- **FR-008**: Neutral settlements MUST NOT grant vision to either player.
- **FR-009**: System MUST display each unit type (Scout, Infantry, Artillery) using a distinct pixel art sprite on the game map.
- **FR-010**: System MUST visually differentiate units belonging to Player 1 from those belonging to Player 2 (e.g., via player-colored sprite variants or color overlay).
- **FR-011**: Unit sprites MUST NOT be rendered on tiles that are hidden by fog of war for the viewing player.
- **FR-012**: System MUST center the game canvas both horizontally and vertically within the browser viewport on initial load and on window resize.
- **FR-013**: If the game canvas is smaller than the viewport, equal spacing MUST appear on all sides of the canvas.
- **FR-014**: If the game canvas or map exceeds the viewport dimensions, the view MUST be scrollable and the initial view position MUST be centered on the map.

### Key Entities

- **Map**: Extended from spec 001 — now also carries a connectivity guarantee and a player-separation constraint applied at generation time.
- **Settlement (City or Town)**: Extended from spec 001 — now carries a `visionRadius` attribute (city: 3 tiles, town: 2 tiles) that contributes to the owning player's visible tile set.
- **Unit**: Extended from spec 001 — now includes a `spriteAsset` reference that resolves to a player-colored pixel art sprite for rendering.
- **Starting Unit**: A Scout unit automatically created and placed at each player's starting city at game initialization, before the first turn begins.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across 20 consecutively generated maps of any size, 100% have Player 1 and Player 2 starting cities placed on opposite halves of the map.
- **SC-002**: Across 20 consecutively generated maps of any size, 100% are fully connected — every settlement is reachable from every other settlement by land.
- **SC-003**: Every new game session begins with exactly 1 Scout unit visible at each player's starting city before any turn is taken, verified across 10 new game starts.
- **SC-004**: Owning a city with no nearby units reveals at least the tiles within a 3-tile radius of that city to the owning player, confirmed in 100% of tested scenarios.
- **SC-005**: Owning a town with no nearby units reveals at least the tiles within a 2-tile radius of that town to the owning player, confirmed in 100% of tested scenarios.
- **SC-006**: All three unit types (Scout, Infantry, Artillery) display visually distinct pixel art sprites, and Player 1 and Player 2 units of the same type are visually distinguishable, confirmed by visual inspection across all unit types.
- **SC-007**: The game canvas is centered horizontally and vertically in the browser viewport in 100% of tested window sizes (narrow, standard, wide, tall).
- **SC-008**: Map generation (including connectivity validation and retry) completes within the existing 5-second new game startup budget defined in spec 001 SC-001.

## Assumptions

- **Player Sides**: "Opposite sides" means one player's city is in the left/top half and the other's is in the right/bottom half. The exact axis (horizontal vs. vertical) may be chosen by the generator to best fit the map shape.
- **City Vision Radius**: 3 tiles (Manhattan or Chebyshev distance — exact method confirmed during design phase).
- **Town Vision Radius**: 2 tiles (same distance method as city).
- **Starting Scout Cost**: The starting Scout is provided free of charge and does not deduct from the player's initial $200 funds.
- **Connectivity Definition**: A settlement-bearing land tile is "connected" if it can be reached from every other settlement-bearing land tile by moving through land tiles only (water tiles are never part of a land path).
- **Sprite Assets**: Pixel art sprites are created as static image assets (not procedurally generated at runtime). Each unit type has two color variants — one per player.
- **Viewport Centering**: Centering applies to the game canvas as a whole. Camera panning within the map (for maps larger than the viewport) is a separate concern handled by the existing rendering system; only the canvas's position in the page layout is governed by this feature.
- **Retry Budget**: Map generation is allowed up to 10 retries before falling back to a guaranteed-connectivity algorithm; this keeps startup time within budget.
- **No Naval Units**: Water remains fully impassable, consistent with spec 001 assumptions.
