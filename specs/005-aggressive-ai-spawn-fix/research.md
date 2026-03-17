# Research: Aggressive AI & Spawn Render Fix

**Feature**: 005-aggressive-ai-spawn-fix
**Date**: 2026-03-15

## R1: Why the AI Does Not Move

**Decision**: The root cause is that `buildObjectives()` (ai.ts:55-85) only creates objectives for visible enemy units and unowned settlements. When the AI has no visible enemies and no known unowned settlements — which is the common early-game state since the AI starts with limited vision — the objectives list is empty. With zero objectives, `decideUnitActions()` has nothing to score against, and units remain idle.

**Rationale**: The `Objective` type already includes `'explore'` as a valid objective type, and `unitFitScore()` in scoring.ts already handles `'explore'` objectives (scout gets 2.0 bonus). The infrastructure exists but is never invoked. The fix is to generate exploration objectives in `buildObjectives()`.

**Alternatives considered**:
- Random movement when no objectives exist — rejected because it would not be directed toward useful map coverage and would produce erratic behavior
- Always-on wander behavior separate from objectives — rejected because it duplicates the objective system and adds complexity

## R2: How to Generate Exploration Objectives

**Decision**: Generate exploration objectives by scanning tiles at the boundary of the AI's known world. For each AI unit without a higher-priority objective, pick the nearest tile that borders unexplored (hidden) territory. If the AI's entire visible area is explored, pick random unexplored tiles at fixed intervals across the map grid to ensure broad coverage.

**Rationale**: Boundary tiles are the most information-dense targets — they are adjacent to unknown territory and reachable from the AI's current known positions. This avoids sending units to the far side of the map through fog when closer unexplored areas exist.

**Implementation approach**:
1. In `buildObjectives()`, after building enemy-unit and settlement objectives, scan `state.aiKnownWorld`
2. Identify tiles that are known but have at least one neighbor that is NOT in `aiKnownWorld`
3. Create `'explore'` objectives for a spread of these boundary tiles (limit to ~5 to avoid flooding the objective list)
4. If no boundary tiles exist (AI has seen everything nearby), create objectives toward map quadrants the AI hasn't visited

**Alternatives considered**:
- Random tile selection — rejected because it's inefficient and may send scouts into already-explored areas
- Vision-cone based expansion — rejected as over-engineered for the current objective system

## R3: Why the AI Does Not Build

**Decision**: Two causes identified:
1. **Occupied city check** (ai.ts:239): Production is skipped if the city tile has a unit on it. Since the starting scout sits on the starting city and the AI never moves it (due to R1), the city is permanently blocked.
2. **Rigid type selection** (ai.ts:242): The AI uses a fixed threshold (`>= 300 → artillery, >= 200 → infantry, >= 100 → scout`) which means with starting funds of 200, it always picks infantry. If the city is blocked, nothing happens. Even if unblocked, production choice doesn't account for strategic needs.

**Rationale**: Fix R1 first (move units off cities), but also make production more proactive: produce from all affordable idle cities regardless of tile occupancy (the spawned unit will appear next turn; if the tile is still occupied then, the spawn is deferred per existing logic in turns.ts:66-70). Additionally, make type selection consider current army composition — if the AI has no scouts, prefer scouts for exploration.

**Alternatives considered**:
- Queuing production even on occupied cities and deferring spawn — this is actually already how turns.ts works (it skips spawn if occupied). The issue is ai.ts prevents queuing in the first place. Just removing the occupancy check is sufficient.
- Adding a "move off city" pre-step — rejected as unnecessary; once exploration objectives work, units will naturally move off cities.

## R4: AI Aggression Strategy

**Decision**: Introduce an aggression mode that activates once the AI has 3+ combat units (infantry or artillery). When in aggression mode, the AI:
1. Increases the scoring weight for enemy-unit objectives
2. Creates objectives targeting the player's known settlements (even if not adjacent)
3. Sends surplus units (beyond 1 defender per owned city) toward the player's territory

**Rationale**: The current scoring weights (`objectiveValueScore * 2` for enemies) are reasonable for opportunistic engagement but insufficient for proactive aggression. When the AI has an army, it should seek out the player rather than waiting for chance encounters. The "3+ combat units" threshold ensures the AI doesn't rush prematurely with a single scout.

**Implementation approach**:
1. Count AI combat units (infantry + artillery) at the start of `computeTurn()`
2. If count >= 3, enter aggression mode:
   - Increase `objectiveValueScore` weight for enemy-unit objectives from 2.0 to 3.0
   - Add the player's known settlements as high-value objectives
   - Reduce the threat penalty (`threatScore` weight from -0.5 to -0.2) so AI is less deterred by enemy presence
3. Keep the existing retreat-at-25%-HP behavior — aggression doesn't mean suicidal

**Alternatives considered**:
- Global aggression toggle without threshold — rejected because early rush with 1 scout would fail
- Difficulty levels — rejected as out of scope; the goal is a baseline competent opponent
- Force concentration (send all units to one location) — rejected as too rigid; the scoring system already handles multi-objective distribution

## R5: Spawn Rendering Bug Root Cause

**Decision**: The bug is in the interaction between `UnitsRenderer.render()` and `AnimationController.registerIdle()`. When a new unit is created:
1. `createUnitContainer()` returns a container at position (0, 0)
2. `registerIdle()` is called, storing `baseY = container.y = 0`
3. The position update sets `container.x` and `container.y` to the correct tile position
4. On the next tick, the idle animation sets `container.y = baseY + sin(...) = 0 + sin(...)`, overriding the correct position

The unit renders near y=0 (top of the map) and bobs around there instead of on its city tile. Since the city is typically mid-map, the unit appears to be "behind" or invisible — it's actually off-screen or at the wrong location.

**Rationale**: The container hierarchy is correct (units container is above tilemap container in PixiJS child order). The issue is positional, not z-order.

**Fix**: Update `registerIdle()` to accept a baseY parameter, or call `registerIdle()` AFTER position is set in `render()`. The simplest fix is to update the idle's `baseY` whenever the unit position is set during render, so the idle bob always oscillates around the correct y-coordinate.

**Alternatives considered**:
- Setting zIndex on individual unit containers — incorrect diagnosis; the z-order is already correct
- Moving registerIdle to a deferred frame — adds unnecessary complexity; just sync baseY after position update
