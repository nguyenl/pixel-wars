# Feature Specification: Game UI Enhancements

**Feature Branch**: `012-game-ui-enhancements`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "Add in game instructions for how to play the game. Also, add a control panel that shows current income, cities and settlements owned. Update the UI so that when an attack animation occurs, it shows the damage occurring between units. Hovering over a unit will also show its stats such as movement speed, attack, range, vision, etc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Control Panel with Game Economy Overview (Priority: P1)

As a player, I want to see a persistent control panel displaying my current income per turn, number of cities owned, and number of settlements (towns) owned, so I can make informed strategic decisions about production and expansion without having to count settlements manually.

**Why this priority**: Economic awareness is the most critical missing information — players need to understand their income rate and territory control at a glance to plan unit production and expansion. This directly impacts strategic decision-making every single turn.

**Independent Test**: Can be tested by starting a game and verifying the control panel updates correctly as settlements are captured, lost, or upgraded throughout the game.

**Acceptance Scenarios**:

1. **Given** a game is in progress, **When** the player views the screen, **Then** a control panel is visible showing: income per turn, number of cities owned, and number of towns owned.
2. **Given** a player captures an enemy town, **When** the capture resolves, **Then** the control panel updates to reflect the new town count and updated income.
3. **Given** a player upgrades a town to a city, **When** the upgrade completes, **Then** the city count increases by one, the town count decreases by one, and income per turn updates accordingly.
4. **Given** an enemy captures one of the player's settlements, **When** the capture resolves, **Then** the control panel decreases the relevant settlement count and income.

---

### User Story 2 - Unit Stat Tooltip on Hover (Priority: P2)

As a player, I want to see detailed stats for any visible unit when I hover over it (or long-press on mobile), including movement speed, attack power, defense, range, vision, and current HP, so I can evaluate threats and plan combat engagements.

**Why this priority**: Understanding unit capabilities is essential for tactical decisions. New players especially need easy access to unit stats to learn the game, and experienced players benefit from quick reference without memorization.

**Independent Test**: Can be tested by hovering over different unit types (Scout, Infantry, Artillery) and verifying all stats display correctly, including for both friendly and enemy units.

**Acceptance Scenarios**:

1. **Given** a visible unit on the map, **When** the player hovers their cursor over it, **Then** a tooltip appears showing the unit's type, HP, movement points, attack strength, defense strength, attack range, and vision range.
2. **Given** a tooltip is displayed, **When** the player moves their cursor away from the unit, **Then** the tooltip disappears.
3. **Given** an enemy unit is visible (not in fog of war), **When** the player hovers over it, **Then** the tooltip shows the same stat categories as friendly units.
4. **Given** a unit has taken damage, **When** the player hovers over it, **Then** the tooltip shows current HP out of maximum HP (e.g., "3/5").
5. **Given** a mobile device with no hover capability, **When** the player taps and holds on a unit, **Then** the tooltip appears after a brief delay. **When** the player releases, **Then** the tooltip disappears.

---

### User Story 3 - Combat Damage Numbers (Priority: P3)

As a player, I want to see floating damage numbers during attack animations so I can understand how much damage was dealt to each unit during combat, including counterattack damage.

**Why this priority**: Damage feedback makes combat outcomes transparent and helps players learn the combat system. Without visual damage indicators, players must mentally track HP changes, which is tedious and error-prone.

**Independent Test**: Can be tested by initiating an attack between two units and verifying damage numbers appear over the defending unit (and over the attacking unit if a counterattack occurs).

**Acceptance Scenarios**:

1. **Given** a player's unit attacks an enemy unit, **When** the attack animation plays, **Then** a floating damage number appears above the defending unit showing the damage dealt.
2. **Given** combat results in a counterattack, **When** the counterattack resolves, **Then** a second floating damage number appears above the attacking unit showing counterattack damage.
3. **Given** a damage number appears, **When** a brief duration passes, **Then** the number floats upward and fades out.
4. **Given** the AI performs attacks during its turn, **When** the attack animations play, **Then** damage numbers are also displayed for AI combat actions.

---

### User Story 4 - In-Game Instructions (Priority: P4)

As a new player, I want access to a help overlay that explains how to play the game, including game objectives, unit types, controls, and basic strategy tips, so I can learn the game without external documentation.

**Why this priority**: While important for onboarding, experienced players only need this once. The other features provide ongoing value every turn. Instructions can be the last addition since the game is already playable without them.

**Independent Test**: Can be tested by opening the help overlay from an in-game button and verifying all instruction sections are present and readable.

**Acceptance Scenarios**:

1. **Given** the player is in a game, **When** they click a help/instructions button, **Then** an overlay appears with game instructions.
2. **Given** the instructions overlay is open, **When** the player clicks a close button or presses Escape, **Then** the overlay closes and the game is visible again.
3. **Given** the instructions overlay is open, **Then** it contains sections covering: game objective, how to move units, how to attack, unit types and their differences, how settlements work (income, production, upgrading), how fog of war works, and how to win.
4. **Given** the game is paused or in any phase, **When** the player opens instructions, **Then** the game does not advance or accept input behind the overlay.

