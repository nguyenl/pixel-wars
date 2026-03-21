# Feature Specification: Pixel Wars — Complete Game Reference

**Feature Branch**: `014-consolidate-game-spec`
**Created**: 2026-03-19
**Status**: Final
**Input**: Consolidated from specs 001–013. Replaces all prior individual feature specs.

---

## Overview

Pixel Wars is a single-player, browser-based, turn-based tile strategy game. The human player (Player 1) competes against an AI opponent (Player 2) on a procedurally generated tile map. Players build armies, capture settlements for income, and win by eliminating all enemy cities.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — New Game Setup (Priority: P1)

A player opens the game, chooses a map size (Small/Medium/Large), and a new game begins: a unique connected map generates with terrain, cities, and towns; each player starts with one city, one Scout unit, and $200 in funds.

**Why this priority**: Entry point for all gameplay — nothing else works without this.

**Independent Test**: Launch the app, select a map size, verify a fully connected map renders with terrain, two opposing starting cities, one Scout per player, and correct starting funds.

**Acceptance Scenarios**:

1. **Given** the game is launched, **When** the player views the main menu, **Then** they see map size options Small, Medium, and Large.
2. **Given** a map size is selected, **When** the game begins, **Then** a unique map displays with varied terrain, cities, towns, and two player starting cities on opposite halves of the map.
3. **Given** a new game starts, **When** the map is generated, **Then** each player has exactly one owned city, one Scout pre-placed on that city, and $200 in funds.
4. **Given** any generated map, **When** inspected, **Then** all land settlement tiles are reachable from each other by land path — no isolated islands.
5. **Given** a game concludes, **When** the player returns to the main menu, **Then** they can start a new game with no artifacts from the prior session.

---

### User Story 2 — Unit Movement & Terrain (Priority: P2)

Players take turns moving units across the map. Each unit has a movement allowance consumed by terrain costs. Impassable terrain and occupied tiles block movement.

**Why this priority**: Movement is the core action of every turn; without it, combat and capture cannot function.

**Independent Test**: Place a unit on varied terrain; verify it moves the correct tiles with terrain costs applied and cannot enter water or enemy-occupied tiles.

**Acceptance Scenarios**:

1. **Given** a unit is selected, **When** the player views the map, **Then** all valid destination tiles are highlighted based on remaining movement points and terrain cost.
2. **Given** a unit moves, **When** it enters a forest tile, **Then** it costs more movement than a plains tile.
3. **Given** a land unit, **When** it attempts to enter a water tile, **Then** the move is blocked.
4. **Given** a tile is occupied by any unit, **When** another unit attempts to enter it, **Then** the move is blocked (no stacking).
5. **Given** a move action resolves, **When** the unit arrives, **Then** the unit animates smoothly along the path (not teleport).

---

### User Story 3 — Combat (Priority: P3)

Players attack adjacent enemy units. Adjacent defenders counterattack. Artillery attacks at 2-tile range without triggering counterattack. Units at 0 HP are removed.

**Why this priority**: Combat is the primary conflict resolution mechanism required to capture settlements and eliminate opponents.

**Independent Test**: Select a unit adjacent to an enemy, attack — verify attacker stays on its tile, defender loses HP, counterattack fires, 0-HP units are removed, and no two units share a tile post-combat.

**Acceptance Scenarios**:

1. **Given** a player's unit is in attack range of an enemy, **When** the player clicks the enemy tile, **Then** an attack fires (not a move), the attacker remains on its origin tile, and the defender loses HP.
2. **Given** an adjacent defender, **When** combat resolves, **Then** the defender counterattacks the attacker.
3. **Given** a unit reaches 0 HP, **When** combat resolves, **Then** the unit is permanently removed with a brief destruction animation.
4. **Given** an Artillery unit attacks at up to 2 tiles, **When** the attack resolves, **Then** no counterattack occurs.
5. **Given** a unit has already attacked this turn, **When** the player tries to attack again, **Then** the second attack is rejected.
6. **Given** any action resolves, **When** checked, **Then** no two units occupy the same tile.

---

### User Story 4 — City & Town Capture (Priority: P4)

Cities require two consecutive turns of occupation before transferring ownership. A progress indicator shows capture state. Interruption resets progress. Towns can be upgraded to cities for $500.

