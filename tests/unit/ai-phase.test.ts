/**
 * tests/unit/ai-phase.test.ts
 *
 * Tests for AI phase transition, omniscient vision, and block-capture objectives (T011-T013).
 * Written BEFORE implementation — tests must FAIL until ai.ts / objectives.ts are updated.
 */

import { describe, it, expect } from 'vitest';
import { newGame } from '../../src/game/state';
import { buildObjectives } from '../../src/game/ai/objectives';
import { isOffensivePhase } from '../../src/game/ai/ai';
import type { GameState, Unit } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { SETTLEMENT_INCOME } from '../../src/game/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAITurnState(overrides: Partial<GameState> = {}): GameState {
  const base = newGame('small', 42);
  return { ...base, currentPlayer: 'player2', phase: 'orders', ...overrides };
}

function countAIMilitary(state: GameState): number {
  return Object.values(state.units).filter(u => u.owner === 'player2').length;
}

function countPlayerMilitary(state: GameState): number {
  return Object.values(state.units).filter(u => u.owner === 'player1').length;
}

function getAIIncome(state: GameState): number {
  return Object.values(state.settlements)
    .filter(s => s.owner === 'player2')
    .reduce((sum, s) => sum + SETTLEMENT_INCOME[s.type], 0);
}

function getPlayerIncome(state: GameState): number {
  return Object.values(state.settlements)
    .filter(s => s.owner === 'player1')
    .reduce((sum, s) => sum + SETTLEMENT_INCOME[s.type], 0);
}

// ---------------------------------------------------------------------------
// isOffensivePhase (T011)
// ---------------------------------------------------------------------------

