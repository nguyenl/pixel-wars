# Feature Specification: Strategic AI Overhaul & Game Enhancements

**Feature Branch**: `013-strategic-ai-overhaul`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Update the AI so that it has complete vision of the game to make better decisions. Change the game rules so that cities require two turns of occupation before they can be captured and show an indicator for capture progress. Update the AI behavior to balance its actually so that it plays more strategically by trying to build an army and economy before attacking, and by trying to block the economic expansion of the player. Add a scoreboard at the end to compare the player and ai game stats such as total units built, economy, and so on."

## Clarifications

### Session 2026-03-19

- Q: How is "economic advantage" defined for the AI phase transition trigger? → A: AI's income per turn is strictly greater than the player's income per turn (Option B).
- Q: How does the player's army size factor into the AI's decision-making? → A: Caution modifier on the offense trigger — AI delays switching to offense if the player's army size is ≥ AI army size, even when an income lead exists (Option A).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Two-Turn City Capture with Progress Indicator (Priority: P1)

A player moves a unit onto an enemy city. Rather than capturing it instantly, the unit must remain on the city for two consecutive turns. A visible progress indicator on the city tile shows how far along the capture is (0%, 50%, 100%). If the occupying unit leaves or is destroyed before the second turn, the progress resets.

**Why this priority**: This is a fundamental rule change that affects every game session and all players immediately. It directly changes the core game loop and must be in place before other AI behavior changes are meaningful.

**Independent Test**: Can be fully tested by moving a unit onto an enemy city and verifying the two-turn capture requirement and progress indicator without any AI involvement.

**Acceptance Scenarios**:

1. **Given** a player unit moves onto a neutral or enemy city, **When** end turn is called after the first occupation, **Then** the city is NOT captured and a progress indicator shows 50% completion on the city tile.
2. **Given** a city is at 50% capture progress, **When** the occupying unit remains on the city and end turn is called, **Then** the city is captured and ownership transfers to the occupying player.
3. **Given** a city is at 50% capture progress, **When** the occupying unit moves off the city or is destroyed, **Then** the capture progress resets to 0% and the progress indicator disappears.
4. **Given** a newly started game, **When** the player views any city, **Then** no capture indicator is visible on uncontested cities.

---

### User Story 2 - Strategic AI with Omniscient Vision (Priority: P2)

The AI opponent has full knowledge of the entire map at all times — it can see all player units, all cities, and all terrain without the fog-of-war restrictions that apply to the player. The AI uses this complete information to make smarter decisions: prioritizing building up its economy and army before committing to attacks, and actively moving to contest cities that the player is trying to capture or expand toward.

**Why this priority**: The AI intelligence upgrade is the core improvement to game quality. Without a smarter AI, the game feels trivially easy and unengaging. This story requires the two-turn capture rule (P1) to be meaningful, but otherwise operates independently.

**Independent Test**: Can be tested by observing AI behavior across multiple full games: AI should demonstrate economy-first phases, intercept player expansion attempts, and never make tactically blind moves.

**Acceptance Scenarios**:

1. **Given** a new game starts, **When** the AI has fewer than three military units and less than two cities, **Then** the AI prioritizes producing economic units and capturing neutral cities over attacking the player.
2. **Given** the player is moving units toward an uncontested neutral city, **When** the AI takes its turn, **Then** the AI moves a unit toward the same city to contest or block the player's expansion.
3. **Given** the AI's income per turn exceeds the player's AND the AI controls more military units than the player, **When** the AI takes its turn, **Then** the AI transitions from expansion and initiates offensive actions against the player's territory.
4. **Given** the AI has an income lead but the player's army is equal to or larger than the AI's army, **When** the AI takes its turn, **Then** the AI continues in expansion mode, prioritizing building more units rather than attacking.
4. **Given** the player occupies a city adjacent to AI territory, **When** the AI takes its turn, **Then** the AI prioritizes sending a unit to disrupt the capture before it completes.

---

### User Story 3 - End-Game Scoreboard (Priority: P3)

When the game ends (either player wins or loses), a scoreboard screen is displayed before returning to the main menu. The scoreboard shows a side-by-side comparison of key stats for the player and the AI: total units built, cities controlled at peak and at end, total income earned, and number of units destroyed.

**Why this priority**: The scoreboard adds post-game value and context, but the game is fully playable without it. It is the lowest-risk addition and can be developed and tested in isolation.

**Independent Test**: Can be fully tested by completing a game (or triggering a game-over condition) and verifying the scoreboard appears with accurate statistics for both sides.

**Acceptance Scenarios**:

1. **Given** a game ends with the player winning, **When** the victory screen appears, **Then** a scoreboard panel displays stat comparisons for Player vs. AI before or alongside the victory message.
2. **Given** a game ends with the AI winning, **When** the defeat screen appears, **Then** the same scoreboard panel is displayed.
3. **Given** the scoreboard is displayed, **When** the player reads it, **Then** it shows at minimum: total units built, units lost, cities owned at game end, and total income generated.
4. **Given** the scoreboard is displayed, **When** the player presses the continue/close button, **Then** the game returns to the main menu or restart screen.

---

### Edge Cases

