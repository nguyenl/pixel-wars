# Feature Specification: Tile-Based Strategy Game

**Feature Branch**: `001-tile-strategy-game`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Add the initial game. The game should be a tile based strategy game..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New Game Setup (Priority: P1)

A player launches the game and is presented with a main menu. They choose a map size (Small, Medium, or Large), and a new game begins. The game generates a unique map with varied terrain, randomly placed cities and towns, and assigns each player a starting city.

**Why this priority**: Without game setup, no other feature can be tested. This is the entry point for all gameplay.

**Independent Test**: Launch the app, select a map size from the menu, and verify a map renders with terrain, cities, towns, and player starting positions.

**Acceptance Scenarios**:

1. **Given** the game is launched, **When** the player views the main menu, **Then** they see map size options (Small, Medium, Large).
2. **Given** a map size is selected, **When** the game begins, **Then** a unique map is displayed with terrain variety, cities, towns, and two player starting cities.
3. **Given** a new game starts, **When** the map is generated, **Then** each player has exactly one owned city and starts with $200 in funds.
4. **Given** a game concludes, **When** the player returns to the main menu, **Then** they can start a new game with the same or different map size.

---

### User Story 2 - Unit Movement & Terrain (Priority: P2)

Players take turns moving their units across the map. Each unit has a movement allowance that is consumed by moving through tiles, with different terrain types costing different amounts of movement to traverse.

**Why this priority**: Movement is the core action of every turn. Without it, combat and capture cannot be tested.

**Independent Test**: Place a unit on a map with varied terrain. Verify the unit can move the correct number of tiles, with terrain consuming appropriate movement points, and that impassable tiles are blocked.

**Acceptance Scenarios**:

1. **Given** it is a player's turn, **When** they select a unit, **Then** all valid destination tiles are highlighted based on remaining movement points and terrain cost.
2. **Given** a unit is moving, **When** it enters a forest tile, **Then** it costs more movement than entering a plains tile.
3. **Given** a unit has used all movement points, **When** the player tries to move it further, **Then** the move is rejected.
4. **Given** a water tile exists, **When** a land unit attempts to enter it, **Then** the move is blocked and the unit cannot be placed there.
5. **Given** a tile is occupied by a friendly unit, **When** another friendly unit tries to move into it, **Then** the move is blocked.

---

### User Story 3 - Fog of War (Priority: P3)

Each player can only see map tiles they have explored or that are within their units' vision range. Unexplored and out-of-vision tiles appear hidden. Previously explored tiles show terrain but hide enemy positions.

**Why this priority**: Fog of war is a core strategic element that affects all decision-making and must be established early to validate correctness.

**Independent Test**: Set up a map with two players. Verify the human player cannot see the AI's units or unvisited tiles outside their units' vision range.

**Acceptance Scenarios**:

1. **Given** a new game starts, **When** the player views the map, **Then** only tiles within their starting city's and units' vision range are visible; all others are hidden.
2. **Given** a unit moves to a new area, **When** it arrives, **Then** tiles within its vision range become visible and show terrain, settlements, and any enemy units present.
3. **Given** a unit moves away from an explored area, **When** that area falls outside all friendly unit vision, **Then** the tile shows terrain and settlement info but hides any enemy units there.

---

### User Story 4 - Combat (Priority: P4)

Players initiate combat by ordering a unit to attack an enemy unit. The attacker deals damage based on its attack strength versus the defender's defense strength. Adjacent defenders counterattack. Artillery can attack from a distance without risking counterattack.

**Why this priority**: Combat is the primary conflict resolution mechanism and is required to capture settlements and eliminate opponents.

**Independent Test**: Place two opposing units adjacent to each other. Order the attacker to attack. Verify both units lose hit points, and that a unit with 0 HP is removed from the map.

**Acceptance Scenarios**:

1. **Given** a player's unit is within attack range of an enemy unit, **When** the player orders an attack, **Then** the enemy unit loses hit points based on the attacker's attack strength minus the defender's defense strength.
2. **Given** an adjacent enemy unit is attacked, **When** combat resolves, **Then** the defending unit counterattacks, dealing damage back to the attacker.
3. **Given** a unit's hit points reach 0 or below, **When** combat concludes, **Then** the unit is removed from the map permanently.
4. **Given** an artillery unit attacks, **When** the target is within 2 tiles, **Then** the attack resolves without the defender counterattacking.
5. **Given** a unit has already attacked this turn, **When** the player tries to attack again, **Then** the second attack is rejected.

---

### User Story 5 - City & Town Capture (Priority: P5)

Players capture neutral or enemy-held settlements by moving a unit onto the settlement tile. Capturing settlements increases income earned each turn and is the path to victory.

**Why this priority**: Capturing settlements drives the economic engine and the path to victory.

