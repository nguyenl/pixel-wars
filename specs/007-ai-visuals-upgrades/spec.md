# Feature Specification: AI Visuals, Map Expansion & Settlement Upgrades

**Feature Branch**: `007-ai-visuals-upgrades`
**Created**: 2026-03-16
**Status**: Draft
**Input**: User description: "Add movement animations to the AI's turn so that the player is aware of the moves the AI is making. Double the playing field size for each of the maps. Add a 'thinking' indicator when the AI is thinking of moves. Increase the max thinking time to 5 seconds. Change the tile image of the cities to look like a city. Change the tile image of the settlement to look like a settlement. Add the ability to upgrade a settlement into a city for the cost of $500."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Turn Visibility (Priority: P1)

As a player, I want to see the AI's units move during its turn so I can understand what strategic decisions the AI is making and respond accordingly. Currently, the AI turn resolves instantly with no visual feedback, making it impossible to follow the AI's actions.

**Why this priority**: Without visible AI movement, the player has no awareness of what happened during the AI's turn. This is the highest-impact UX issue—it makes the game feel opaque and unstrategic.

**Independent Test**: Can be fully tested by starting a game, ending the player's turn, and observing that each AI unit animates along its movement path one at a time (or in a readable sequence). Delivers immediate gameplay clarity.

**Acceptance Scenarios**:

1. **Given** it is the AI's turn and the AI has units to move, **When** the AI decides to move a unit, **Then** the unit visually animates along its movement path at a pace the player can follow.
2. **Given** the AI moves multiple units in a single turn, **When** the moves are executed, **Then** each unit's movement is shown sequentially so the player can track each action individually.
3. **Given** an AI unit attacks after moving, **When** the attack occurs, **Then** the attack animation plays after the movement animation completes.
4. **Given** the AI's turn is playing out, **When** animations are in progress, **Then** the player cannot interact with the game (input is locked) until the AI turn completes.

---

### User Story 2 - AI Thinking Indicator (Priority: P2)

As a player, I want to see a visual indicator when the AI is computing its moves so I know the game hasn't frozen and I can anticipate the AI's turn starting.

**Why this priority**: With the increased thinking time (up to 5 seconds), a lack of feedback could make the player think the game has crashed. This is essential UX alongside the longer AI computation window.

**Independent Test**: Can be tested by ending the player's turn and verifying a thinking indicator appears during the AI's computation phase, then disappears when AI actions begin playing.

**Acceptance Scenarios**:

1. **Given** the player ends their turn, **When** the AI begins computing its moves, **Then** a visible "thinking" indicator appears on screen.
2. **Given** the AI is computing moves, **When** computation completes and AI actions begin animating, **Then** the thinking indicator disappears.
3. **Given** the AI's maximum thinking time is reached, **When** the time limit expires, **Then** the AI proceeds with its best available moves and the indicator transitions to the action phase.

---

### User Story 3 - Distinct Settlement & City Visuals (Priority: P3)

As a player, I want cities to visually look like cities and settlements (towns) to visually look like settlements so I can quickly distinguish between them on the map without needing to hover or click.

**Why this priority**: Visual clarity directly impacts strategic decision-making. Currently both settlement types are rendered as colored diamonds, making them hard to distinguish at a glance.

**Independent Test**: Can be tested by starting a new game and visually verifying that cities display a city-like tile image and towns display a settlement-like tile image, each clearly distinct from one another and from terrain.

**Acceptance Scenarios**:

1. **Given** a tile contains a city, **When** the map is rendered, **Then** the tile displays an image that is recognizably a city (e.g., multiple buildings, towers, or an urban silhouette).
2. **Given** a tile contains a town/settlement, **When** the map is rendered, **Then** the tile displays an image that is recognizably a small settlement (e.g., a few houses, a village cluster).
3. **Given** cities and towns are on the map, **When** the player views the map, **Then** the two types are visually distinct from each other at any zoom level.
4. **Given** a settlement has an owner, **When** rendered, **Then** the ownership indicator (player color) remains visible alongside the new imagery.