- What happens when a unit is placed on a city that is already being captured by the AI (contested capture)?
- How does capture progress display when two units from opposite sides are both on the same city simultaneously (if that is possible in the current rules)?
- What happens to capture progress if a city owner changes mid-siege (e.g., the defending city owner loses it to a third state)?
- What if the game ends while a city is at 50% capture progress — does the in-progress capture count as owned for scoreboard purposes?
- How does the AI vision interact with units that can become hidden or garrison inside cities?
- What happens when AI income > player income but army sizes are equal — does the AI prioritize building units or capturing more cities first?
- If the player's army grows to match the AI mid-offense (after the switch has already occurred), does the AI immediately revert to expansion phase or finish its current offensive action first?

## Requirements *(mandatory)*

### Functional Requirements

**City Capture Rule Change**

- **FR-001**: The game MUST require a unit to occupy a city for two consecutive turns before ownership transfers to the occupying player (previously one turn).
- **FR-002**: The game MUST display a visual capture progress indicator on any city currently being occupied, showing 0-turn (no indicator), 1-turn (partial/50%), and 2-turn (capture complete) states.
- **FR-003**: The game MUST reset capture progress to zero if the occupying unit leaves the city or is eliminated before the second turn completes.
- **FR-004**: The capture progress indicator MUST be visible to all players viewing the city tile.

**AI Omniscient Vision**

- **FR-005**: The AI opponent MUST have complete, unrestricted visibility of the entire game map, including all player units, their positions, and all city ownership states, at all times.
- **FR-006**: The AI decision-making MUST use its full map knowledge when selecting movement targets, production choices, and attack priorities.

**Strategic AI Behavior**

- **FR-007**: The AI MUST follow a phased strategy: prioritize economic expansion (capturing neutral cities, producing economic units) during an early-game phase before transitioning to a military-offensive phase.
- **FR-008**: The AI MUST actively monitor the player's unit positions and income per turn, and move to contest cities the player is advancing toward, with the goal of blocking economic expansion.
- **FR-009**: The AI MUST interrupt or reset player city captures by moving units onto cities the player is actively capturing when it has available units to do so.
- **FR-010**: The AI MUST transition to an offensive posture (attacking the player's cities and units) only when BOTH conditions are met: (1) the AI's income per turn is strictly greater than the player's income per turn, AND (2) the AI controls strictly more military units than the player. If either condition is not met, the AI MUST remain in expansion mode and prioritize capturing neutral cities or producing military units.
- **FR-011**: The AI MUST avoid committing all forces to offense while leaving its own cities undefended — it MUST maintain at least one unit near its territory when going on the attack.

**End-Game Scoreboard**

- **FR-012**: The game MUST display a scoreboard at the end of every game session (win or loss).
- **FR-013**: The scoreboard MUST present a side-by-side comparison of Player vs. AI statistics.
- **FR-014**: The scoreboard MUST include at minimum the following stats for both sides: total units produced, total units lost, cities owned at game end, and total income generated during the game.
- **FR-015**: The scoreboard MUST include a button or action to dismiss it and return to the main menu or restart prompt.

### Key Entities

- **City**: A map tile that generates income; has an owner (neutral, player, AI) and a capture progress state (0 or 1 turns occupied).
- **Capture Progress**: A per-city counter tracking how many consecutive turns a foreign unit has occupied it; resets on interruption.
- **AI Vision State**: The complete game state snapshot used by the AI each turn, containing all unit positions and city ownership without restrictions.
- **AI Phase**: The current strategic mode of the AI (economic/expansion or military/offensive). The AI transitions to offensive phase only when both conditions hold simultaneously: AI income per turn > player income per turn, AND AI military unit count > player military unit count. Either condition failing returns the AI to expansion phase.
- **Game Stats Record**: A per-player accumulator tracking units produced, units lost, income earned, and cities owned at game end for scoreboard display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cities require exactly two turns of uninterrupted occupation to change ownership in 100% of test cases.
- **SC-002**: A capture progress indicator is visible on any city under active occupation and absent on all uncontested cities in 100% of test cases.
- **SC-003**: The AI successfully intercepts at least 60% of observable player city-capture attempts across a set of 10 test games played against a scripted player movement sequence.
- **SC-004**: In at least 80% of test games, the AI does not launch its first offensive attack unless both conditions are true: AI income per turn > player income per turn, AND AI military unit count > player military unit count.
- **SC-005**: The end-game scoreboard appears within 1 second of the game-ending condition being triggered in 100% of playthroughs.
- **SC-006**: The scoreboard accurately reflects all four required statistics (units produced, units lost, cities at end, income earned) for both the player and AI in 100% of playthroughs.
- **SC-007**: Players observe the AI as a more challenging and strategically coherent opponent — the AI no longer rushes blindly without economy, and actively contests expansion.

## Assumptions

- The current game already has a concept of "turns" and "end turn" actions that the two-turn capture rule can hook into.
- The AI currently has some form of vision/knowledge system that can be updated to remove restrictions (or a new omniscient query method can be added).
- "Income" refers to per-turn currency generated by cities, which is already tracked in the existing game engine.
- The existing game-over screen (win/loss) can be extended or replaced with a scoreboard panel before returning to the main menu.
- Game statistics (units produced, units lost) are not currently tracked but can be accumulated using existing game event hooks without requiring persistent storage.
- "Military units" and "economic units" are existing distinct unit categories in the game.
- The AI phase transition is evaluated at the start of each AI turn by comparing both income per turn and military unit count against the player's current values. Both must favor the AI to trigger the offensive phase.
- "Military unit count" means total living units on the map, not units in production queues.
- Capture progress is per-city and per-occupying-player; a neutral city being captured by the player is distinct from one being captured by the AI.