**Independent Test**: Move a unit onto a neutral city. Verify ownership changes to the player and income increases on the next turn's income collection.

**Acceptance Scenarios**:

1. **Given** a player's unit occupies a neutral city at the end of the player's turn, **When** the turn ends, **Then** city ownership transfers to that player.
2. **Given** a player's unit occupies an enemy-held town, **When** the turn ends, **Then** the town transfers to the attacking player and is removed from the enemy's income.
3. **Given** a player owns a city and a town, **When** income is collected at the start of their turn, **Then** the city contributes exactly twice the income of the town.
4. **Given** a unit is actively occupying a city, **When** an enemy unit moves onto that city's tile, **Then** combat occurs before the capture can proceed.

---

### User Story 6 - Unit Production (Priority: P6)

Players spend accumulated income to produce units at cities they control. A city can produce only one unit at a time. The produced unit appears at the city after one turn.

**Why this priority**: Unit production sustains the army throughout the game and drives the economic decision-making loop.

**Independent Test**: Own a city with sufficient income. Order a Scout to be produced. Verify the Scout appears at the city on the player's next turn and the cost is deducted.

**Acceptance Scenarios**:

1. **Given** a player controls a city and has sufficient funds, **When** they order a unit type to be produced, **Then** the cost is deducted from funds immediately and the unit enters production.
2. **Given** a unit is in production, **When** the player's next turn begins, **Then** the produced unit appears at the city tile ready for orders.
3. **Given** a city is already producing a unit, **When** the player tries to order another unit from that city, **Then** the order is rejected with a message that the city is busy.
4. **Given** a player has insufficient funds for a unit, **When** they try to order production, **Then** the order is rejected.
5. **Given** a Scout, Infantry, and Artillery are each produced, **When** they appear on the map, **Then** each has its distinct stats: Scouts have high movement/vision and low HP/attack/defense; Infantry have balanced stats; Artillery has low movement but can attack at range.

---

### User Story 7 - AI Opponent Turn (Priority: P7)

After the human player ends their turn, the AI opponent automatically takes its turn — moving units, attacking, capturing settlements, and ordering production — without any user input.

**Why this priority**: The AI opponent is required for the game to be playable as a single-player experience.

**Independent Test**: End the human player's turn and verify that the AI moves at least one unit, then passes the turn back to the human.

**Acceptance Scenarios**:

1. **Given** the human player ends their turn, **When** the AI turn begins, **Then** the AI automatically issues movement and action orders for its units.
2. **Given** the AI has cities with sufficient funds, **When** the AI takes its turn, **Then** it orders unit production at eligible cities.
3. **Given** the AI completes all its actions, **When** it is done, **Then** the turn passes back to the human player.

---

### User Story 8 - Victory & Game End (Priority: P8)

The game ends when one player loses control of all their cities. The other player is declared the winner and a game-over screen is shown.

**Why this priority**: Victory conditions give the game a definitive end state and validate the full game loop end-to-end.

**Independent Test**: Capture all cities belonging to the AI. Verify the game detects the condition, stops accepting input, and shows a winner screen.

**Acceptance Scenarios**:

1. **Given** a player captures their opponent's last city, **When** the turn ends, **Then** the game ends immediately and displays a victory screen naming the winner.
2. **Given** the game ends, **When** the victory screen is shown, **Then** the player can return to the main menu to start a new game.
3. **Given** a player loses their last city, **When** the game-over is triggered, **Then** no further moves can be made by either player.

---

### Edge Cases