**Why this priority**: Settlement capture drives the economic engine and path to victory.

**Independent Test**: Move a unit onto an enemy city; verify no capture on turn 1 with 50% indicator; remain a second turn to complete capture; move unit away to verify progress reset.

**Acceptance Scenarios**:

1. **Given** a player unit occupies a neutral or enemy city at end-of-turn, **When** one turn of occupation completes, **Then** the city is NOT captured and a 50% progress indicator is visible.
2. **Given** a city at 50% progress, **When** the occupying unit remains for a second consecutive turn end, **Then** ownership transfers to the occupying player.
3. **Given** a city at 50% progress, **When** the occupying unit leaves or is destroyed, **Then** capture progress resets to 0% and the indicator disappears.
4. **Given** a player owns a city and a town, **When** income collects at turn start, **Then** city contributes $100/turn, town contributes $50/turn.
5. **Given** a player owns a town and has $500, **When** they select upgrade, **Then** the town becomes a city with city-level income, vision, and production capability immediately.

---

### User Story 5 — Unit Production (Priority: P5)

Players spend funds to produce units at owned cities. One unit per city at a time. The unit appears next turn. Newly spawned units render above settlement graphics.

**Why this priority**: Unit production sustains the army and drives the economic decision loop.

**Independent Test**: Own a city with funds; order a Scout; verify cost deducted immediately, unit appears next turn at city tile, visible above city graphic.

**Acceptance Scenarios**:

1. **Given** a player controls a city with sufficient funds, **When** they order a unit, **Then** cost deducts immediately and the unit enters production.
2. **Given** a unit is in production, **When** the player's next turn begins, **Then** the unit appears at the city tile and is available for orders.
3. **Given** a city is already producing, **When** the player tries to queue another unit, **Then** the order is rejected.
4. **Given** a newly spawned unit on a city tile, **When** rendered, **Then** the unit sprite appears above the city graphic (not hidden behind it).

---

### User Story 6 — Fog of War & Vision (Priority: P6)

Each player sees tiles within their units' and owned settlements' vision ranges. Previously explored tiles show terrain but hide enemy units. Unexplored tiles are fully hidden.

**Why this priority**: Fog of war is a core strategic element affecting all decision-making.

**Independent Test**: Verify enemy units and unexplored tiles are hidden; an owned city reveals tiles in a 3-tile radius even with no adjacent units.

**Acceptance Scenarios**:

1. **Given** a new game starts, **When** the player views the map, **Then** only tiles within friendly unit/settlement vision are visible.
2. **Given** a unit moves, **When** it arrives, **Then** tiles within its vision range reveal terrain, settlements, and enemy units.
3. **Given** a player owns a city with no nearby units, **When** viewing the map, **Then** tiles within 3 tiles of the city are visible.
4. **Given** a player owns a town with no nearby units, **When** viewing the map, **Then** tiles within 2 tiles of the town are visible.
5. **Given** a settlement changes ownership, **When** the capture completes, **Then** the new owner gains its vision and the former owner loses it immediately.

---

### User Story 7 — AI Opponent (Priority: P7)

The AI has omniscient map vision. It follows a phased strategy: economy-first until it has both an income AND unit-count lead, then transitions to offense. It actively intercepts the player's expansion and defends its cities.

**Why this priority**: The AI opponent is required for the game to be playable as a single-player experience.

**Independent Test**: End turns repeatedly without acting; AI should move units, capture settlements, produce units, contest player-targeted cities, and eventually attack.

**Acceptance Scenarios**:

1. **Given** the AI's income per turn is not greater than the player's OR the AI's unit count is not greater than the player's, **When** the AI takes its turn, **Then** it prioritizes capturing neutral cities and producing units over attacking.
2. **Given** the AI's income per turn exceeds the player's AND the AI has more military units, **When** the AI takes its turn, **Then** it initiates offensive attacks against player units and territory.
3. **Given** the player is moving toward a neutral city, **When** the AI takes its turn, **Then** the AI moves a unit toward that same city to contest it.
4. **Given** the player occupies a city at 50% capture progress, **When** the AI has available units, **Then** the AI moves a unit to disrupt the capture.
5. **Given** the AI completes its turn, **When** the turn concludes, **Then** control returns to the human player within the configured time budget (default 5 seconds).
6. **Given** the AI has cities with sufficient funds, **When** its turn begins, **Then** it queues unit production in all idle affordable cities.

