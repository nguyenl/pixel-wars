# Feature Specification: Unit Animations, Visual Polish, and Combat Fixes

**Feature Branch**: `004-unit-animations-combat-fixes`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Add animations to the units. For each of the tiles, add more detail so that it's not flat. Improve the ui by highlighting the tile under the cursor if it is a position that can be moved to by the selected unit. Add basic sounds when selecting, moving, or attacking units. When I select a unit to attack another unit, it disappears into the enemy unit. Fix a bug where attacking a unit doesn't work. Ensure that two units cannot occupy the same tile."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Combat Works Correctly (Priority: P1)

A player selects a friendly unit and clicks an adjacent enemy unit to attack. The attack resolves correctly — the attacker stays in place, the defender loses HP (or is destroyed), and neither unit merges into the other's tile. No two units ever share a tile at any point during gameplay.

**Why this priority**: The attack system is completely broken — units disappear into enemies when attack is attempted, the attack action may silently fail, and units can illegally share a tile. Without fixing this, the game is unplayable.

**Independent Test**: Start a game, select a friendly unit adjacent to an enemy, click the enemy to attack. The attacker stays on its tile, the defender loses HP, and no illegal tile sharing occurs.

**Acceptance Scenarios**:

1. **Given** a friendly unit is selected and an enemy is in attack range, **When** the player clicks the enemy unit's tile, **Then** the attack action fires (not a move action), the attacker remains on its original tile, and the defender's HP decreases.
2. **Given** a unit has already attacked this turn, **When** the player clicks an enemy, **Then** no attack fires and no move to the enemy tile occurs.
3. **Given** any two units of any ownership, **When** any game action resolves, **Then** no two units occupy the same tile in the resulting state.
4. **Given** a friendly unit attempts to move to a tile occupied by an enemy, **When** the move is validated, **Then** the move is rejected as invalid.
5. **Given** a defender is reduced to 0 HP, **When** combat resolves, **Then** the defender is removed from the board and its tile becomes empty.

---

### User Story 2 - Unit Animations (Priority: P2)

Units visually animate to communicate their state. Idle units display a subtle continuous animation. When a unit moves, it smoothly traverses its path rather than teleporting. When a unit attacks, a brief directional animation plays toward the target before the attacker returns to its tile.

**Why this priority**: Animations make the game feel responsive and alive. The movement/attack animation directly addresses the confusing visual where units appeared to "disappear" into enemies — the attack animation must make clear that the unit does not actually move to the target tile.

**Independent Test**: Select a unit and observe an idle animation. Move it to a new tile and observe smooth traversal. Attack an enemy and observe an attack animation without the unit leaving its tile.

**Acceptance Scenarios**:

1. **Given** any unit is on the board, **When** the game is in the orders phase, **Then** the unit displays a continuous idle animation (e.g., a subtle bob or pulse).
2. **Given** a move action is issued, **When** the move resolves, **Then** the unit visually moves along its path tile-by-tile at a consistent speed before the next action is accepted.
3. **Given** an attack action is issued, **When** the attack resolves, **Then** the attacker briefly animates toward the target and returns to its original tile; the attacker does not visually occupy the target tile at any point.
4. **Given** a unit is destroyed in combat, **When** the death animation plays, **Then** the unit briefly flashes or fades before disappearing from the board.

---

### User Story 3 - Tile Visual Detail (Priority: P3)

Each terrain tile displays decorative details beyond a flat color fill. Terrain-appropriate decoration makes tiles visually distinct and easier to read at a glance.

**Why this priority**: Flat colored tiles work but feel placeholder-like. Adding detail improves game feel without changing gameplay.

**Independent Test**: Open the game and observe that each terrain type (plains, grassland, forest, mountain, water) has at least one decorative element drawn on top of the base color.

**Acceptance Scenarios**:

1. **Given** the map is rendered, **When** the player views plains tiles, **Then** the tiles display grass detail elements (e.g., small tufts or a texture pattern).
2. **Given** the map is rendered, **When** the player views forest tiles, **Then** the tiles display tree-like shapes or foliage.
3. **Given** the map is rendered, **When** the player views mountain tiles, **Then** the tiles display a ridge or peak outline.
4. **Given** the map is rendered, **When** the player views water tiles, **Then** the tiles display a ripple or wave pattern.
5. **Given** terrain detail is added, **When** a unit occupies a tile, **Then** the unit sprite remains clearly visible and is not obscured by terrain detail.

---

### User Story 4 - Hover Highlight for Reachable Tiles (Priority: P3)

When a unit is selected, moving the cursor over a tile that the unit can legally move to brightens or changes the tile's highlight. This gives the player an immediate affordance that a click would trigger a move action.

**Why this priority**: Improves UX clarity. Lower priority than the combat bugs but higher value than purely cosmetic tile detail.

**Independent Test**: Select a unit, then move the cursor across the map. Tiles in the unit's movement range respond with a distinct hover highlight; tiles outside the range do not.

**Acceptance Scenarios**:

1. **Given** a unit is selected with reachable tiles highlighted, **When** the cursor hovers over a reachable tile, **Then** that tile shows a distinct hover state (brighter fill, border, or different shade).
2. **Given** a unit is selected, **When** the cursor moves from a reachable tile to a non-reachable tile, **Then** the hover highlight disappears.
3. **Given** no unit is selected, **When** the cursor hovers over any tile, **Then** no hover highlight is shown.
4. **Given** a unit is selected, **When** the cursor hovers over an attackable enemy tile, **Then** the tile shows a distinct attack-hover state (different from the move-hover state).

---

### User Story 5 - Sound Feedback (Priority: P4)

