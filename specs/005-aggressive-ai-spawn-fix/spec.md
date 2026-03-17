# Feature Specification: Aggressive AI & Spawn Render Fix

**Feature Branch**: `005-aggressive-ai-spawn-fix`
**Created**: 2026-03-15
**Status**: Draft
**Input**: User description: "The AI is still not working very well. It needs to be more aggressive. It currently is not moving or building. The AI should explore and capture more resources so that it can attack the player. Additionally, there is a bug where the initial animated sprites after a unit has spawned is not rendered on top of the city they are built from."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Explores and Expands Across the Map (Priority: P1)

As a player, I expect the AI opponent to actively send its units out to explore the map and capture neutral settlements. Currently the AI sits idle — it does not move units or build new ones, making the game trivially easy. The AI should prioritize discovering the map, capturing resource-generating towns and cities, and building an economic base it can use to field an army.

**Why this priority**: Without exploration and expansion, the AI cannot discover objectives, gain income, or pose any threat. This is the foundational behavior that all other AI actions depend on. The AI's failure to move or build renders the game unchallenging.

**Independent Test**: Start a new game and end the player's turn repeatedly without taking any action. Within the first 5 turns, AI units should have moved from their starting position, explored new tiles, and captured at least one neutral settlement.

**Acceptance Scenarios**:

1. **Given** the AI has units with movement points and unexplored tiles within reach, **When** the AI's turn is processed, **Then** units move toward unexplored areas to reveal new parts of the map.
2. **Given** the AI knows about a neutral settlement, **When** the AI assigns objectives, **Then** at least one unit is directed to capture that settlement.
3. **Given** the AI has no known enemies and no uncaptured settlements in sight, **When** the AI's turn is processed, **Then** units spread out in different directions to maximize map coverage.
4. **Given** the AI captures a new town or city, **When** subsequent turns begin, **Then** the AI collects income from the captured settlement.

---

### User Story 2 - AI Builds Units Consistently (Priority: P1)

As a player, I expect the AI to continuously produce units from its cities whenever it can afford them. The AI should not hoard gold or leave cities idle when it has enough funds to train units. Building units is essential for the AI to field a fighting force.

**Why this priority**: Tied with exploration as the core problem. If the AI does not build units, it has no army to explore, expand, or attack with. Production and movement are the two broken behaviors the player has reported.

**Independent Test**: Start a new game and skip turns. After 3 turns, the AI should have produced at least one new unit from a city.

**Acceptance Scenarios**:

1. **Given** the AI owns at least one city with no active production queue and has funds for the cheapest unit, **When** the AI's turn begins, **Then** the AI queues a unit for production in that city.
2. **Given** the AI has multiple idle cities, **When** the AI's turn begins, **Then** it queues production in as many cities as it can afford.
3. **Given** the AI has limited funds, **When** deciding what to produce, **Then** it produces the most useful unit it can afford rather than saving indefinitely.
4. **Given** a city's production queue completes, **When** the AI's next turn starts, **Then** the new unit appears on the map and is available for orders.

---

### User Story 3 - AI Aggressively Attacks the Player (Priority: P2)

As a player, I expect the AI to actively seek out and attack my units and settlements once it has built up a sufficient force. The AI should not be passive — it should send units toward the player's territory and engage in combat when it has numerical or positional advantage.

**Why this priority**: Once the AI can explore and build, it needs to use that army offensively. Aggression is what transforms the AI from a passive expansion bot into a genuine opponent.

**Independent Test**: Start a game, build a single unit near the AI's territory, and skip turns. The AI should send units toward the player's unit and attack it when in range.

**Acceptance Scenarios**:

1. **Given** the AI has units and knows the location of player units, **When** the AI's turn is processed, **Then** at least one AI unit moves toward a player unit to close the distance for attack.
2. **Given** an AI unit is adjacent to a player unit and the engagement is favorable, **When** the AI processes that unit's actions, **Then** the AI unit attacks.
3. **Given** the AI has significantly more units than the player in a region, **When** it plans its turn, **Then** it sends multiple units to overwhelm the player's position rather than engaging one at a time.
4. **Given** the AI knows the location of a player settlement, **When** no higher-priority threats exist, **Then** the AI directs units to capture the player's settlement.

---

### User Story 4 - Spawned Unit Renders on Top of City (Priority: P2)

As a player, I expect to clearly see newly spawned units on the map, including when they appear on the city that produced them. Currently, when a unit spawns from a city, its animated sprite renders behind the city graphic, making it invisible or partially hidden.

**Why this priority**: This is a visual bug that hides game-critical information. If the player (or the AI observer) cannot see that a unit has spawned, they cannot make informed decisions. It also breaks the visual feedback loop that confirms production completed.

