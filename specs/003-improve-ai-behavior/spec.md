# Feature Specification: Improve AI Behavior

**Feature Branch**: `003-improve-ai-behavior`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Improve the ai. Currently the ai does not move its units or build any units throughout the game."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Produces Units (Priority: P1)

As a player, I expect the AI opponent to produce new units from its cities throughout the game so that it fields an army and poses a real threat. Currently the AI never builds any units beyond the starting scout, making the game trivially easy.

**Why this priority**: Without unit production the AI has no ability to grow its forces, making every other AI behavior irrelevant. This is the foundation for a functioning opponent.

**Independent Test**: Can be tested by starting a new game and ending the player's turn repeatedly. After a few turns the AI should have produced new units visible on the map (or queued in its cities).

**Acceptance Scenarios**:

1. **Given** the AI owns at least one city and has sufficient funds, **When** the AI's turn begins, **Then** the AI queues a unit for production in at least one idle city.
2. **Given** the AI has queued a unit for production, **When** the AI's next turn starts, **Then** the newly produced unit appears on the city tile and is available for orders.
3. **Given** the AI owns multiple cities with no active production queues, **When** the AI's turn begins, **Then** it queues production in each city where it can afford the unit cost.
4. **Given** the AI has limited funds, **When** it decides what to produce, **Then** it prioritizes unit types that best address its current strategic situation (e.g., producing cheaper units when low on funds rather than saving indefinitely).

---

### User Story 2 - AI Moves Units Toward Objectives (Priority: P1)

As a player, I expect AI units to move across the map each turn—advancing toward settlements to capture, enemies to engage, or unexplored territory to scout. Currently AI units remain stationary where they spawn, offering no resistance.

**Why this priority**: Movement is the most fundamental unit action. Without it the AI cannot capture settlements, attack the player, or defend its own territory. Tied with production as the core problem.

**Independent Test**: Can be tested by starting a game and ending turns. AI units should visibly change position each turn, moving toward uncaptured settlements or toward the player's units.

**Acceptance Scenarios**:

1. **Given** an AI unit with remaining movement points and an identified objective (enemy unit or uncaptured settlement), **When** the AI processes that unit's turn, **Then** the unit moves along a valid path toward the objective.
2. **Given** an AI unit with no nearby objectives, **When** the AI processes that unit's turn, **Then** the unit explores toward unscouted areas of the map.
3. **Given** an AI unit that is blocked by impassable terrain (water, mountains), **When** the AI plans its movement, **Then** the unit pathfinds around the obstacle rather than staying in place.
4. **Given** multiple AI units pursuing the same objective, **When** the AI assigns targets, **Then** units spread across different objectives rather than all converging on one target.

---

### User Story 3 - AI Attacks Player Units (Priority: P2)

As a player, I expect AI units to attack my units when in range, providing combat challenge and tactical threat. The AI should take advantageous engagements and avoid suicidal attacks.

**Why this priority**: Combat engagement is what makes the game interesting. Once units can move and be produced, they need to fight effectively to create a real challenge.

**Independent Test**: Can be tested by placing the player's unit adjacent to an AI unit and ending the turn. The AI should initiate an attack.

**Acceptance Scenarios**:

1. **Given** an AI unit is adjacent to (or within range of) a player unit, **When** the AI processes that unit's actions, **Then** it initiates an attack if the engagement is favorable or neutral.
2. **Given** an AI unit can move into attack range of a player unit this turn, **When** the AI plans the unit's action, **Then** it moves and then attacks in the same turn.
3. **Given** an AI unit is badly damaged (low health), **When** the AI evaluates whether to attack, **Then** it avoids engagements where it would likely be destroyed without destroying the target.

---

### User Story 4 - AI Captures Settlements (Priority: P2)

As a player, I expect the AI to actively expand by capturing neutral and enemy settlements, growing its economy and unit production capability over time.

**Why this priority**: Settlement capture drives the AI's economy and ability to produce more units. Without expansion, the AI's resource base stagnates and it loses by attrition.