---

### User Story 8 — Victory & End-Game Scoreboard (Priority: P8)

The game ends when a player loses all cities. A scoreboard compares key stats (units produced, units lost, cities at end, total income) for both sides before returning to the main menu.

**Why this priority**: Victory conditions give the game a definitive end state and validate the full game loop.

**Independent Test**: Capture all enemy cities; verify game detects win, stops input, shows scoreboard with accurate stats, and allows return to main menu.

**Acceptance Scenarios**:

1. **Given** a player captures their opponent's last city, **When** the turn ends, **Then** the game ends, a victory message shows, and a scoreboard appears.
2. **Given** the game ends, **When** the scoreboard displays, **Then** it shows units produced, units lost, cities at game end, and total income earned — for both Player and AI side-by-side.
3. **Given** the scoreboard is displayed, **When** the player clicks continue, **Then** the game returns to the main menu with no artifacts from the finished session.

---

### User Story 9 — Map Navigation: Pan & Zoom (Priority: P9)

Players pan the map by click-dragging and zoom with the scroll wheel (mouse) or pinch gesture (touch). The map stays within bounds and tile selection remains accurate at all zoom/pan levels.

**Why this priority**: Without pan/zoom, large maps are inaccessible — tiles outside the visible area cannot be seen or interacted with.

**Independent Test**: On a large map, drag to pan; scroll to zoom; click a tile at non-default zoom — verify correct tile is selected and viewport stays within bounds.

**Acceptance Scenarios**:

1. **Given** a map that exceeds the window, **When** the player drags on the map, **Then** the viewport pans in the drag direction and stops at map edges.
2. **Given** the map is visible, **When** the player scrolls up, **Then** the map zooms in centered on the cursor; scrolling down zooms out.
3. **Given** the player zooms to the min or max limit, **When** they attempt to go further, **Then** the zoom level stays clamped.
4. **Given** the player clicks a tile at any zoom/pan level, **When** the click registers, **Then** the correct map tile is selected.

---

### User Story 10 — Mobile Touch Support (Priority: P10)

The game is fully playable on mobile browsers: tap to select/move/attack, one-finger drag to pan, pinch to zoom. UI elements are sized for comfortable touch interaction.

**Why this priority**: Without touch support, the game is completely unusable on mobile devices.

**Independent Test**: On a mobile device, complete a full game (start, move, attack, capture, win) using only touch input.

**Acceptance Scenarios**:

1. **Given** the game on a mobile browser, **When** the player taps a unit, **Then** it is selected with move/attack highlights shown.
2. **Given** a unit selected, **When** the player taps a reachable tile, **Then** the unit moves; tapping an attackable enemy triggers an attack.
3. **Given** the map is displayed, **When** the player one-finger drags, **Then** the map pans; two-finger pinch zooms.
4. **Given** a quick tap vs. a drag, **When** the gesture resolves, **Then** the system correctly distinguishes tap (select/action) from drag (pan).
5. **Given** any game UI button, **When** displayed on mobile, **Then** tap target is at minimum 44×44 CSS pixels.

---

### User Story 11 — UI & Visual Polish (Priority: P11)

The game provides complete visual feedback: distinct pixel art unit sprites, terrain tile details, city vs. town visuals, floating damage numbers, unit stat tooltips, economy control panel, AI thinking indicator, animated AI turns, and in-game instructions.

**Why this priority**: These collectively make the game readable, understandable, and enjoyable to play.

**Independent Test**: Play a full game; verify pixel art sprites, player-color differentiation, hover tooltips, floating damage, control panel updates, animated AI actions, and instruction overlay all function correctly.

**Acceptance Scenarios**:

1. **Given** units on the map, **When** the player views them, **Then** Scout, Infantry, and Artillery display distinct pixel art sprites; Player 1 and Player 2 units are visually distinguishable.
2. **Given** a unit is visible, **When** the player hovers over it, **Then** a tooltip shows: type, HP (current/max), movement, attack, defense, attack range, and vision.
3. **Given** combat occurs, **When** the attack animation plays, **Then** floating damage numbers appear above the defender (attack damage) and attacker (counterattack damage), then float up and fade.
4. **Given** a game is in progress, **When** the player views the screen, **Then** a control panel shows income/turn, cities owned, and towns owned — updating in real-time on captures.
5. **Given** the player clicks the help button, **When** the overlay opens, **Then** instructions cover: objective, movement, combat, settlements, fog of war, and victory; overlay closes on Escape or close button and blocks game input while open.
6. **Given** the AI is computing its moves, **When** the computation phase runs, **Then** a "thinking" indicator is visible; it disappears when AI actions start animating.
7. **Given** the AI's turn, **When** the AI moves or attacks, **Then** each action animates sequentially and the player can follow it; player input is locked during AI animations.
8. **Given** any two adjacent tiles, **When** the map renders, **Then** there are no visible gaps or grid lines between them.

---

### Edge Cases

- Two units cannot share a tile under any circumstance. If a city tile is occupied when a produced unit would spawn, the blocking unit must be moved first.
- Minimum combat damage is always 1, regardless of attacker/defender strength difference.
- If a city being produced from is captured mid-turn, production is cancelled with no refund.
- Map generation retries (up to 10 times) if connectivity or opposing-position constraints fail; falls back to a guaranteed-valid algorithm after max retries.
- On very small maps, starting cities are maximally separated given map dimensions (minimum half the shorter dimension).
- If both players simultaneously lose their last city, the initiating player loses.
- During AI animation, player input is blocked; if the tab is backgrounded mid-animation, animations complete on refocus or skip to final state.
- Mobile: a pinch that drops to one finger mid-gesture transitions to pan without a jump; a tap with minor drift registers as a tap not a pan.
- Pull-to-refresh, double-tap-to-zoom, and long-press context menus are suppressed in the game viewport on mobile.
- No artifacts from prior game sessions appear on any UI element when a new game starts.
- A city at 50% capture progress when the game ends is counted as owned by its current legal owner (not the in-progress captor) for scoreboard purposes.

---

## Requirements *(mandatory)*

### Functional Requirements

**Map & Game Setup**

- **FR-001**: System MUST display a main menu with map size options Small (20×20), Medium (30×30), and Large (40×40) tiles before each game.
- **FR-002**: System MUST procedurally generate a unique, fully connected map (no isolated settlement islands) for each game using a random seed, retrying up to 10 times before falling back to a guaranteed algorithm.
- **FR-003**: Player 1's and Player 2's starting cities MUST be placed on opposite halves of the map, maximizing their separation.
- **FR-004**: Each player MUST start with exactly one owned city, one Scout pre-placed at that city (free, not deducted from starting funds), and $200 in funds.
- **FR-005**: System MUST fully clear all prior session UI elements before rendering a new game.

**Terrain & Movement**

- **FR-006**: Maps MUST include five terrain types — plains, grassland, forest, mountain, water — each with distinct visuals and movement costs (plains/grassland: 1, forest: 2, mountain: 3, water: impassable to all land units).
- **FR-007**: Players MUST be able to move a selected unit to any reachable tile within its movement allowance accounting for terrain cost.
- **FR-008**: System MUST block movement onto tiles occupied by any unit and onto tiles reachable only through enemy-occupied intermediate tiles.
- **FR-009**: System MUST guarantee that no two units share the same tile in any post-action game state.
- **FR-010**: System MUST render terrain tiles edge-to-edge with no visible gaps between adjacent tiles (no grid lines). All highlight overlays must also render without gaps.
- **FR-011**: Each terrain type MUST display decorative detail elements over the base color that do not obscure unit sprites.

**Combat**

- **FR-012**: When a player clicks an enemy tile with a friendly unit selected and the enemy is in attack range, the system MUST issue an attack action (not a move).
- **FR-013**: The attacker MUST remain on its origin tile during and after combat; the attacker's sprite MUST NOT be rendered on the target tile at any point during the attack animation.
- **FR-014**: Combat MUST resolve as net damage = attacker attack − defender defense, minimum 1, applied to defender HP; adjacent defenders MUST counterattack immediately after.
- **FR-015**: Artillery MUST attack up to 2 tiles away; artillery ranged attacks MUST NOT trigger a counterattack.
- **FR-016**: Units at 0 HP MUST be removed from the map; a brief destruction animation MUST play before removal.
- **FR-017**: A unit MUST NOT be able to attack more than once per turn.