**Independent Test**: Queue a unit for production in a city, end the turn, and observe the city tile at the start of the next turn. The new unit's animated sprite should be clearly visible on top of the city graphic.

**Acceptance Scenarios**:

1. **Given** a city has completed unit production, **When** the new unit appears on the city tile, **Then** the unit's animated sprite renders visually on top of the city/settlement graphic.
2. **Given** a unit is standing on any settlement tile (city or town), **When** the game renders, **Then** the unit sprite is always drawn above the settlement graphic.
3. **Given** a unit moves onto a settlement tile, **When** the movement animation completes, **Then** the unit sprite remains rendered on top of the settlement graphic.

---

### Edge Cases

- What happens when the AI has explored the entire map and there are no neutral settlements left? The AI should shift to a fully aggressive strategy, directing all units toward the player's units and settlements.
- What happens when all AI units are destroyed but it still owns cities? The AI should continue producing new units and resume exploration and aggression once they are available.
- What happens when a newly spawned unit's city tile is at the edge of the player's vision? The unit should still render correctly on top of the city regardless of fog-of-war proximity.
- What happens when multiple units spawn on the same turn from different cities? Each unit should render on top of its respective city.
- What happens when the AI's only path to the player passes through narrow terrain choke points? The AI should still navigate the path rather than stalling.

## Requirements *(mandatory)*

### Functional Requirements

**AI Exploration & Expansion**

- **FR-001**: The AI MUST create exploration objectives for unexplored areas of the map, directing idle units toward fog-of-war regions when no higher-priority objectives exist.
- **FR-002**: The AI MUST prioritize capturing neutral settlements — towns and cities that provide income — over aimless wandering.
- **FR-003**: The AI MUST use all of its units' movement points each turn; no unit should remain stationary unless it is tactically holding a captured settlement with no better objective.
- **FR-004**: When multiple unexplored directions exist, the AI MUST spread units across different directions to maximize map discovery rather than sending all units the same way.

**AI Unit Production**

- **FR-005**: The AI MUST queue unit production in every idle city where it can afford at least the cheapest available unit type.
- **FR-006**: The AI MUST NOT skip production when it has sufficient funds; it should never hoard gold while cities sit idle.
- **FR-007**: The AI MUST adapt its unit production mix to its current strategic needs — producing scouts when it has low map vision, infantry for capturing and holding settlements, and artillery when it needs to engage fortified enemy positions.

**AI Aggression**

- **FR-008**: The AI MUST direct combat-capable units toward known player units and settlements once it has sufficient forces (at least 2 combat units available).
- **FR-009**: The AI MUST attack player units when within range and the engagement is tactically favorable (expected damage dealt exceeds expected damage received, or the AI has numerical superiority in the area).
- **FR-010**: The AI MUST prioritize attacking weakened player units (low HP) to secure eliminations.
- **FR-011**: The AI MUST attempt to capture player-owned settlements when undefended or lightly defended.

**Spawn Rendering**

- **FR-012**: When a unit spawns on a city tile, the unit's animated sprite MUST render visually above the settlement graphic on the display.
- **FR-013**: When any unit occupies a settlement tile (city or town), the unit sprite MUST always render above the settlement graphic regardless of how the unit arrived on that tile.

### Key Entities

- **Exploration Objective**: A target directing an AI unit toward an unexplored (fog-of-war) region of the map. Provides the AI with a reason to move when no enemies or settlements are visible.
- **AI Aggression Threshold**: The point at which the AI shifts from exploration/expansion to active attack — triggered when it has built enough units to begin offensive operations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The AI moves at least one unit every turn starting from turn 1, using available movement points to explore or advance toward objectives.
- **SC-002**: The AI produces at least one new unit within the first 3 turns of a new game.
- **SC-003**: The AI captures at least one neutral settlement within the first 5 turns of a new game.
- **SC-004**: A player who takes no actions (only ends turns) loses the game to the AI within 25 turns on a standard-sized map — demonstrating sustained aggression and expansion.
- **SC-005**: After 10 turns of passive play, the AI controls more settlements than it started with.
- **SC-006**: 100% of unit sprites render visibly on top of settlement graphics when occupying the same tile — no unit is ever hidden behind a city or town.
- **SC-007**: When a unit spawns from a city, the unit's animated sprite is immediately visible to the player without needing to move or deselect.

## Assumptions

- The game has exactly two players: one human (player 1) and one AI (player 2).
- The existing AI framework (objective-based decision-making with utility scoring) remains the foundation; this feature tunes and extends it rather than replacing it.
- The three unit types (scout, infantry, artillery) and their stats remain unchanged.
- Settlement income rates (city: 100/turn, town: 50/turn) remain unchanged.
- Map generation provides a roughly balanced starting position with neutral settlements reachable by both players.
- The rendering layer order (terrain → settlements → units) is the expected visual hierarchy; units should always appear on top of settlements.