---

### User Story 4 - Larger Maps (Priority: P4)

As a player, I want larger maps to play on so games feel more expansive and strategic, with more room for maneuvering and territory control.

**Why this priority**: Doubling map sizes increases replayability and strategic depth. This is independent of other changes and enhances the overall game experience.

**Independent Test**: Can be tested by selecting each map size option and verifying the playing field dimensions are doubled compared to the previous values. The map should generate correctly with appropriate settlement counts and terrain distribution.

**Acceptance Scenarios**:

1. **Given** the player selects the "small" map size, **When** the map generates, **Then** the playing field is twice the previous small map dimensions (was 10×10, now 20×20).
2. **Given** the player selects the "medium" map size, **When** the map generates, **Then** the playing field is twice the previous medium map dimensions (was 15×15, now 30×30).
3. **Given** the player selects the "large" map size, **When** the map generates, **Then** the playing field is twice the previous large map dimensions (was 20×20, now 40×40).
4. **Given** a doubled map size, **When** the map generates, **Then** settlements, terrain, and starting positions are appropriately distributed for the larger area.

---

### User Story 5 - Upgrade Settlement to City (Priority: P5)

As a player, I want to upgrade a town I own into a city by spending $500 so I can increase my income and gain access to unit production at that location.

**Why this priority**: This adds a meaningful economic decision to the game—invest in infrastructure or spend on units. It creates strategic depth but depends on existing mechanics working well first.

**Independent Test**: Can be tested by capturing a town, accumulating $500, and verifying the upgrade action converts the town into a city with all city benefits (income, production capability, vision range).

**Acceptance Scenarios**:

1. **Given** the player owns a town and has at least $500, **When** the player selects the town and chooses to upgrade it, **Then** the town becomes a city and $500 is deducted from the player's gold.
2. **Given** the player owns a town but has less than $500, **When** the player attempts to upgrade, **Then** the upgrade option is unavailable or clearly indicates insufficient funds.
3. **Given** a town is upgraded to a city, **When** the next turn begins, **Then** the city generates city-level income ($100/turn instead of $50/turn) and can produce units.
4. **Given** a town is upgraded to a city, **When** the map is rendered, **Then** the tile updates to display the city visual immediately.
5. **Given** the AI owns a town and has sufficient funds, **When** it is the AI's turn, **Then** the AI may choose to upgrade towns to cities as part of its strategy.

---

### User Story 6 - Increased AI Thinking Time (Priority: P6)

As a player, I want the AI to have up to 5 seconds to compute its moves (increased from 2.5 seconds) so the AI can make smarter, deeper strategic decisions on larger maps.

**Why this priority**: With doubled map sizes and more units, the AI needs more computation time to evaluate positions effectively. This is a configuration change that supports the other improvements.

**Independent Test**: Can be tested by observing that the AI's computation phase takes up to 5 seconds on larger maps before moves begin animating.

**Acceptance Scenarios**:

1. **Given** it is the AI's turn, **When** the AI begins computing, **Then** it uses up to 5 seconds of thinking time before executing moves.
2. **Given** the AI finishes computing before the 5-second limit, **When** the optimal move set is determined early, **Then** the AI proceeds immediately without waiting for the full 5 seconds.

---

### Edge Cases

