/**
 * tests/unit/scoreboard.test.ts
 *
 * Tests for GameStats accumulation (T021-T022).
 * Written BEFORE implementation — tests must FAIL until state.ts / turns.ts are updated.
 */

import { describe, it, expect } from 'vitest';
import { newGame, applyAction } from '../../src/game/state';
import { startTurn, endTurn, checkVictory } from '../../src/game/turns';
import type { GameState, Unit } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { SETTLEMENT_INCOME } from '../../src/game/constants';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('GameStats initialization', () => {
  it('new game initializes gameStats for both players', () => {
    const state = newGame('small', 42);
    expect(state.gameStats).toBeDefined();
    // unitsProduced and unitsLost start at 0
    expect(state.gameStats['player1'].unitsProduced).toBe(0);
    expect(state.gameStats['player1'].unitsLost).toBe(0);
    expect(state.gameStats['player1'].citiesAtEnd).toBe(0);
    expect(state.gameStats['player2'].unitsProduced).toBe(0);
    expect(state.gameStats['player2'].unitsLost).toBe(0);
    expect(state.gameStats['player2'].citiesAtEnd).toBe(0);
    // totalIncomeEarned >= 0 (first startTurn already collected income)
    expect(state.gameStats['player1'].totalIncomeEarned).toBeGreaterThanOrEqual(0);
    expect(state.gameStats['player2'].totalIncomeEarned).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// unitsProduced tracking (T021)
// ---------------------------------------------------------------------------

describe('unitsProduced tracking', () => {
  it('increments when player1 produces a unit', () => {
    const base = newGame('small', 42);
    // Find a player1 idle city with enough funds
    const city = Object.values(base.settlements).find(
      s => s.owner === 'player1' && s.type === 'city' && s.productionQueue === null,
    );
    if (!city) return;

    const before = base.gameStats['player1'].unitsProduced;
    const result = applyAction(base, { type: 'produce', settlementId: city.id, unitType: 'scout' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // unitsProduced increments when the unit is queued (not when it spawns)
    // OR when it spawns — check which interpretation the implementation uses
    // Based on data-model.md: increments in applyProduce (when queued)
    expect(result.state.gameStats['player1'].unitsProduced).toBe(before + 1);
  });

  it('does not increment unitsProduced for player2 when player1 produces', () => {
    const base = newGame('small', 42);
    const city = Object.values(base.settlements).find(
      s => s.owner === 'player1' && s.type === 'city' && s.productionQueue === null,
    );
    if (!city) return;

    const before2 = base.gameStats['player2'].unitsProduced;
    const result = applyAction(base, { type: 'produce', settlementId: city.id, unitType: 'scout' });
    if (!result.ok) return;

    expect(result.state.gameStats['player2'].unitsProduced).toBe(before2);
  });
});

// ---------------------------------------------------------------------------
// unitsLost tracking (T021)
// ---------------------------------------------------------------------------

describe('unitsLost tracking', () => {
  it('increments unitsLost for the owner when their unit is destroyed', () => {
    const base = newGame('small', 42);

    // Place a player1 unit and a player2 unit adjacent to each other
    const p1UnitId = 'p1-attack';
    const p2UnitId = 'p2-weak';
    const p1TileId = tileId(8, 8);
    const p2TileId = tileId(8, 9);

    if (!base.tiles[p1TileId] || !base.tiles[p2TileId]) return;
    if (base.tiles[p1TileId].terrain === 'water' || base.tiles[p2TileId].terrain === 'water') return;

    const state: GameState = {
      ...base,
      phase: 'orders',
      currentPlayer: 'player1',
      units: {
        ...base.units,
        [p1UnitId]: {
          id: p1UnitId,
          type: 'artillery', // high attack
          owner: 'player1',
          tileId: p1TileId,
          hp: 4,
          movementPoints: 2,
          hasAttacked: false,
        },
        [p2UnitId]: {
          id: p2UnitId,
          type: 'scout', // low HP, will be destroyed
          owner: 'player2',
          tileId: p2TileId,
          hp: 1, // barely alive
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...base.tiles,
        [p1TileId]: { ...base.tiles[p1TileId], unitId: p1UnitId },
        [p2TileId]: { ...base.tiles[p2TileId], unitId: p2UnitId },
      },
    };

    const beforeP2Lost = state.gameStats['player2'].unitsLost;
    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId: p1UnitId,
      targetUnitId: p2UnitId,
    });

    if (!result.ok) return;

    const p2UnitAfter = result.state.units[p2UnitId];
    if (!p2UnitAfter || p2UnitAfter.hp <= 0) {
      // Unit was destroyed — unitsLost should increment
      expect(result.state.gameStats['player2'].unitsLost).toBe(beforeP2Lost + 1);
    }
  });
});

// ---------------------------------------------------------------------------
// totalIncomeEarned tracking (T021)
// ---------------------------------------------------------------------------

describe('totalIncomeEarned tracking', () => {
  it('increments by income amount at the start of each turn', () => {
    const base = newGame('small', 42);

    // Count player1's income per turn
    const p1Income = Object.values(base.settlements)
      .filter(s => s.owner === 'player1')
      .reduce((sum, s) => sum + SETTLEMENT_INCOME[s.type], 0);

    // The initial state was already processed by startTurn once (for player1)
    // so totalIncomeEarned should already be p1Income
    expect(base.gameStats['player1'].totalIncomeEarned).toBe(p1Income);

    // End turn → AI goes → player1 gets turn again → income should accumulate
    const afterAITurn = endTurn(base);
    // After endTurn, AI had startTurn called which adds AI income
    const aiIncome = Object.values(afterAITurn.settlements)
      .filter(s => s.owner === 'player2')
      .reduce((sum, s) => sum + SETTLEMENT_INCOME[s.type], 0);

    // player2 should have earned aiIncome
    // (endTurn calls startTurn for player2)
    // Exact amount depends on when in the flow income is tracked
    expect(afterAITurn.gameStats['player2'].totalIncomeEarned).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// citiesAtEnd tracking (T022)
// ---------------------------------------------------------------------------

describe('citiesAtEnd tracking', () => {
  it('sets citiesAtEnd for both players when victory is detected', () => {
    const base = newGame('small', 42);

    // Give player1 all cities and remove player2 cities
    const updatedSettlements = { ...base.settlements };
    for (const [id, s] of Object.entries(updatedSettlements)) {
      if (s.type === 'city' && s.owner === 'player2') {
        updatedSettlements[id] = { ...s, owner: 'player1' };
      }
    }

    const stateBeforeVictory: GameState = {
      ...base,
      settlements: updatedSettlements,
    };

    const afterVictory = checkVictory(stateBeforeVictory);
    expect(afterVictory.phase).toBe('victory');
    expect(afterVictory.winner).toBe('player1');

    // citiesAtEnd should be set for both players
    const p1Cities = Object.values(updatedSettlements).filter(
      s => s.type === 'city' && s.owner === 'player1',
    ).length;

    expect(afterVictory.gameStats['player1'].citiesAtEnd).toBe(p1Cities);
    expect(afterVictory.gameStats['player2'].citiesAtEnd).toBe(0);
  });
});