Brief audio cues play when the player selects a unit, successfully moves a unit, or completes an attack. Sounds are short and non-intrusive.

**Why this priority**: Sound feedback reinforces player actions. Least critical of the features but improves game feel.

**Independent Test**: Select a unit, hear a click/select sound. Move the unit, hear a movement sound. Attack an enemy, hear an attack sound.

**Acceptance Scenarios**:

1. **Given** the game is running, **When** the player selects a friendly unit, **Then** a brief selection sound plays.
2. **Given** a unit is selected, **When** the player issues a move order and the move resolves, **Then** a movement sound plays.
3. **Given** a unit is selected, **When** the player issues an attack and the attack resolves, **Then** an attack impact sound plays.
4. **Given** sounds play during the game, **When** multiple sounds would overlap, **Then** sounds play without causing errors (overlapping is acceptable).

---

### Edge Cases

- What happens when a unit with 0 movement points is selected and the player hovers over previously-highlighted tiles (from before the move)? The highlights should be cleared.
- What happens when an attack kills both the defender AND the counterattack kills the attacker? Both units should be removed and no tile should reference a destroyed unit.
- What happens when an animation is in progress and the player clicks rapidly? Input should be queued or ignored during animation playback to prevent state inconsistencies.
- What happens on a device with no audio output or where the browser has blocked audio? Sound failures must be silent — no exceptions or errors that break gameplay.
- What happens when a unit attempts to move to a tile occupied by an enemy through a path that passes through enemy-occupied intermediate tiles? Both the path and destination must be validated; enemy-occupied tiles should be impassable for movement.

## Requirements *(mandatory)*

### Functional Requirements

**Combat Fixes**

- **FR-001**: The system MUST prevent any move action from succeeding when the destination tile is already occupied by any unit (friendly or enemy).
- **FR-002**: The system MUST prevent any move action from succeeding when an intermediate path tile is occupied by an enemy unit.
- **FR-003**: When a player clicks an enemy unit's tile while a friendly unit is selected, the system MUST issue an attack action (not a move action) if the enemy is within attack range.
- **FR-004**: After any action resolves, the game state MUST guarantee that no two units share the same tile ID.
- **FR-005**: The reachable-tiles computation MUST exclude tiles occupied by enemy units as valid move destinations.

**Unit Animations**

- **FR-006**: Each unit MUST display a continuous idle animation while the game is in the orders phase.
- **FR-007**: When a move action resolves, the unit's sprite MUST animate along the movement path before the board accepts the next player input.
- **FR-008**: When an attack action resolves, the attacker's sprite MUST briefly animate toward the target and return to its origin tile; the attacker's sprite MUST NOT be rendered on the target tile at any point during the animation.
- **FR-009**: When a unit is destroyed, its sprite MUST play a brief destruction animation (flash, shrink, or fade) before being removed from the display.

**Tile Visual Detail**

- **FR-010**: Each terrain type (plains, grassland, forest, mountain, water) MUST display at least one decorative graphical element drawn over the base color.
- **FR-011**: Terrain detail elements MUST NOT obscure unit sprites or settlement icons.

**Hover Highlight**

- **FR-012**: While a unit is selected, the tile currently under the cursor MUST display a distinct hover highlight if it is a valid move destination.
- **FR-013**: While a unit is selected, the tile currently under the cursor MUST display a distinct attack-hover highlight if it contains an attackable enemy unit.
- **FR-014**: When no unit is selected, cursor hover MUST NOT produce any tile highlight.

**Sound**

- **FR-015**: The system MUST play a distinct sound when the player selects a friendly unit.
- **FR-016**: The system MUST play a distinct sound when a move action completes.
- **FR-017**: The system MUST play a distinct sound when an attack action completes.
- **FR-018**: Sound initialization failures MUST NOT prevent the game from loading or functioning.

### Key Entities

- **Unit**: A game piece with position, HP, movement points, and attack state. Crucially, each unit occupies exactly one tile and each tile holds at most one unit.
- **Tile**: A map cell that holds at most one unit and optionally one settlement. The tile's `unitId` field and the unit's `tileId` field must always be in sync.
- **Animation**: A time-bounded visual effect applied to a unit sprite. Animations run in the display layer and do not affect game state.
- **Sound cue**: A short audio clip triggered by a game event. Sound failures are non-fatal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attack actions correctly keep the attacker on its origin tile — no regression to the pre-fix "disappear" behavior.
- **SC-002**: 100% of game states, after any action, contain no two units sharing a tile (verifiable by automated test).
- **SC-003**: Move animations complete in under 500ms per tile traversed so gameplay remains responsive.
- **SC-004**: Attack animations complete in under 600ms total so combat feels snappy.
- **SC-005**: All five terrain types display visually distinct detail that a first-time player can identify without a legend.
- **SC-006**: Hovering over a reachable tile with a unit selected produces a visible highlight change within one rendered frame (no perceptible delay).
- **SC-007**: All three sound events (select, move, attack) produce audible feedback on a standard browser with audio enabled.
- **SC-008**: A game session with sounds disabled or audio blocked runs without errors.

## Assumptions

- Sounds will be synthesized procedurally (using the Web Audio API) or use very small generated audio files — no large asset downloads are required.
- Animations are driven by the existing PixiJS render loop (ticker); no additional animation library is introduced.
- The hover highlight is implemented by listening to `mousemove` on the canvas, parallel to the existing `click` listener.
- Terrain detail is drawn with PixiJS Graphics primitives (no new sprite assets required), keeping the project's no-asset-required fallback intact.
- Input is blocked (or queued) during movement animations to prevent the player from issuing orders while a unit is visually in transit; attack animations may or may not block input depending on their brevity.