**Settlement Capture & Economy**

- **FR-018**: Capturing a city MUST require a unit to occupy it for two consecutive uninterrupted turns; a visible progress indicator MUST show 0% (no indicator), 50% (one turn), and 100% (capture complete) states on the city tile.
- **FR-019**: Capture progress MUST reset to 0% if the occupying unit leaves the city or is eliminated before the second turn completes.
- **FR-020**: Income MUST be collected at the start of each player's turn: cities = $100/turn, towns = $50/turn.
- **FR-021**: Players MUST be able to upgrade an owned town to a city for $500; the upgrade MUST apply immediately — city income, vision radius, and production capability activate on the same turn.
- **FR-022**: The AI MUST also be capable of upgrading its owned towns to cities as part of its strategy.

**Unit Production**

- **FR-023**: Players MUST queue one unit per city at a time; cost deducts immediately; unit appears at city at the start of the producing player's next turn.
- **FR-024**: System MUST prevent queuing production at a city that already has an active production order.
- **FR-025**: Newly spawned units MUST render visually above city/settlement graphics on the same tile.
- **FR-026**: Game MUST support exactly three unit types: Scout (high movement/vision, low HP/attack/defense), Infantry (balanced stats), Artillery (low movement, 2-tile attack range, does not receive counterattacks).

**Fog of War**

- **FR-027**: System MUST enforce per-player fog of war; visible tiles = union of vision radii from all owned units and owned settlements (city: 3-tile radius, town: 2-tile radius).
- **FR-028**: Previously explored tiles MUST show terrain and settlement info but hide enemy unit positions when outside all friendly vision.
- **FR-029**: Settlement vision MUST transfer immediately when ownership changes — new owner gains vision, former owner loses it.
- **FR-030**: Neutral settlements MUST NOT grant vision to either player.

**AI Opponent**

- **FR-031**: The AI MUST have complete, unrestricted visibility of the entire game map (omniscient) at all times.
- **FR-032**: The AI MUST follow a phased strategy evaluated at the start of each AI turn: transition to offensive phase only when BOTH conditions hold — (1) AI income per turn > player income per turn AND (2) AI military unit count > player military unit count. If either condition is not met, remain in expansion phase.
- **FR-033**: In expansion phase, the AI MUST prioritize capturing neutral cities and producing units over attacking the player.
- **FR-034**: The AI MUST actively monitor player unit positions and move to contest cities the player is advancing toward.
- **FR-035**: The AI MUST move units to interrupt player city captures (cities where the player is at 50% progress) when available units allow.
- **FR-036**: In offensive phase, the AI MUST attack player units and territory while maintaining at least one unit near its own cities.
- **FR-037**: The AI MUST queue production in every idle, affordable city each turn — it MUST NOT hoard funds while cities sit idle.
- **FR-038**: The AI MUST complete its turn decision within the configured time budget (default 5 seconds per turn).
- **FR-039**: The AI MUST animate each of its actions sequentially during its turn so the player can observe them; player input MUST be locked during AI action animations.
- **FR-040**: System MUST display a "thinking" indicator immediately when AI computation begins; it MUST disappear when AI actions start animating.

**Victory & Scoreboard**

- **FR-041**: System MUST end the game when a player controls zero cities, declaring the other the winner.
- **FR-042**: System MUST display a scoreboard at game end (win or loss) showing side-by-side stats for Player vs. AI: total units produced, total units lost, cities owned at game end, and total income earned during the game.
- **FR-043**: The scoreboard MUST include a button to dismiss it and return to the main menu.

**Navigation: Pan & Zoom**

- **FR-044**: Players MUST be able to pan the map by clicking and dragging on the map area; panning MUST clamp so no empty space beyond map edges is ever visible.
- **FR-045**: Players MUST be able to zoom with the mouse scroll wheel (desktop) or pinch gesture (mobile), centered on the cursor/pinch center; zoom MUST clamp to defined min/max levels.
- **FR-046**: Pan boundary clamping MUST account for the current zoom level.
- **FR-047**: Tile selection MUST be accurate at all zoom and pan offsets — no click-target misalignment.

**Mobile Support**

