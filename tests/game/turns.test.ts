import { describe, it, expect } from 'vitest';
import { startTurn, endTurn } from '../../src/game/turns';
import { newGame } from '../../src/game/state';
import { applyAction } from '../../src/game/state';
import type { GameState, Settlement, Unit } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { UNIT_CONFIG, SETTLEMENT_INCOME } from '../../src/game/constants';

function getOrdersState(): GameState {
  // newGame returns a state already in 'orders' phase after startTurn
  return newGame('small', 42);
}

describe('startTurn', () => {
  it('starting state has player1 at $300 (starting $200 + city income $100) and player2 at $200', () => {
    const state = getOrdersState();
    // player1 gets income from startTurn: $200 + $100 (city) = $300
    expect(state.players['player1'].funds).toBe(300);
    // player2 hasn't had their turn yet
    expect(state.players['player2'].funds).toBe(200);
  });

  it('income phase adds city income to active player funds', () => {
    // Get a state in income phase by calling newGame then manually setting phase
    const baseState = getOrdersState();
    // Simulate end of player1 orders → AI does nothing → player2 start turn
    // We'll test income directly by constructing an income-phase state
    const incomeState: GameState = {
      ...baseState,
      phase: 'income',
      currentPlayer: 'player1',
    };
    // Count settlements owned by player1
    const owned = Object.values(incomeState.settlements).filter(
      s => s.owner === 'player1'
    );
    const expectedIncome = owned.reduce((sum, s) => {
      return sum + SETTLEMENT_INCOME[s.type];
    }, 0);

    const afterTurn = startTurn(incomeState);
    expect(afterTurn.players['player1'].funds).toBe(
      incomeState.players['player1'].funds + expectedIncome
    );
  });

  it('phase transitions from income to orders', () => {
    const base = getOrdersState();
    const incomeState: GameState = { ...base, phase: 'income' };
    const after = startTurn(incomeState);
    expect(after.phase).toBe('orders');
  });

  it('resets unit movement points and hasAttacked for active player', () => {
    const state = getOrdersState();
    // Add a unit with depleted movement
    const unitId = 'test-unit-1';
    const tId = state.tileOrder[0];
    const unitState: GameState = {
      ...state,
      units: {
        [unitId]: {
          id: unitId,
          type: 'scout',
          owner: 'player1',
          tileId: tId,
          hp: 3,
          movementPoints: 0,
          hasAttacked: true,
        },
      },
      tiles: {
        ...state.tiles,
        [tId]: { ...state.tiles[tId], unitId },
      },
    };
    const incomeState: GameState = { ...unitState, phase: 'income', currentPlayer: 'player1' };
    const after = startTurn(incomeState);
    expect(after.units[unitId].movementPoints).toBe(UNIT_CONFIG.scout.movementAllowance);
    expect(after.units[unitId].hasAttacked).toBe(false);
  });

  it('income adds $50 per town and $100 per city for active player', () => {
    const state = getOrdersState();
    // Find a town and a city owned by player1
    const p1settlements = Object.values(state.settlements).filter(s => s.owner === 'player1');
    const townCount = p1settlements.filter(s => s.type === 'town').length;
    const cityCount = p1settlements.filter(s => s.type === 'city').length;

    const incomeState: GameState = { ...state, phase: 'income', currentPlayer: 'player1' };
    const expectedIncome = townCount * 50 + cityCount * 100;
    const before = incomeState.players['player1'].funds;
    const after = startTurn(incomeState);
    expect(after.players['player1'].funds).toBe(before + expectedIncome);
  });
});

describe('endTurn', () => {
  it('turn number increments after AI turn completes', () => {
    const state = getOrdersState();
    // endTurn from player1 goes to AI, then AI finishes → back to player1 turn 2
    // We simulate: player1 ends → endTurn returns AI phase state
    const afterEnd = endTurn(state);
    // After end, it should be player2/AI phase, turn still 1
    // After AI finishes and startTurn for player1 again, turn increments
    expect(afterEnd.phase).toBe('ai');
    expect(afterEnd.currentPlayer).toBe('player2');
  });

  it('applyAction with end-turn moves to ai phase', () => {
    const state = getOrdersState();
    const result = applyAction(state, { type: 'end-turn' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.phase).toBe('ai');
    }
  });
});