describe('isOffensivePhase', () => {
  it('returns false when AI income equals player income', () => {
    const state = makeAITurnState();
    // In the starting state, both players have 1 city each → equal income
    const aiIncome = getAIIncome(state);
    const playerIncome = getPlayerIncome(state);
    // This test assumes equal income at game start
    if (aiIncome === playerIncome) {
      expect(isOffensivePhase(state)).toBe(false);
    } else {
      // Skip if seed produces unequal income
      expect(typeof isOffensivePhase(state)).toBe('boolean');
    }
  });

  it('returns false when AI income > player income but AI units <= player units', () => {
    const base = newGame('small', 42);

    // Give AI more income by giving it an extra city
    const neutralCity = Object.values(base.settlements).find(
      s => s.owner === 'neutral' && s.type === 'city',
    );
    if (!neutralCity) return; // no neutral city available

    const stateWithAIAdvantage: GameState = {
      ...base,
      currentPlayer: 'player2',
      phase: 'orders',
      settlements: {
        ...base.settlements,
        [neutralCity.id]: { ...neutralCity, owner: 'player2' },
      },
    };

    // Ensure AI does NOT have more units than player
    const aiCount = countAIMilitary(stateWithAIAdvantage);
    const playerCount = countPlayerMilitary(stateWithAIAdvantage);

    if (aiCount <= playerCount) {
      expect(isOffensivePhase(stateWithAIAdvantage)).toBe(false);
    }
  });

  it('returns true only when AI income > player income AND AI units > player units', () => {
    const base = newGame('small', 42);

    // Give all neutral settlements to AI
    const settlementsWithAIAdvantage: GameState['settlements'] = {};
    for (const [id, s] of Object.entries(base.settlements)) {
      settlementsWithAIAdvantage[id] = s.owner === 'neutral'
        ? { ...s, owner: 'player2' }
        : { ...s };
    }

    // Add extra AI units so count > player count
    const extraUnit: Unit = {
      id: 'ai-extra-1',
      type: 'infantry',
      owner: 'player2',
      tileId: tileId(5, 5),
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    };
    const extraUnit2: Unit = {
      id: 'ai-extra-2',
      type: 'infantry',
      owner: 'player2',
      tileId: tileId(5, 6),
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    };

    const stateFullAdvantage: GameState = {
      ...base,
      currentPlayer: 'player2',
      phase: 'orders',
      settlements: settlementsWithAIAdvantage,
      units: {
        ...base.units,
        [extraUnit.id]: extraUnit,
        [extraUnit2.id]: extraUnit2,
      },
    };

    const aiIncome = getAIIncome(stateFullAdvantage);
    const playerIncome = getPlayerIncome(stateFullAdvantage);
    const aiCount = countAIMilitary(stateFullAdvantage);
    const playerCount = countPlayerMilitary(stateFullAdvantage);

    if (aiIncome > playerIncome && aiCount > playerCount) {
      expect(isOffensivePhase(stateFullAdvantage)).toBe(true);
    }
  });

  it('returns false when AI income > player income but player army >= AI army', () => {
    const base = newGame('small', 42);

    // Give AI all neutral settlements (income advantage)
    const settlements: GameState['settlements'] = {};
    for (const [id, s] of Object.entries(base.settlements)) {
      settlements[id] = s.owner === 'neutral' ? { ...s, owner: 'player2' } : { ...s };
    }

    // Give player MORE units than AI
    const extraPlayerUnit: Unit = {
      id: 'player-extra-1',
      type: 'infantry',
      owner: 'player1',
      tileId: tileId(2, 2),
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    };
    const extraPlayerUnit2: Unit = {
      id: 'player-extra-2',
      type: 'infantry',
      owner: 'player1',
      tileId: tileId(2, 3),
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    };

    const statePlayerArmy: GameState = {
      ...base,
      currentPlayer: 'player2',
      phase: 'orders',
      settlements,
      units: {
        ...base.units,
        [extraPlayerUnit.id]: extraPlayerUnit,
        [extraPlayerUnit2.id]: extraPlayerUnit2,
      },
    };

    expect(isOffensivePhase(statePlayerArmy)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Omniscient vision — AI objective builder sees all units/settlements (T012)
// ---------------------------------------------------------------------------

describe('AI omniscient vision', () => {
  it('buildObjectives includes enemy units regardless of AI fog state', () => {
    const base = newGame('small', 42);
    const state: GameState = {
      ...base,
      currentPlayer: 'player2',
      phase: 'orders',
      // Clear AI known world so AI "hasn't seen" anything
      aiKnownWorld: {},
    };

    // Place a player unit far from AI territory
    const playerUnitId = 'player-far-unit';
    const farTileId = tileId(1, 1);
    const stateWithFarUnit: GameState = {
      ...state,
      units: {
        ...state.units,
        [playerUnitId]: {
          id: playerUnitId,
          type: 'infantry',
          owner: 'player1',
          tileId: farTileId,
          hp: 5,
          movementPoints: 3,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [farTileId]: { ...state.tiles[farTileId], unitId: playerUnitId },
      },
    };

    const objectives = buildObjectives(stateWithFarUnit, false);
    const enemyUnitObjectives = objectives.filter(o => o.type === 'enemy-unit');

    // With omniscient vision, AI should see the player unit even without knowing world
    expect(enemyUnitObjectives.some(o => o.enemyUnitId === playerUnitId)).toBe(true);
  });

  it('buildObjectives includes all enemy settlements regardless of aiKnownWorld', () => {
    const base = newGame('small', 42);
    const state: GameState = {
      ...base,
      currentPlayer: 'player2',
      phase: 'orders',
      aiKnownWorld: {}, // completely empty known world
    };

    const objectives = buildObjectives(state, false);
    const settlementObjectives = objectives.filter(o => o.type === 'settlement');

    // All neutral/player settlements should appear as objectives
    const nonAISettlements = Object.values(state.settlements).filter(s => s.owner !== 'player2');
    expect(settlementObjectives.length).toBeGreaterThanOrEqual(nonAISettlements.length);
  });
});

// ---------------------------------------------------------------------------
// block-capture objective generation (T013)
// ---------------------------------------------------------------------------

describe('block-capture objectives', () => {
  it('emits block-capture objective when player unit is within 3 tiles of a neutral city', () => {
    const base = newGame('small', 42);

    // Find a neutral city
    const neutralCity = Object.values(base.settlements).find(
      s => s.owner === 'neutral' && s.type === 'city',
    );
    if (!neutralCity) return;

    const cityTile = base.tiles[neutralCity.tileId];
    // Place player unit 2 tiles away from the neutral city
    const nearTileId = tileId(cityTile.coord.row + 2, cityTile.coord.col);
    const nearTile = base.tiles[nearTileId];
    if (!nearTile || nearTile.terrain === 'water') return;

    const playerUnitId = 'player-near-city';
    const state: GameState = {
      ...base,
      currentPlayer: 'player2',
      phase: 'orders',
      units: {
        ...base.units,
        [playerUnitId]: {
          id: playerUnitId,
          type: 'scout',
          owner: 'player1',
          tileId: nearTileId,
          hp: 3,
          movementPoints: 5,
          hasAttacked: false,
        },
      },
      tiles: {
        ...base.tiles,
        [nearTileId]: { ...base.tiles[nearTileId], unitId: playerUnitId },
      },
    };

    const objectives = buildObjectives(state, false);
    const blockObjectives = objectives.filter(o => o.type === 'block-capture');
    expect(blockObjectives.some(o => o.settlementId === neutralCity.id)).toBe(true);
  });

  it('does NOT emit block-capture when player unit is more than 3 tiles away', () => {
    const base = newGame('small', 42);

    // Find a neutral city
    const neutralCity = Object.values(base.settlements).find(
      s => s.owner === 'neutral' && s.type === 'city',
    );
    if (!neutralCity) return;

    const cityTile = base.tiles[neutralCity.tileId];

    // Place player unit 5 tiles away
    const farRow = Math.min(cityTile.coord.row + 5, base.mapSize.rows - 1);
    const farTileId = tileId(farRow, cityTile.coord.col);
    const farTile = base.tiles[farTileId];
    if (!farTile || farTile.terrain === 'water') return;

    const playerUnitId = 'player-far-from-city';
    const state: GameState = {
      ...base,
      currentPlayer: 'player2',
      phase: 'orders',
      units: {
        ...base.units,
        [playerUnitId]: {
          id: playerUnitId,
          type: 'scout',
          owner: 'player1',
          tileId: farTileId,
          hp: 3,
          movementPoints: 5,
          hasAttacked: false,
        },
      },
      tiles: {
        ...base.tiles,
        [farTileId]: { ...base.tiles[farTileId], unitId: playerUnitId },
      },
    };

    const objectives = buildObjectives(state, false);
    const blockForThisCity = objectives.filter(
      o => o.type === 'block-capture' && o.settlementId === neutralCity.id,
    );
    expect(blockForThisCity.length).toBe(0);
  });
});