- **FR-048**: Game MUST respond to touch events: single tap = click action, one-finger drag = pan, two-finger pinch = zoom.
- **FR-049**: System MUST distinguish tap (quick touch, minimal movement below threshold) from drag (sustained movement above threshold) to prevent accidental panning when the player intends to tap.
- **FR-050**: All interactive UI elements MUST have a minimum 44×44 CSS pixel tap target on mobile.
- **FR-051**: Game MUST suppress conflicting mobile browser behaviors: pull-to-refresh, page overscroll, double-tap-to-zoom, long-press context menus.
- **FR-052**: HUD status bar MUST be rendered at the top of the game viewport, respecting mobile safe-area insets (notches, dynamic islands).
- **FR-053**: All existing desktop mouse interactions MUST continue to work identically alongside touch support.
- **FR-054**: Touch interactions on UI panels MUST NOT pass through to the game canvas beneath them.

**Visual & UI Polish**

- **FR-055**: Each unit type MUST display a distinct pixel art sprite; Player 1 and Player 2 units of the same type MUST be visually differentiated by player color.
- **FR-056**: Unit sprites MUST NOT be rendered on tiles hidden by fog of war.
- **FR-057**: City tiles MUST display a recognizably urban visual; town tiles MUST display a recognizably small-settlement visual; they MUST be clearly distinct from each other and from terrain.
- **FR-058**: Settlement ownership indicator (player color) MUST remain visible alongside city/town imagery.
- **FR-059**: While a unit is selected, the tile under the cursor MUST display a move-hover highlight if it is a valid move destination, or an attack-hover highlight if it contains an attackable enemy; no highlight when no unit is selected.
- **FR-060**: System MUST display floating damage numbers during combat for both the initial attack and any counterattack; numbers MUST animate upward and fade out over approximately 1 second.
- **FR-061**: System MUST show a unit stat tooltip (type, HP current/max, movement, attack, defense, attack range, vision) on cursor hover (desktop) or long-press ≥500ms (mobile) for any visible unit; tooltip disappears when cursor leaves or touch releases.
- **FR-062**: System MUST display a persistent control panel showing player's income per turn, cities owned, and towns owned — values MUST update in real-time as game state changes.
- **FR-063**: System MUST provide a help button during gameplay that opens an instructions overlay covering: game objective, unit movement, attacking, unit types, settlement mechanics (income/production/upgrading), fog of war, and victory conditions; overlay MUST be dismissible via close button and Escape key and MUST block game input while open.
- **FR-064**: System MUST play distinct audio cues on: unit selection, move completion, and attack completion; audio initialization failures MUST NOT prevent game loading or functioning.
- **FR-065**: Game canvas MUST be centered horizontally and vertically in the browser viewport on initial load and on window resize.

### Key Entities