- What happens when a unit tries to move to a tile occupied by a friendly unit? (Move is blocked; units cannot stack.)
- How does combat resolve when the attacker's attack strength is less than or equal to the defender's defense strength? (Minimum 1 damage is always dealt to ensure combat progresses.)
- What happens if a city being used for production is captured by the enemy mid-turn? (Production is cancelled; no refund is given to the original owner.)
- What happens if the map generator creates regions isolated by water that neither player can reach? (Map generation must ensure all land areas with settlements are reachable from both starting positions; regenerate if not.)
- What happens when both players lose their last city simultaneously? (The player who initiated the final action loses; the opponent wins.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a main menu with map size options (Small, Medium, Large) before each game.
- **FR-002**: System MUST procedurally generate a unique map for each new game session using a random seed.
- **FR-003**: Maps MUST include five terrain types: plains, forests, grasslands, mountains, and water, each with a distinct visual appearance.
- **FR-004**: Terrain types MUST impose movement costs: plains and grasslands cost 1 movement point, forests cost 2, mountains cost 3, and water is impassable to land units.
- **FR-005**: Maps MUST include cities and towns distributed across playable terrain tiles.
- **FR-006**: Each player MUST start the game with exactly one owned city placed on the map, with remaining cities and towns starting as neutral.
- **FR-007**: Each player MUST start the game with $200 in funds.
- **FR-008**: System MUST collect income for the active player at the start of their turn, based on owned settlements (towns contribute 1 income unit; cities contribute 2 income units).
- **FR-009**: Players MUST be able to select a unit and move it to any reachable tile within its movement allowance, accounting for terrain costs.
- **FR-010**: Players MUST be able to order an attack against an enemy unit within range using a unit that has not already attacked this turn.
- **FR-011**: Combat MUST resolve by calculating net damage (attacker attack strength minus defender defense strength, minimum 1), applied to the defender's hit points; adjacent defenders MUST counterattack immediately after.
- **FR-012**: Units with 0 or fewer hit points MUST be removed from the map.
- **FR-013**: Players MUST capture a neutral or enemy settlement by moving a unit onto its tile; capture completes at the end of that player's turn if the unit remains on the tile.
- **FR-014**: System MUST enforce fog of war per player: visible tiles are those within any friendly unit's vision range; previously explored tiles show terrain but not enemy units; unexplored tiles are fully hidden.
- **FR-015**: Players MUST be able to queue one unit for production at each controlled city; the unit appears at that city at the start of the player's next turn and the cost is deducted immediately upon ordering.
- **FR-016**: System MUST prevent a city from accepting a new production order while one is already in progress.
- **FR-017**: System MUST end the game when a player controls zero cities, declaring the other player the winner.
- **FR-018**: Game MUST support exactly three unit types: Scout, Infantry, and Artillery, each with distinct stats and production costs.
- **FR-019**: Artillery units MUST be able to attack enemy units up to 2 tiles away; artillery attacks at range MUST NOT trigger a counterattack from the defender.
- **FR-020**: System MUST prevent land units (Scout, Infantry, Artillery) from entering water tiles.
- **FR-021**: System MUST control the AI opponent automatically each turn, making decisions on unit movement, attacks, city captures, and unit production without user input.

### Key Entities

- **Map**: A rectangular grid of tiles with a configurable size (Small/Medium/Large); contains all terrain, settlements, and unit positions.
- **Tile**: A single grid cell with one terrain type, optionally containing one settlement and/or one unit.
- **Terrain**: The tile's terrain category (Plains, Forest, Grassland, Mountain, Water) and its associated movement cost.
- **Settlement (City or Town)**: A capturable location with an owner (a player or neutral), income value (city = 2× town), and an optional unit production queue slot.
- **Unit**: A game piece belonging to a player with attributes: type (Scout/Infantry/Artillery), current hit points, movement allowance, vision range, attack strength, defense strength; each unit can move and attack once per turn.
- **Player**: A participant in the game (human or AI) with a name/color identifier, current funds, list of owned settlements, and a collection of units.
- **Turn**: The active player's action phase; the player may issue orders to any of their units and cities; the turn ends when the player passes (or the AI finishes).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new game can be started from the main menu to a fully rendered playable map in under 5 seconds.
- **SC-002**: A complete game (from map selection to victory screen) can be played from start to finish without errors or crashes.
- **SC-003**: Fog of war correctly hides all unexplored and out-of-vision tiles for the human player in 100% of tested scenarios.
- **SC-004**: All three unit types (Scout, Infantry, Artillery) can be produced, moved, and engaged in combat within a single game session.
- **SC-005**: Income collection correctly reflects owned settlements on every turn (cities contributing twice a town's amount) in 100% of tested scenarios.
- **SC-006**: The game correctly detects and announces the winner within one turn of the last enemy city being captured.
- **SC-007**: Map generation produces maps where both players have at least one viable land path to reach neutral settlements, verified across 10 consecutive generated maps.
- **SC-008**: The AI opponent completes its turn and returns control to the human player within 3 seconds on any supported map size.

## Assumptions

- **Game Mode**: Single-player vs computer AI. The human plays as Player 1; the system controls Player 2 (the AI opponent). The AI's decision-making strategy is left to the design/planning phase.
- Income unit value: towns produce 1 income unit/turn, cities produce 2 income units/turn. Exact monetary values (e.g., $50 per unit) to be confirmed during design-phase balancing.
- Unit production takes exactly 1 turn (unit appears at the start of the producing player's next turn).
- Combat uses a deterministic damage formula (net damage = attacker attack − defender defense, minimum 1) with no random element.
- Map sizes: Small ≈ 10×10, Medium ≈ 15×15, Large ≈ 20×20 tiles (exact dimensions confirmed during design phase).
- Water tiles are fully impassable for all units in this version; no naval units are in scope.
- Scouts have the lowest production cost; Artillery has the highest.
- A unit can move AND attack in the same turn (move first, then attack).
- The game is browser-based and runs entirely client-side with no server or network requirements.
- Previously explored tiles remain visible for terrain/settlement info but do not reveal enemy unit positions when outside vision range.