- What happens if the AI has no units to move? The thinking indicator should still briefly appear, then the turn ends with a short transition.
- What happens if the player loses connection or the game tab is backgrounded during AI animations? Animations should complete normally when the tab regains focus, or skip to the final state if excessively delayed.
- What happens if the player attempts to upgrade a town during the AI's turn? The action should be blocked; upgrades are only available during the player's turn.
- What happens if a town is captured on the same turn the player intended to upgrade it? The upgrade action should not be available for towns the player does not currently own.
- What happens with map generation on doubled sizes? Settlement count and separation distances should scale proportionally to maintain gameplay balance.
- What if the AI wants to upgrade a town but can't afford it? The AI should skip the upgrade and continue with other actions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST animate each AI unit's movement along its path during the AI's turn, visible to the player.
- **FR-002**: AI unit actions (move, attack, capture) MUST play sequentially so the player can follow each action individually.
- **FR-003**: Player input MUST be locked during the AI's turn animation sequence.
- **FR-004**: The game MUST display a "thinking" indicator while the AI is computing its moves.
- **FR-005**: The thinking indicator MUST appear immediately when the AI's computation phase begins and disappear when actions start animating.
- **FR-006**: The AI's maximum computation time MUST be increased to 5 seconds (from 2.5 seconds).
- **FR-007**: City tiles MUST display an image that is recognizably a city (multi-building or urban appearance).
- **FR-008**: Town/settlement tiles MUST display an image that is recognizably a small settlement (village or cluster of houses).
- **FR-009**: City and town visuals MUST be clearly distinguishable from each other and from terrain tiles.
- **FR-010**: Settlement ownership (player color) MUST remain visible with the new settlement imagery.
- **FR-011**: The "small" map size MUST be 20×20 tiles (doubled from 10×10).
- **FR-012**: The "medium" map size MUST be 30×30 tiles (doubled from 15×15).
- **FR-013**: The "large" map size MUST be 40×40 tiles (doubled from 20×20).
- **FR-014**: Settlement counts and placement spacing MUST scale proportionally for the doubled map sizes.
- **FR-015**: Players MUST be able to upgrade a town they own into a city for a cost of $500.
- **FR-016**: The upgrade action MUST only be available when the player has at least $500 and the selected settlement is a town they own.
- **FR-017**: Upon upgrading, the town MUST immediately become a city with all city benefits (higher income, unit production, increased vision range).
- **FR-018**: The AI MUST be capable of upgrading its own towns to cities when it has sufficient funds.
- **FR-019**: The upgraded settlement's visual MUST update immediately on the map upon upgrade.

### Key Entities

- **Settlement**: A map location that can be either a town or a city. Has an owner (player, AI, or neutral), a type, and associated income/production capabilities. Towns can be upgraded to cities.
- **AI Turn Sequence**: The ordered sequence of AI actions for a turn, including computation phase (with thinking indicator) and execution phase (with sequential animations).
- **Upgrade Action**: A player or AI action that converts a town into a city at a fixed cost ($500), granting increased income and production access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can visually track every AI unit's movement during the AI's turn without any actions being invisible or instantaneous.
- **SC-002**: The AI thinking indicator is visible for the entire duration of the AI's computation phase, providing uninterrupted feedback.
- **SC-003**: Players can distinguish cities from towns on the map within 1 second of viewing, without needing to click or hover.
- **SC-004**: All three map sizes generate correctly at their doubled dimensions with proportionally distributed settlements and balanced gameplay.
- **SC-005**: Players can successfully upgrade a town to a city in under 3 clicks/actions, with clear feedback on cost and result.
- **SC-006**: The AI uses up to 5 seconds of thinking time, resulting in measurably deeper strategic play on larger maps.

## Assumptions

- The AI turn animation speed should be fast enough to be informative but not tediously slow. A reasonable pace is the existing per-tile movement animation duration (150ms/tile).
- The thinking indicator will be a simple visual element (e.g., animated spinner or pulsing text) overlaid on the game view—not a modal dialog that obscures the map.
- Settlement visual changes will use drawn graphics or small pixel-art sprites consistent with the existing rendering style and game aesthetic.
- The upgrade action is available through the existing settlement selection UI when a player selects a town they own during their turn.
- Doubled map sizes will require proportionally scaling settlement counts: small (6-8 towns), medium (10-12 towns), large (16-20 towns) to maintain gameplay density.
- The AI will consider upgrading towns when it has excess gold and upgrading would provide strategic benefit (e.g., needing a production city in a forward position).