**Independent Test**: Can be tested by starting a game and skipping several turns. The AI should capture nearby neutral towns and cities, visible through the fog of war when the player scouts.

**Acceptance Scenarios**:

1. **Given** an AI unit moves onto a neutral or enemy settlement, **When** the turn's capture phase resolves, **Then** the settlement changes ownership to the AI.
2. **Given** there are uncaptured settlements within reach, **When** the AI assigns objectives to its units, **Then** at least some units prioritize capturing settlements over other objectives.
3. **Given** the AI captures a new city, **When** the AI's subsequent turns begin, **Then** the AI uses that city to produce additional units.

---

### Edge Cases

- What happens when all AI units are destroyed? The AI should continue producing new units from any remaining cities.
- What happens when the AI has no funds to produce any unit type? The AI should wait and accumulate income from its settlements before producing.
- What happens when a city tile is occupied by another AI unit when a produced unit is due to spawn? The AI should avoid queuing production in cities that will be blocked, or move blocking units away.
- What happens when all reachable objectives are already claimed? AI units should patrol, defend owned settlements, or explore fog-of-war areas.
- What happens when the AI has only one unit left? It should play conservatively and avoid unnecessary risk while the AI rebuilds from production.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The AI MUST queue unit production in its idle cities when it has sufficient funds to afford at least one unit type.
- **FR-002**: The AI MUST move each of its units each turn, using the unit's full movement allowance toward a meaningful objective (enemy unit, uncaptured settlement, or unexplored territory).
- **FR-003**: The AI MUST attack player units when the engagement is tactically favorable (expected damage dealt exceeds expected damage received) and the AI unit is within attack range.
- **FR-004**: The AI MUST direct units toward uncaptured settlements to expand its territory and economic base.
- **FR-005**: The AI MUST make production decisions that consider its current strategic needs—producing scouts when it has no vision, infantry for capturing settlements, and artillery when engaging strong enemy positions.
- **FR-006**: The AI MUST use all of its units each turn; no unit should remain idle if it has movement points or valid attack targets available.
- **FR-007**: The AI MUST generate visible actions during its turn (unit movement animations, attack animations) so the player can observe what the AI is doing.
- **FR-008**: The AI MUST avoid obviously poor moves such as moving a unit onto impassable terrain, attacking when the unit has already attacked this turn, or moving a unit backward away from all objectives without tactical reason.

### Key Entities

- **AI Player**: The computer-controlled opponent. Owns units, settlements, and funds. Takes actions during the AI phase of each turn.
- **Objective**: A target that the AI assigns to one of its units—either an enemy unit to attack, a settlement to capture, or an unexplored area to scout.
- **Unit Production Queue**: A pending unit order placed at a city, which spawns the unit at the start of the AI's next turn.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The AI produces at least one new unit within the first 3 turns of a new game, assuming it starts with sufficient funds and at least one city.
- **SC-002**: Every AI unit with available movement points changes position each turn (unless tactically holding a defensive position on a settlement).
- **SC-003**: The AI captures at least one neutral settlement within the first 5 turns of a new game.
- **SC-004**: When an AI unit is within attack range of a player unit with a favorable matchup, the AI initiates an attack in at least 90% of such opportunities.
- **SC-005**: A player who takes no actions (only ends turns) loses the game to the AI within 30 turns on a standard-sized map.
- **SC-006**: The AI's total unit count increases over the course of the game (not counting combat losses), demonstrating sustained production.

## Assumptions

- The game has exactly two players: one human (player 1) and one AI (player 2).
- The AI starts with the same resources and starting position as the human player (one city, one scout, 200 funds).
- Map generation provides a roughly balanced starting position for both players.
- The existing turn structure (income → orders → AI → victory check) remains unchanged.
- The three unit types (scout, infantry, artillery) and their stats remain unchanged.
- Settlement income rates (city: 100/turn, town: 50/turn) remain unchanged.