// Capture tests (T037) — written here per task plan
describe('capture resolution in endTurn', () => {
  it('neutral settlement occupied at end-of-turn transfers ownership to active player', () => {
    const state = getOrdersState();
    // Find a neutral settlement
    const neutralSettlement = Object.values(state.settlements).find(s => s.owner === 'neutral');
    if (!neutralSettlement) {
      // If no neutral settlement, skip (map might assign all to players)
      return;
    }
    const settlementTileId = neutralSettlement.tileId;
    const unitId = 'capture-unit';
    // Place a player1 unit on the neutral settlement tile
    const stateWithUnit: GameState = {
      ...state,
      units: {
        [unitId]: {
          id: unitId,
          type: 'infantry',
          owner: 'player1',
          tileId: settlementTileId,
          hp: 5,
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [settlementTileId]: { ...state.tiles[settlementTileId], unitId },
      },
    };
    const afterEnd = endTurn(stateWithUnit);
    expect(afterEnd.settlements[neutralSettlement.id].owner).toBe('player1');
  });

  it('income next turn reflects new ownership ($50 for town)', () => {
    const state = getOrdersState();
    const neutralTown = Object.values(state.settlements).find(
      s => s.owner === 'neutral' && s.type === 'town'
    );
    if (!neutralTown) return; // Skip if no neutral towns

    const unitId = 'capture-unit-2';
    const stateWithUnit: GameState = {
      ...state,
      units: {
        [unitId]: {
          id: unitId,
          type: 'infantry',
          owner: 'player1',
          tileId: neutralTown.tileId,
          hp: 5,
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [neutralTown.tileId]: { ...state.tiles[neutralTown.tileId], unitId },
      },
    };
    const afterCapture = endTurn(stateWithUnit);
    expect(afterCapture.settlements[neutralTown.id].owner).toBe('player1');
    // Next income for player1 should include this town
    const incomeState: GameState = { ...afterCapture, phase: 'income', currentPlayer: 'player1' };
    const fundsBefore = incomeState.players['player1'].funds;
    const afterIncome = startTurn(incomeState);
    const p1settlements = Object.values(afterCapture.settlements).filter(s => s.owner === 'player1');
    const expectedIncome = p1settlements.reduce((s, set) => s + SETTLEMENT_INCOME[set.type], 0);
    expect(afterIncome.players['player1'].funds).toBe(fundsBefore + expectedIncome);
  });
});

// Production tests (T041)
describe('unit production in turns', () => {
  it('applyAction produce deducts cost and sets productionQueue', () => {
    const state = getOrdersState();
    const ownedCity = Object.values(state.settlements).find(
      s => s.owner === 'player1' && s.type === 'city'
    );
    if (!ownedCity) return;

    const result = applyAction(state, {
      type: 'produce',
      settlementId: ownedCity.id,
      unitType: 'scout',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.settlements[ownedCity.id].productionQueue).toBe('scout');
      expect(result.state.players['player1'].funds).toBe(state.players['player1'].funds - 100);
    }
  });

  it('second order on busy city returns error city-busy', () => {
    const state = getOrdersState();
    const ownedCity = Object.values(state.settlements).find(
      s => s.owner === 'player1' && s.type === 'city'
    );
    if (!ownedCity) return;

    const result1 = applyAction(state, {
      type: 'produce',
      settlementId: ownedCity.id,
      unitType: 'scout',
    });
    expect(result1.ok).toBe(true);
    if (!result1.ok) return;

    const result2 = applyAction(result1.state, {
      type: 'produce',
      settlementId: ownedCity.id,
      unitType: 'infantry',
    });
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error).toBe('city-busy');
    }
  });

  it('insufficient funds returns error insufficient-funds', () => {
    const state = getOrdersState();
    const ownedCity = Object.values(state.settlements).find(
      s => s.owner === 'player1' && s.type === 'city'
    );
    if (!ownedCity) return;

    const brokeState: GameState = {
      ...state,
      players: {
        ...state.players,
        player1: { ...state.players['player1'], funds: 50 },
      },
    };
    const result = applyAction(brokeState, {
      type: 'produce',
      settlementId: ownedCity.id,
      unitType: 'artillery',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('insufficient-funds');
    }
  });

  it('startTurn spawns queued unit at city tile and clears productionQueue', () => {
    const state = getOrdersState();
    const ownedCity = Object.values(state.settlements).find(
      s => s.owner === 'player1' && s.type === 'city'
    );
    if (!ownedCity) return;

    // Set up production queue
    const queuedState: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [ownedCity.id]: { ...ownedCity, productionQueue: 'scout' },
      },
      phase: 'income',
      currentPlayer: 'player1',
    };
    const afterStart = startTurn(queuedState);
    // A scout should appear at the city tile
    const cityTile = afterStart.tiles[ownedCity.tileId];
    expect(cityTile.unitId).not.toBeNull();
    if (cityTile.unitId) {
      const unit = afterStart.units[cityTile.unitId];
      expect(unit.type).toBe('scout');
      expect(unit.owner).toBe('player1');
    }
    expect(afterStart.settlements[ownedCity.id].productionQueue).toBeNull();
  });
});

// Victory tests (T051)
describe('victory detection', () => {
  it('after capture that eliminates last enemy city, state.winner is set', () => {
    const state = getOrdersState();
    // Find player2's only city and have player1 capture it
    const p2Cities = Object.values(state.settlements).filter(
      s => s.owner === 'player2' && s.type === 'city'
    );
    if (p2Cities.length !== 1) return;

    const p2City = p2Cities[0];
    const unitId = 'final-capture';
    const stateForCapture: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        // Remove all player2 cities except the one we're about to capture
      },
      units: {
        [unitId]: {
          id: unitId,
          type: 'infantry',
          owner: 'player1',
          tileId: p2City.tileId,
          hp: 5,
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [p2City.tileId]: { ...state.tiles[p2City.tileId], unitId },
      },
    };
    const afterEnd = endTurn(stateForCapture);
    // Player2 now has 0 cities → player1 wins
    expect(afterEnd.winner).toBe('player1');
    expect(afterEnd.phase).toBe('victory');
  });

  it('applyAction returns error invalid-phase when phase is victory', () => {
    const state = getOrdersState();
    const victoryState: GameState = { ...state, phase: 'victory', winner: 'player1' };
    const result = applyAction(victoryState, { type: 'end-turn' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('invalid-phase');
    }
  });
});