---

### Edge Cases

- What happens when the player hovers over a tile with no unit? No tooltip should appear.
- What happens when the player hovers over a unit in fog of war? Tooltip should not appear for hidden units.
- What happens when damage is zero (minimum 1 damage in this game)? Display "1" as damage since the game enforces minimum 1 damage.
- What happens when the control panel values change mid-animation (AI turn captures)? Values should update after the capture action resolves, not during animation.
- What happens on very small screens where the control panel might overlap other UI? The control panel should be compact enough to fit without overlapping the existing HUD. The HUD bar is rendered in document flow (not floating), so it pushes the game canvas down and cannot overlap it. The control panel's top position is dynamically calculated from the HUD bar's rendered height so it always appears just below the bar and over the game area.
- What happens if the player opens instructions during the AI turn? Instructions should still be accessible; the AI turn continues in the background but no game input is accepted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a persistent control panel during gameplay showing the player's income per turn (gold earned from all owned settlements).
- **FR-002**: System MUST display the count of cities owned by the player in the control panel.
- **FR-003**: System MUST display the count of towns owned by the player in the control panel.
- **FR-004**: System MUST update the control panel values in real-time as game state changes (captures, upgrades, losses).
- **FR-005**: System MUST show a tooltip with unit stats when the player hovers over any visible unit on the map.
- **FR-006**: The unit tooltip MUST display: unit type, current HP / max HP, movement points, attack strength, defense strength, attack range, and vision range.
- **FR-007**: The unit tooltip MUST work for both friendly and enemy visible units.
- **FR-008**: On touch devices, the tooltip MUST appear on long-press and dismiss on release.
- **FR-009**: System MUST display floating damage numbers above units during combat animations.
- **FR-010**: Damage numbers MUST appear for both the initial attack and any counterattack.
- **FR-011**: Damage numbers MUST animate (float upward and fade out) over a brief duration.
- **FR-012**: Damage numbers MUST display during AI turn combat animations as well as player-initiated combat.
- **FR-013**: System MUST provide an accessible help button during gameplay that opens an instructions overlay.
- **FR-014**: The instructions overlay MUST cover: game objective, unit movement, attacking, unit types, settlement mechanics (income, production, upgrading), fog of war, and victory conditions.
- **FR-015**: The instructions overlay MUST be dismissible via a close button and the Escape key.
- **FR-016**: The instructions overlay MUST prevent game input while open.

### Key Entities

- **Control Panel**: A UI element displaying aggregated player economy data (income per turn, city count, town count), derived from existing settlement and player state.
- **Unit Tooltip**: A transient UI element showing detailed stats for a single unit, appearing on hover/long-press and disappearing when the pointer leaves.
- **Damage Number**: A short-lived visual element displaying an integer damage value, positioned above a unit during combat and animating upward with a fade-out.
- **Instructions Overlay**: A full-screen or near-full-screen panel containing categorized game instructions, dismissible by user action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can determine their income per turn, city count, and town count at any point during gameplay without performing manual calculations — information is always visible on screen.
- **SC-002**: Players can view any visible unit's full stats (type, HP, movement, attack, defense, range, vision) within 1 second by hovering over it.
- **SC-003**: 100% of combat encounters display floating damage numbers for both attacker and defender damage (including counterattacks).
- **SC-004**: New players can access a complete set of game instructions within 2 clicks from any in-game state.
- **SC-005**: The instructions overlay covers all core game mechanics (objective, units, combat, settlements, fog of war, victory) in a single readable view.
- **SC-006**: All new UI elements function correctly on both desktop (mouse) and mobile (touch) devices.

## Assumptions

- The HUD top bar is rendered in document flow (not `position: fixed`) inside a `#hud-bar` div that is a flex sibling of the `#game-area` canvas container. This prevents the bar from ever floating over the game canvas on small screens.
- A visible border is drawn around the `#game-area` canvas container to visually separate the game from the page background.
- The control panel will be positioned in the top-right area, directly below the HUD top bar, using `position: fixed` and a `top` value equal to the HUD bar's rendered `offsetHeight`.
- Damage numbers will use a standard floating number pattern: appear at the unit's position, drift upward, and fade out over approximately 1 second.
- The instructions content will be static text — no interactive tutorial or guided walkthrough is needed.
- The tooltip will appear near the cursor/touch point, repositioning if necessary to stay within screen bounds.
- The existing unit info panel (shown when selecting a unit) remains unchanged; the tooltip is a separate, lighter-weight overlay for quick reference.
- Long-press duration for mobile tooltip activation will be approximately 500ms, consistent with platform conventions.
