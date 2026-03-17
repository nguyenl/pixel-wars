import { describe, it, expect } from 'vitest';
import { computeTurn, buildObjectives } from '../../src/game/ai/ai';
import { computeUtility, type Objective } from '../../src/game/ai/scoring';
import { newGame } from '../../src/game/state';
import { applyAction } from '../../src/game/state';
import type { GameState } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { UNIT_CONFIG, AI_TIME_BUDGET_MS, AI_UPGRADE_THRESHOLD } from '../../src/game/constants';
import { endTurn, endAiTurn } from '../../src/game/turns';

function makeAIState(): GameState {
  const state = newGame('large', 55);
  // Switch to AI turn
  return { ...state, currentPlayer: 'player2', phase: 'orders' };
}

/** Returns a real game state in the 'ai' phase as it occurs during actual gameplay. */
function makeRealAITurnState(): GameState {
  const state = newGame('small', 42);
  // Player 1 ends their turn → transitions to phase: 'ai', currentPlayer: 'player2'
  return endTurn(state);
}

describe('computeTurn (AI)', () => {
  it('computeTurn returns a non-empty action list when AI has mobile units', () => {
    let state = makeAIState();
    // Place an AI unit
    const unitId = 'ai-scout';
    const unitTile = tileId(10, 10);
    state = {
      ...state,
      units: {
        [unitId]: {
          id: unitId,
          type: 'scout',
          owner: 'player2',
          tileId: unitTile,
          hp: 3,
          movementPoints: UNIT_CONFIG.scout.movementAllowance,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [unitTile]: { ...state.tiles[unitTile], unitId },
      },
    };
    const actions = computeTurn(state);
    expect(actions.length).toBeGreaterThan(0);
  });

  it('last action is always EndTurnAction', () => {
    const state = makeAIState();
    const actions = computeTurn(state);
    const last = actions[actions.length - 1];
    expect(last.type).toBe('end-turn');
  });

  it('every returned action passes applyAction validation (no invalid moves)', () => {
    let state = makeAIState();
    // Add some AI units
    const scoutTile = tileId(8, 8);
    state = {
      ...state,
      units: {
        'ai-unit-1': {
          id: 'ai-unit-1',
          type: 'infantry',
          owner: 'player2',
          tileId: scoutTile,
          hp: 5,
          movementPoints: UNIT_CONFIG.infantry.movementAllowance,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [scoutTile]: { ...state.tiles[scoutTile], unitId: 'ai-unit-1' },
      },
    };
    const actions = computeTurn(state);
    let currentState = state;
    for (const action of actions) {
      const result = applyAction(currentState, action);
      expect(result.ok).toBe(true);
      if (result.ok) {
        currentState = result.state;
      }
    }
  });

  it('computeTurn completes within AI_TIME_BUDGET_MS on a 20x20 map', () => {
    const state = newGame('large', 77);
    const aiState: GameState = { ...state, currentPlayer: 'player2', phase: 'orders' };
    const start = Date.now();
    computeTurn(aiState);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(AI_TIME_BUDGET_MS + 500); // small tolerance
  });
});

// ---------------------------------------------------------------------------
// Tests against the REAL 'ai' phase (these expose the phase-gate bug)
// T003: produce action returned during real AI turn
// T004: all actions apply via applyAction() during phase 'ai'
// T005: at least one AI unit moves from its starting position
// T006: attack action generated when adjacent to weaker enemy
// ---------------------------------------------------------------------------

describe('AI actions during real game phase (phase: ai)', () => {
  it('T003: computeTurn returns a produce action when AI has funds and an idle, unoccupied city', () => {
    // The starting AI scout sits on the city tile, so on turn 1 production is skipped.
    // To test production we move the scout off the city tile first.
    let state = makeRealAITurnState();
    const aiScout = Object.values(state.units).find(u => u.owner === 'player2');
    expect(aiScout).toBeDefined();
    if (!aiScout) return;

    // Find a passable tile that is not the city tile
    const cityTileId = aiScout.tileId;
    const freeTile = Object.values(state.tiles).find(
      t => t.id !== cityTileId && t.terrain !== 'water' && t.terrain !== 'mountain' && t.unitId === null,
    );
    expect(freeTile).toBeDefined();
    if (!freeTile) return;

    // Move the AI scout off the city tile
    state = {
      ...state,
      units: { ...state.units, [aiScout.id]: { ...aiScout, tileId: freeTile.id } },
      tiles: {
        ...state.tiles,
        [cityTileId]: { ...state.tiles[cityTileId], unitId: null },
        [freeTile.id]: { ...freeTile, unitId: aiScout.id },
      },
    };

    const actions = computeTurn(state);
    const hasProduceAction = actions.some(a => a.type === 'produce');
    expect(hasProduceAction).toBe(true);
  });

  it('T004: every action returned by computeTurn applies successfully via applyAction during phase ai', () => {
    const state = makeRealAITurnState();
    expect(state.phase).toBe('ai');
    const actions = computeTurn(state);
    let currentState = state;
    for (const action of actions) {
      if (action.type === 'end-turn') break; // handled by endAiTurn(), not applyAction()
      const result = applyAction(currentState, action);
      expect(result.ok, `Action failed: ${JSON.stringify(action)}`).toBe(true);
      if (result.ok) currentState = result.state;
    }
  });

  it('T005: after applying all AI actions, at least one AI unit is on a different tile', () => {
    const state = makeRealAITurnState();
    const aiUnitsBefore = Object.values(state.units).filter(u => u.owner === 'player2');
    const startTiles = new Set(aiUnitsBefore.map(u => u.tileId));

    const actions = computeTurn(state);
    let currentState = state;
    for (const action of actions) {
      const result = applyAction(currentState, action);
      if (result.ok) currentState = result.state;
    }

    const aiUnitsAfter = Object.values(currentState.units).filter(u => u.owner === 'player2');
    const movedUnit = aiUnitsAfter.find(u => !startTiles.has(u.tileId));
    expect(movedUnit).toBeDefined();
  });

  it('T006: computeTurn returns an attack action when AI unit is adjacent to a weaker player unit', () => {
    let state = makeRealAITurnState();

    // Find the AI scout tile and place a low-HP player scout adjacent to it
    const aiScout = Object.values(state.units).find(u => u.owner === 'player2' && u.type === 'scout');
    expect(aiScout).toBeDefined();
    if (!aiScout) return;

    const aiTile = state.tiles[aiScout.tileId];
    // Find an adjacent passable, unoccupied tile for the enemy unit
    const adjacentTileId = Object.values(state.tiles).find(
      t => t.terrain !== 'water' && t.terrain !== 'mountain' && t.unitId === null &&
        Math.abs(t.coord.row - aiTile.coord.row) <= 1 && Math.abs(t.coord.col - aiTile.coord.col) <= 1 &&
        t.id !== aiTile.id,
    )?.id;
    expect(adjacentTileId).toBeDefined();
    if (!adjacentTileId) return;

    const enemyId = 'enemy-weak-scout';
    state = {
      ...state,
      units: {
        ...state.units,
        [enemyId]: {
          id: enemyId,
          type: 'scout',
          owner: 'player1',
          tileId: adjacentTileId,
          hp: 1, // Very low HP — kill shot opportunity
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [adjacentTileId]: { ...state.tiles[adjacentTileId], unitId: enemyId },
      },
    };

    const actions = computeTurn(state);
    const hasAttackAction = actions.some(a => a.type === 'attack');
    expect(hasAttackAction).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T018: AI captures a settlement when it moves onto it
// ---------------------------------------------------------------------------

describe('AI settlement capture (phase: ai)', () => {
  it('T018: resolveCaptures (called by endAiTurn) captures a neutral town when AI scout is standing on it', () => {
    // This test verifies the capture mechanic works end-to-end:
    // An AI unit on a neutral settlement tile → endAiTurn → settlement owned by AI.
    let state = makeRealAITurnState();

    // Find the AI scout
    const aiScout = Object.values(state.units).find(u => u.owner === 'player2');
    expect(aiScout).toBeDefined();
    if (!aiScout) return;

    // Inject a neutral town ON the scout's current tile (simulate scout already there)
    const scoutTileId = aiScout.tileId;
    const scoutTile = state.tiles[scoutTileId];

    // Only inject if the tile has no settlement yet
    const townId = 'test-neutral-town';
    if (!scoutTile.settlementId) {
      state = {
        ...state,
        settlements: {
          ...state.settlements,
          [townId]: {
            id: townId,
            tileId: scoutTileId,
            type: 'town',
            owner: 'neutral',
            productionQueue: null,
          },
        },
        tiles: {
          ...state.tiles,
          [scoutTileId]: { ...scoutTile, settlementId: townId },
        },
      };
    }

    // Call endAiTurn directly — it calls resolveCaptures which should capture the town
    const finalState = endAiTurn(state);

    // The town (or the settlement on the scout's tile) should now be AI-owned
    const capturedSettlement = finalState.settlements[townId] ??
      Object.values(finalState.settlements).find(s => s.tileId === scoutTileId && s.owner === 'player2');
    expect(capturedSettlement?.owner).toBe('player2');
  });
});

// ---------------------------------------------------------------------------
// US1: AI Exploration Objectives
// ---------------------------------------------------------------------------

describe('US1: AI exploration objectives', () => {
  it('T002: buildObjectives returns explore objectives when AI has no visible enemies or settlements', () => {
    let state = makeRealAITurnState();

    // Remove all non-AI units and all non-AI settlements to leave no enemy/settlement objectives
    const aiUnits: Record<string, typeof state.units[string]> = {};
    const tiles = { ...state.tiles };
    for (const [id, unit] of Object.entries(state.units)) {
      if (unit.owner === 'player2') {
        aiUnits[id] = unit;
      } else {
        // Clear unit from tile
        tiles[unit.tileId] = { ...tiles[unit.tileId], unitId: null };
      }
    }

    // Remove all settlements except AI-owned ones
    const aiSettlements: Record<string, typeof state.settlements[string]> = {};
    for (const [id, s] of Object.entries(state.settlements)) {
      if (s.owner === 'player2') {
        aiSettlements[id] = s;
      } else {
        tiles[s.tileId] = { ...tiles[s.tileId], settlementId: null };
      }
    }

    state = { ...state, units: aiUnits, settlements: aiSettlements, tiles };

    // Update known world so AI has partial map knowledge
    const objectives = buildObjectives(state);
    const exploreObjectives = objectives.filter(o => o.type === 'explore');
    expect(exploreObjectives.length).toBeGreaterThan(0);
  });

  it('T003: explore objectives target tiles at the boundary of aiKnownWorld', () => {
    let state = makeRealAITurnState();

    // Strip non-AI units and non-AI settlements
    const aiUnits: Record<string, typeof state.units[string]> = {};
    const tiles = { ...state.tiles };
    for (const [id, unit] of Object.entries(state.units)) {
      if (unit.owner === 'player2') {
        aiUnits[id] = unit;
      } else {
        tiles[unit.tileId] = { ...tiles[unit.tileId], unitId: null };
      }
    }
    const aiSettlements: Record<string, typeof state.settlements[string]> = {};
    for (const [id, s] of Object.entries(state.settlements)) {
      if (s.owner === 'player2') {
        aiSettlements[id] = s;
      } else {
        tiles[s.tileId] = { ...tiles[s.tileId], settlementId: null };
      }
    }
    state = { ...state, units: aiUnits, settlements: aiSettlements, tiles };

    // Seed the AI's known world with a small region
    const knownWorld: typeof state.aiKnownWorld = {};
    const aiUnit = Object.values(aiUnits)[0];
    const aiTile = state.tiles[aiUnit.tileId];
    for (const [id, tile] of Object.entries(state.tiles)) {
      const dr = Math.abs(tile.coord.row - aiTile.coord.row);
      const dc = Math.abs(tile.coord.col - aiTile.coord.col);
      if (Math.max(dr, dc) <= 3) {
        knownWorld[id] = {
          lastSeenTurn: state.turn,
          terrain: tile.terrain,
          settlementId: tile.settlementId,
          lastSeenUnit: null,
        };
      }
    }
    state = { ...state, aiKnownWorld: knownWorld };

    const objectives = buildObjectives(state);
    const exploreObjectives = objectives.filter(o => o.type === 'explore');
    expect(exploreObjectives.length).toBeGreaterThan(0);

    // Each explore objective's tile should be a known tile with at least one unknown neighbor
    for (const obj of exploreObjectives) {
      expect(knownWorld[obj.tileId]).toBeDefined();
      const { row, col } = obj.tileCoord;
      const hasUnknownNeighbor = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
      ].some(([dr, dc]) => {
        const neighborId = `${row + dr},${col + dc}`;
        return state.tiles[neighborId] && !knownWorld[neighborId];
      });
      expect(hasUnknownNeighbor).toBe(true);
    }
  });

  it('T004: computeTurn returns at least one move action when the only objectives are explore-type', () => {
    let state = makeRealAITurnState();

    // Remove all non-AI units and non-AI settlements
    const aiUnits: Record<string, typeof state.units[string]> = {};
    const tiles = { ...state.tiles };
    for (const [id, unit] of Object.entries(state.units)) {
      if (unit.owner === 'player2') {
        aiUnits[id] = unit;
      } else {
        tiles[unit.tileId] = { ...tiles[unit.tileId], unitId: null };
      }
    }
    const aiSettlements: Record<string, typeof state.settlements[string]> = {};
    for (const [id, s] of Object.entries(state.settlements)) {
      if (s.owner === 'player2') {
        aiSettlements[id] = s;
      } else {
        tiles[s.tileId] = { ...tiles[s.tileId], settlementId: null };
      }
    }
    state = { ...state, units: aiUnits, settlements: aiSettlements, tiles };

    const actions = computeTurn(state);
    const moveActions = actions.filter(a => a.type === 'move');
    expect(moveActions.length).toBeGreaterThan(0);
  });

  it('T005: AI units spread across different explore objectives', () => {
    let state = makeRealAITurnState();

    // Remove non-AI units and settlements, add a second AI scout
    const tiles = { ...state.tiles };
    const units: Record<string, typeof state.units[string]> = {};
    for (const [id, unit] of Object.entries(state.units)) {
      if (unit.owner === 'player2') {
        units[id] = unit;
      } else {
        tiles[unit.tileId] = { ...tiles[unit.tileId], unitId: null };
      }
    }
    const aiSettlements: Record<string, typeof state.settlements[string]> = {};
    for (const [id, s] of Object.entries(state.settlements)) {
      if (s.owner === 'player2') {
        aiSettlements[id] = s;
      } else {
        tiles[s.tileId] = { ...tiles[s.tileId], settlementId: null };
      }
    }

    // Place a second scout near the first
    const firstUnit = Object.values(units)[0];
    const firstTile = state.tiles[firstUnit.tileId];
    const nearbyTile = Object.values(tiles).find(
      t => t.terrain !== 'water' && t.unitId === null && t.id !== firstUnit.tileId &&
        Math.abs(t.coord.row - firstTile.coord.row) <= 2 && Math.abs(t.coord.col - firstTile.coord.col) <= 2,
    );
    expect(nearbyTile).toBeDefined();
    if (!nearbyTile) return;

    const secondId = 'ai-scout-2';
    units[secondId] = {
      id: secondId,
      type: 'scout',
      owner: 'player2',
      tileId: nearbyTile.id,
      hp: UNIT_CONFIG.scout.maxHp,
      movementPoints: UNIT_CONFIG.scout.movementAllowance,
      hasAttacked: false,
    };
    tiles[nearbyTile.id] = { ...nearbyTile, unitId: secondId };
    state = { ...state, units, settlements: aiSettlements, tiles };

    const actions = computeTurn(state);
    const moveActions = actions.filter(a => a.type === 'move');

    // With 2 units, we expect 2 move actions (both should move)
    expect(moveActions.length).toBeGreaterThanOrEqual(2);

    // And they should target different destinations (last waypoint differs)
    if (moveActions.length >= 2) {
      const dest1 = (moveActions[0] as { path: Array<{ row: number; col: number }> }).path;
      const dest2 = (moveActions[1] as { path: Array<{ row: number; col: number }> }).path;
      const end1 = dest1[dest1.length - 1];
      const end2 = dest2[dest2.length - 1];
      const sameDestination = end1.row === end2.row && end1.col === end2.col;
      expect(sameDestination).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// US2: AI Builds Units Consistently
// ---------------------------------------------------------------------------

describe('US2: AI production improvements', () => {
  it('T010: AI queues production even when the city tile is occupied by a unit', () => {
    let state = makeRealAITurnState();

    // Confirm the AI scout is sitting on the city tile
    const aiScout = Object.values(state.units).find(u => u.owner === 'player2');
    expect(aiScout).toBeDefined();
    if (!aiScout) return;

    const aiCity = Object.values(state.settlements).find(
      s => s.owner === 'player2' && s.type === 'city',
    );
    expect(aiCity).toBeDefined();
    if (!aiCity) return;

    // Put the scout on the city tile to block it
    const cityTileId = aiCity.tileId;
    state = {
      ...state,
      units: { ...state.units, [aiScout.id]: { ...aiScout, tileId: cityTileId } },
      tiles: {
        ...state.tiles,
        [aiScout.tileId]: { ...state.tiles[aiScout.tileId], unitId: aiScout.tileId === cityTileId ? aiScout.id : null },
        [cityTileId]: { ...state.tiles[cityTileId], unitId: aiScout.id },
      },
    };

    const actions = computeTurn(state);
    const produceActions = actions.filter(a => a.type === 'produce');
    expect(produceActions.length).toBeGreaterThan(0);
  });

  it('T011: AI produces scouts when it has no scouts and limited map vision', () => {
    let state = makeRealAITurnState();

    // Remove all AI units (no scouts)
    const tiles = { ...state.tiles };
    for (const unit of Object.values(state.units)) {
      if (unit.owner === 'player2') {
        tiles[unit.tileId] = { ...tiles[unit.tileId], unitId: null };
      }
    }
    const nonAiUnits: Record<string, typeof state.units[string]> = {};
    for (const [id, unit] of Object.entries(state.units)) {
      if (unit.owner !== 'player2') nonAiUnits[id] = unit;
    }
    state = { ...state, units: nonAiUnits, tiles };

    // Give AI enough funds for any unit
    state = {
      ...state,
      players: { ...state.players, player2: { ...state.players.player2, funds: 500 } },
    };

    const actions = computeTurn(state);
    const produceActions = actions.filter(a => a.type === 'produce');
    expect(produceActions.length).toBeGreaterThan(0);

    // Should produce a scout since no scouts exist
    const firstProduce = produceActions[0] as { unitType: string };
    expect(firstProduce.unitType).toBe('scout');
  });

  it('T012: AI produces infantry when it already has scouts but needs settlement capture capability', () => {
    let state = makeRealAITurnState();

    // Give AI a scout with lots of vision (many tiles known)
    const aiScout = Object.values(state.units).find(u => u.owner === 'player2');
    expect(aiScout).toBeDefined();
    if (!aiScout) return;

    // Move the scout off the city
    const aiCity = Object.values(state.settlements).find(s => s.owner === 'player2' && s.type === 'city');
    if (!aiCity) return;
    const freeTile = Object.values(state.tiles).find(
      t => t.id !== aiCity.tileId && t.terrain !== 'water' && t.unitId === null,
    );
    if (!freeTile) return;

    const tiles = {
      ...state.tiles,
      [aiScout.tileId]: { ...state.tiles[aiScout.tileId], unitId: null },
      [freeTile.id]: { ...freeTile, unitId: aiScout.id },
    };
    state = {
      ...state,
      units: { ...state.units, [aiScout.id]: { ...aiScout, tileId: freeTile.id } },
      tiles,
      players: { ...state.players, player2: { ...state.players.player2, funds: 500 } },
    };

    const actions = computeTurn(state);
    const produceActions = actions.filter(a => a.type === 'produce');
    expect(produceActions.length).toBeGreaterThan(0);

    // With scouts already existing and enough funds, should prefer infantry
    const firstProduce = produceActions[0] as { unitType: string };
    expect(firstProduce.unitType).toBe('infantry');
  });
});

// ---------------------------------------------------------------------------
// US3: AI Aggression Mode
// ---------------------------------------------------------------------------

describe('US3: AI aggression mode', () => {
  it('T016: computeUtility applies higher enemy-unit weight when aggression mode is active', () => {
    const state = makeRealAITurnState();
    const aiUnit = Object.values(state.units).find(u => u.owner === 'player2');
    expect(aiUnit).toBeDefined();
    if (!aiUnit) return;

    // Create a dummy enemy-unit objective
    const enemyUnit = Object.values(state.units).find(u => u.owner === 'player1');
    if (!enemyUnit) return;
    const enemyTile = state.tiles[enemyUnit.tileId];
    const obj: Objective = {
      type: 'enemy-unit',
      tileCoord: enemyTile.coord,
      tileId: enemyTile.id,
      enemyUnitId: enemyUnit.id,
    };

    const normalScore = computeUtility(aiUnit, obj, state);
    const aggressiveScore = computeUtility(aiUnit, obj, state, true);

    // Aggressive mode should produce a higher score for enemy objectives
    expect(aggressiveScore).toBeGreaterThan(normalScore);
  });

  it('T017: AI with 3+ combat units generates actions that move toward player units', () => {
    let state = makeRealAITurnState();

    // Find a player unit to serve as attack target
    const playerUnit = Object.values(state.units).find(u => u.owner === 'player1');
    expect(playerUnit).toBeDefined();
    if (!playerUnit) return;

    // Add 3 AI infantry near the AI's starting position
    const aiScout = Object.values(state.units).find(u => u.owner === 'player2');
    if (!aiScout) return;
    const aiTile = state.tiles[aiScout.tileId];
    const tiles = { ...state.tiles };
    const units = { ...state.units };

    let placed = 0;
    for (const tile of Object.values(state.tiles)) {
      if (placed >= 3) break;
      if (tile.terrain === 'water' || tile.unitId !== null) continue;
      const dr = Math.abs(tile.coord.row - aiTile.coord.row);
      const dc = Math.abs(tile.coord.col - aiTile.coord.col);
      if (Math.max(dr, dc) > 3 || Math.max(dr, dc) === 0) continue;

      const id = `ai-infantry-${placed}`;
      units[id] = {
        id,
        type: 'infantry',
        owner: 'player2',
        tileId: tile.id,
        hp: UNIT_CONFIG.infantry.maxHp,
        movementPoints: UNIT_CONFIG.infantry.movementAllowance,
        hasAttacked: false,
      };
      tiles[tile.id] = { ...tile, unitId: id };
      placed++;
    }
    state = { ...state, units, tiles };

    // Verify we placed enough
    const combatUnits = Object.values(state.units).filter(
      u => u.owner === 'player2' && (u.type === 'infantry' || u.type === 'artillery'),
    );
    expect(combatUnits.length).toBeGreaterThanOrEqual(3);

    const actions = computeTurn(state);
    const moveActions = actions.filter(a => a.type === 'move');
    expect(moveActions.length).toBeGreaterThan(0);
  });

  it('T018: AI prioritizes attacking weakened (low HP) player units over full-health ones', () => {
    let state = makeRealAITurnState();

    const aiUnit = Object.values(state.units).find(u => u.owner === 'player2');
    if (!aiUnit) return;
    const aiTile = state.tiles[aiUnit.tileId];

    // Place two enemy units adjacent: one full HP, one low HP
    const adjacentTiles = Object.values(state.tiles).filter(
      t => t.terrain !== 'water' && t.unitId === null &&
        Math.abs(t.coord.row - aiTile.coord.row) <= 1 &&
        Math.abs(t.coord.col - aiTile.coord.col) <= 1 &&
        t.id !== aiTile.id,
    );
    if (adjacentTiles.length < 2) return;

    const tiles = { ...state.tiles };
    const units = { ...state.units };

    // Weak enemy (1 HP) - should be prioritized
    const weakId = 'enemy-weak';
    units[weakId] = {
      id: weakId,
      type: 'infantry',
      owner: 'player1',
      tileId: adjacentTiles[0].id,
      hp: 1,
      movementPoints: 0,
      hasAttacked: false,
    };
    tiles[adjacentTiles[0].id] = { ...adjacentTiles[0], unitId: weakId };

    // Strong enemy (full HP)
    const strongId = 'enemy-strong';
    units[strongId] = {
      id: strongId,
      type: 'infantry',
      owner: 'player1',
      tileId: adjacentTiles[1].id,
      hp: UNIT_CONFIG.infantry.maxHp,
      movementPoints: 0,
      hasAttacked: false,
    };
    tiles[adjacentTiles[1].id] = { ...adjacentTiles[1], unitId: strongId };

    state = { ...state, units, tiles };

    const actions = computeTurn(state);
    const attackActions = actions.filter(a => a.type === 'attack');
    expect(attackActions.length).toBeGreaterThan(0);

    // The first attack should target the weak unit (kill shot)
    const firstAttack = attackActions[0] as { targetUnitId: string };
    expect(firstAttack.targetUnitId).toBe(weakId);
  });
});

// ---------------------------------------------------------------------------
// Integration tests: search-based AI (T041-T042)
// ---------------------------------------------------------------------------

describe('Search-based AI integration', () => {
  it('T041: on a board where AI infantry is adjacent to a weak enemy scout (1 HP), the AI attacks it', () => {
    let state = makeRealAITurnState();

    const aiUnit = Object.values(state.units).find(u => u.owner === 'player2');
    if (!aiUnit) return;
    const aiTile = state.tiles[aiUnit.tileId];

    // Place a 1-HP player scout adjacent
    const adjacentTile = Object.values(state.tiles).find(
      t => t.terrain !== 'water' && t.terrain !== 'mountain' && t.unitId === null &&
        Math.abs(t.coord.row - aiTile.coord.row) <= 1 && Math.abs(t.coord.col - aiTile.coord.col) <= 1 &&
        t.id !== aiTile.id,
    );
    if (!adjacentTile) return;

    // Replace AI unit with infantry and add weak enemy
    const infId = 'ai-infantry-test';
    const enemyId = 'enemy-weak-test';
    state = {
      ...state,
      units: {
        ...state.units,
        [aiUnit.id]: { ...aiUnit, type: 'infantry', hp: UNIT_CONFIG.infantry.maxHp, movementPoints: UNIT_CONFIG.infantry.movementAllowance },
        [enemyId]: {
          id: enemyId,
          type: 'scout',
          owner: 'player1' as const,
          tileId: adjacentTile.id,
          hp: 1,
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [adjacentTile.id]: { ...adjacentTile, unitId: enemyId },
      },
    };

    const actions = computeTurn(state);
    const hasAttack = actions.some(a => a.type === 'attack');
    expect(hasAttack).toBe(true);
  });

  it('T042: on a board with idle AI cities and sufficient funds, computeTurn includes at least one produce action', () => {
    let state = makeRealAITurnState();

    // Move the AI scout off the city tile so production isn't blocked
    const aiScout = Object.values(state.units).find(u => u.owner === 'player2');
    if (!aiScout) return;
    const cityTileId = aiScout.tileId;
    const freeTile = Object.values(state.tiles).find(
      t => t.id !== cityTileId && t.terrain !== 'water' && t.terrain !== 'mountain' && t.unitId === null,
    );
    if (!freeTile) return;

    state = {
      ...state,
      units: { ...state.units, [aiScout.id]: { ...aiScout, tileId: freeTile.id } },
      tiles: {
        ...state.tiles,
        [cityTileId]: { ...state.tiles[cityTileId], unitId: null },
        [freeTile.id]: { ...freeTile, unitId: aiScout.id },
      },
      players: { ...state.players, player2: { ...state.players.player2, funds: 500 } },
    };

    const actions = computeTurn(state);
    const hasProduceAction = actions.some(a => a.type === 'produce');
    expect(hasProduceAction).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// US5: AI Upgrade Heuristic
// ---------------------------------------------------------------------------

describe('AI upgrade heuristic', () => {
  it('AI produces an upgrade action when funds >= AI_UPGRADE_THRESHOLD and a town is available', () => {
    let state = makeRealAITurnState();

    // Give AI enough funds for upgrade
    state = {
      ...state,
      players: { ...state.players, player2: { ...state.players.player2, funds: AI_UPGRADE_THRESHOLD + 100 } },
    };

    // Create an AI-owned town
    const freeTile = Object.values(state.tiles).find(
      t => t.terrain !== 'water' && t.terrain !== 'mountain' && t.unitId === null && t.settlementId === null,
    );
    expect(freeTile).toBeDefined();
    if (!freeTile) return;

    const townId = 'ai-test-town';
    state = {
      ...state,
      settlements: {
        ...state.settlements,
        [townId]: {
          id: townId,
          tileId: freeTile.id,
          type: 'town',
          owner: 'player2',
          productionQueue: null,
        },
      },
      tiles: {
        ...state.tiles,
        [freeTile.id]: { ...freeTile, settlementId: townId },
      },
    };

    const actions = computeTurn(state);
    const upgradeActions = actions.filter(a => a.type === 'upgrade');
    expect(upgradeActions.length).toBe(1);
  });

  it('AI does not produce an upgrade action when funds are below threshold', () => {
    let state = makeRealAITurnState();

    // Give AI insufficient funds
    state = {
      ...state,
      players: { ...state.players, player2: { ...state.players.player2, funds: AI_UPGRADE_THRESHOLD - 1 } },
    };

    // Create an AI-owned town
    const freeTile = Object.values(state.tiles).find(
      t => t.terrain !== 'water' && t.terrain !== 'mountain' && t.unitId === null && t.settlementId === null,
    );
    if (!freeTile) return;

    const townId = 'ai-test-town';
    state = {
      ...state,
      settlements: {
        ...state.settlements,
        [townId]: {
          id: townId,
          tileId: freeTile.id,
          type: 'town',
          owner: 'player2',
          productionQueue: null,
        },
      },
      tiles: {
        ...state.tiles,
        [freeTile.id]: { ...freeTile, settlementId: townId },
      },
    };

    const actions = computeTurn(state);
    const upgradeActions = actions.filter(a => a.type === 'upgrade');
    expect(upgradeActions.length).toBe(0);
  });

  it('AI does not produce an upgrade action when no towns are owned', () => {
    let state = makeRealAITurnState();

    // Give AI enough funds
    state = {
      ...state,
      players: { ...state.players, player2: { ...state.players.player2, funds: AI_UPGRADE_THRESHOLD + 100 } },
    };

    // Ensure no AI-owned towns exist (only cities)
    const settlements = { ...state.settlements };
    for (const [id, s] of Object.entries(settlements)) {
      if (s.owner === 'player2' && s.type === 'town') {
        settlements[id] = { ...s, type: 'city' };
      }
    }
    state = { ...state, settlements };

    const actions = computeTurn(state);
    const upgradeActions = actions.filter(a => a.type === 'upgrade');
    expect(upgradeActions.length).toBe(0);
  });
});