- **Map**: Rectangular grid (Small: 20×20, Medium: 30×30, Large: 40×40 tiles); carries connectivity guarantee and player-separation constraint.
- **Tile**: Single grid cell with one terrain type, an optional settlement, and at most one unit; tile and unit positions must always be in sync.
- **Terrain**: Plains (move cost 1), Grassland (move cost 1), Forest (move cost 2), Mountain (move cost 3), Water (impassable).
- **Settlement (City or Town)**: Capturable location with owner (player, AI, or neutral), type, income ($100/$50 per turn), vision radius (city: 3 tiles, town: 2 tiles), optional production queue; cities support unit production; towns can be upgraded to cities for $500.
- **Capture Progress**: Per-city counter tracking consecutive turns of occupation (0 or 1 turns occupied); resets on interruption; two consecutive turns required for ownership transfer.
- **Unit**: Game piece with type (Scout/Infantry/Artillery), current HP, movement allowance, vision range, attack strength, defense strength, attack range; occupies exactly one tile; may move AND attack once per turn.
- **Player**: Human or AI participant with current funds, list of owned settlements, and collection of units.
- **AI Phase**: Current AI strategic mode — expansion (default) or offensive. Transitions to offensive only when AI income per turn > player income per turn AND AI military unit count > player military unit count; re-evaluated each AI turn.
- **Game Stats Record**: Per-player accumulator tracking units produced, units lost, income earned, and cities at game end — displayed on the end-game scoreboard.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new game starts from menu to a fully rendered playable map in under 5 seconds.
- **SC-002**: Across 20 consecutively generated maps of any size, 100% are fully connected and have starting cities on opposite halves of the map.
- **SC-003**: A complete game (start to victory/defeat screen) plays without errors or crashes.
- **SC-004**: Cities require exactly two turns of uninterrupted occupation to change ownership in 100% of test cases.
- **SC-005**: A capture progress indicator is visible on any city under active occupation and absent on all uncontested cities in 100% of test cases.
- **SC-006**: Fog of war correctly hides all unexplored and out-of-vision tiles for the human player in 100% of tested scenarios.
- **SC-007**: The AI moves at least one unit every turn from turn 1 and produces at least one new unit within the first 3 turns.
- **SC-008**: The AI captures at least one neutral settlement within the first 5 turns.
- **SC-009**: In at least 80% of test games, the AI does not initiate its first offensive attack unless both conditions hold: AI income per turn > player income per turn AND AI unit count > player unit count.
- **SC-010**: The AI successfully intercepts at least 60% of observable player city-capture attempts in structured tests.
- **SC-011**: A player who only ends turns (never acts) loses to the AI within 30 turns on any map size.
- **SC-012**: The AI completes its turn decision within 5 seconds on all supported map sizes.
- **SC-013**: The end-game scoreboard appears within 1 second of the game-ending condition and accurately reflects all four required stats for both sides.
- **SC-014**: Players can navigate to any tile on a large map using pan and zoom with no tile permanently inaccessible.
- **SC-015**: Clicking/tapping a tile at any zoom level and pan offset correctly selects that tile with no misalignment.
- **SC-016**: After starting a second game, zero UI artifacts from the previous session are visible anywhere on screen.
- **SC-017**: Players can complete a full game entirely via touch input on a mobile browser without desktop input.
- **SC-018**: 95% of intended taps register as taps (not pan gestures) during normal mobile play.
- **SC-019**: No default browser behaviors (pull-to-refresh, page zoom, context menus) interrupt gameplay on mobile.
- **SC-020**: Players can view any visible unit's full stats within 1 second by hovering or long-pressing.
- **SC-021**: 100% of combat encounters display floating damage numbers for both attacker and defender.
- **SC-022**: No visible gaps appear between any adjacent tiles on the game map; all highlight overlays also render flush.
- **SC-023**: All three sound events (select, move, attack) play on audio-enabled browsers; no errors occur when audio is blocked.

---

## Assumptions

- **Single-player only**: Human = Player 1, AI = Player 2. No multiplayer or networked play.
- **Map sizes**: Small = 20×20, Medium = 30×30, Large = 40×40 tiles.
- **Settlement counts** (scaled to map size): Small ≈ 6–8 towns, Medium ≈ 10–12 towns, Large ≈ 16–20 towns.
- **Starting funds**: $200 per player; starting Scout is free and does not deduct from starting funds.
- **Income**: Cities = $100/turn, Towns = $50/turn. Collected at the start of each player's turn.
- **Combat formula**: Net damage = attacker attack − defender defense, minimum 1. Deterministic — no randomness.
- **Unit vision radii**: Scout 3, Infantry 2, Artillery 2.
- **Settlement vision radii**: City 3-tile radius, Town 2-tile radius.
- **Town upgrade cost**: $500, converts immediately to city with all city benefits (income $100/turn, 3-tile vision, production access).
- **Production timing**: Unit appears at the start of the producing player's next turn (1-turn delay).
- **Zoom range**: 0.5× (min) to 2.5× (max), default 1.0×.
- **AI thinking time**: Default 5 seconds per turn (configurable).
- **AI phase re-evaluation**: Evaluated at the start of each AI turn; if either condition fails mid-offense, AI returns to expansion phase on the next turn.
- **"Military units"**: Total living units on the map (not units in production queues).
- **Browser-only**: Runs entirely client-side with no server or persistent storage.
- **Mobile targets**: Safari iOS 15+, Chrome Android 10+.
- **Audio**: Web Audio API or small generated audio files; no large asset downloads.
- **No naval units**: Water is fully impassable for all unit types.
- **Hover highlighting on mobile**: No hover equivalent; mobile players rely on tile highlights shown after selection.
- **Capture for scoreboard**: A city at 50% capture progress when the game ends is counted as owned by its current legal owner (not the in-progress captor).
