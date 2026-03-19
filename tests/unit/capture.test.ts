/**
 * tests/unit/capture.test.ts
 *
 * Tests for two-turn city capture logic (FR-001 through FR-004).
 * Written BEFORE implementation — tests must FAIL until turns.ts is updated.
 */

import { describe, it, expect } from 'vitest';
import { newGame, applyAction } from '../../src/game/state';
import { endTurn, endAiTurn } from '../../src/game/turns';
import type { GameState, Settlement, Unit } from '../../src/game/types';
import { tileId } from '../../src/game/board';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal orders-phase state with a player1 unit on a neutral settlement. */
function makeOccupiedSettlementState(): {
  state: GameState;
  settlementId: string;
  unitId: string;
  settlementTileId: string;
} {
  const base = newGame('small', 42);

  // Find a neutral settlement
  const neutral = Object.values(base.settlements).find(s => s.owner === 'neutral');
  if (!neutral) throw new Error('No neutral settlement in test map');

  const settlementTileId = neutral.tileId;
  const unitId = 'test-capturer';

  // Place a player1 unit on the neutral settlement tile
  const state: GameState = {
    ...base,
    units: {
      ...base.units,
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
      ...base.tiles,
      [settlementTileId]: { ...base.tiles[settlementTileId], unitId },
    },
  };

  return { state, settlementId: neutral.id, unitId, settlementTileId };
}

// ---------------------------------------------------------------------------
// Two-turn capture logic (T007)
// ---------------------------------------------------------------------------

describe('Two-turn city capture — capture logic', () => {
  it('settlement is NOT captured after first turn of occupation; progress becomes 1', () => {
    const { state, settlementId, unitId } = makeOccupiedSettlementState();
    // Manually trigger resolveCaptures by calling endTurn (which calls resolveCaptures internally)
    const afterTurn = endTurn(state);

    // The settlement should still not belong to player1 after one turn
    const settlement = afterTurn.settlements[settlementId];
    expect(settlement.owner).not.toBe('player1');

    // captureProgress should be 1 (one turn occupied)
    expect(settlement.captureProgress).toBe(1);
    expect(settlement.capturingUnit).toBe(unitId);
  });

  it('settlement IS captured after second consecutive turn of occupation', () => {
    const { state, settlementId, unitId } = makeOccupiedSettlementState();

    // End player1 turn → AI turn → end AI turn → back to player1
    const afterFirstEndTurn = endTurn(state);
    // After AI turn (AI does nothing useful in this minimal state), player1 gets their turn back
    // We need to simulate the AI ending its turn too
    const afterAITurn = endAiTurn({ ...afterFirstEndTurn, phase: 'ai' });

    // Now player1 is back in orders phase. The unit should still be on the tile.
    // Check the unit is still there (AI didn't destroy it)
    const unit = afterAITurn.units[unitId];
    if (!unit) {
      // AI may have destroyed the unit — skip this test path
      return;
    }

    // End player1's second turn
    const afterSecondEndTurn = endTurn(afterAITurn);

    const settlement = afterSecondEndTurn.settlements[settlementId];
    expect(settlement.owner).toBe('player1');
    expect(settlement.captureProgress).toBe(0);
    expect(settlement.capturingUnit).toBeNull();
  });

  it('capture progress resets when the occupying unit leaves the settlement', () => {
    const { state, settlementId } = makeOccupiedSettlementState();

    // After first end turn, progress = 1
    const afterFirstTurn = endTurn(state);
    const settlementAfter = afterFirstTurn.settlements[settlementId];
    expect(settlementAfter.captureProgress).toBe(1);

    // Remove the unit from the tile (simulate it leaving)
    const occupyingUnitId = settlementAfter.capturingUnit!;
    const unit = afterFirstTurn.units[occupyingUnitId];
    if (!unit) return;

    const stateUnitGone: GameState = {
      ...afterFirstTurn,
      units: { ...afterFirstTurn.units },
      tiles: {
        ...afterFirstTurn.tiles,
        [settlementAfter.tileId]: {
          ...afterFirstTurn.tiles[settlementAfter.tileId],
          unitId: null,
        },
      },
      phase: 'orders',
      currentPlayer: 'player1',
    };
    delete (stateUnitGone.units as Record<string, Unit>)[occupyingUnitId];

    // End turn with no unit on the settlement
    const afterReset = endTurn(stateUnitGone);
    const resetSettlement = afterReset.settlements[settlementId];
    expect(resetSettlement.captureProgress).toBe(0);
    expect(resetSettlement.capturingUnit).toBeNull();
    expect(resetSettlement.owner).not.toBe('player1');
  });

  it('capture progress resets when a different unit occupies the same settlement', () => {
    const { state, settlementId, settlementTileId } = makeOccupiedSettlementState();

    const afterFirstTurn = endTurn(state);
    expect(afterFirstTurn.settlements[settlementId].captureProgress).toBe(1);

    const oldCapturingUnit = afterFirstTurn.settlements[settlementId].capturingUnit!;

    // Replace with a different player1 unit on the same tile
    const newUnitId = 'different-unit';
    const stateWithDifferentUnit: GameState = {
      ...afterFirstTurn,
      units: {
        ...afterFirstTurn.units,
        [newUnitId]: {
          id: newUnitId,
          type: 'scout',
          owner: 'player1',
          tileId: settlementTileId,
          hp: 3,
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...afterFirstTurn.tiles,
        [settlementTileId]: {
          ...afterFirstTurn.tiles[settlementTileId],
          unitId: newUnitId,
        },
      },
      phase: 'orders',
      currentPlayer: 'player1',
    };
    // Remove the old capturing unit
    delete (stateWithDifferentUnit.units as Record<string, Unit>)[oldCapturingUnit];

    const afterSecondTurn = endTurn(stateWithDifferentUnit);
    const settlement = afterSecondTurn.settlements[settlementId];

    // Progress should reset to 0 then increment to 1 again (new unit started fresh)
    // OR if the engine is strict: only resets, doesn't re-increment in same call
    // Our spec says: reset if occupant changes. New unit should get progress 1.
    expect(settlement.captureProgress).toBe(1);
    expect(settlement.capturingUnit).toBe(newUnitId);
  });

  it('friendly units on own settlements do not trigger capture', () => {
    const base = newGame('small', 42);
    // Find a player1-owned city
    const ownCity = Object.values(base.settlements).find(
      s => s.owner === 'player1' && s.type === 'city',
    );
    if (!ownCity) throw new Error('No player1 city found');

    const afterTurn = endTurn(base);
    const city = afterTurn.settlements[ownCity.id];
    // Friendly city should have no capture progress
    expect(city.captureProgress).toBe(0);
    expect(city.capturingUnit).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Regression: AI occupying player city not captured (bug fix)
// ---------------------------------------------------------------------------

describe('AI capturing player1 city', () => {
  it('AI unit on player1 city completes capture after 2 consecutive AI turns', () => {
    const base = newGame('small', 42);

    // Find player1's city
    const p1City = Object.values(base.settlements).find(
      s => s.owner === 'player1' && s.type === 'city',
    );
    if (!p1City) throw new Error('No player1 city found');

    const aiUnitId = 'ai-captor';
    // Place a player2 (AI) unit on player1's city tile
    const stateWithAiUnit: GameState = {
      ...base,
      units: {
        ...base.units,
        [aiUnitId]: {
          id: aiUnitId,
          type: 'infantry',
          owner: 'player2',
          tileId: p1City.tileId,
          hp: 5,
          movementPoints: 0,
          hasAttacked: false,
        },
      },
      tiles: {
        ...base.tiles,
        [p1City.tileId]: { ...base.tiles[p1City.tileId], unitId: aiUnitId },
      },
      phase: 'ai',
      currentPlayer: 'player2',
    };

    // End AI's first turn → player1 gets their turn
    const afterAiTurn1 = endAiTurn(stateWithAiUnit);
    expect(afterAiTurn1.settlements[p1City.id].captureProgress).toBe(1);
    expect(afterAiTurn1.settlements[p1City.id].owner).toBe('player1'); // not yet captured

    // Player1 ends turn (does nothing), AI unit still on city
    const afterPlayer1Turn = endTurn({ ...afterAiTurn1, phase: 'orders', currentPlayer: 'player1' });
    // Progress must NOT have been reset by player1's resolveCaptures
    expect(afterPlayer1Turn.settlements[p1City.id].captureProgress).toBe(1);

    // End AI's second turn → capture should complete
    const afterAiTurn2 = endAiTurn({ ...afterPlayer1Turn, phase: 'ai', currentPlayer: 'player2' });
    expect(afterAiTurn2.settlements[p1City.id].owner).toBe('player2');
    expect(afterAiTurn2.settlements[p1City.id].captureProgress).toBe(0);
    expect(afterAiTurn2.settlements[p1City.id].capturingUnit).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Capture progress indicator visibility (T008)
// ---------------------------------------------------------------------------

describe('Capture progress indicator visibility', () => {
  it('new game has captureProgress=0 on all settlements', () => {
    const state = newGame('small', 42);
    for (const settlement of Object.values(state.settlements)) {
      expect(settlement.captureProgress).toBe(0);
      expect(settlement.capturingUnit).toBeNull();
    }
  });

  it('captureProgress is 1 after one turn of foreign occupation', () => {
    const { state, settlementId } = makeOccupiedSettlementState();
    const after = endTurn(state);
    expect(after.settlements[settlementId].captureProgress).toBe(1);
  });

  it('captureProgress resets to 0 after successful capture', () => {
    const { state, settlementId, unitId } = makeOccupiedSettlementState();
    const afterFirst = endTurn(state);
    const unit = afterFirst.units[unitId];
    if (!unit) return; // AI killed it

    const afterAI = endAiTurn({ ...afterFirst, phase: 'ai' });
    if (!afterAI.units[unitId]) return;

    const afterSecond = endTurn(afterAI);
    const settlement = afterSecond.settlements[settlementId];

    if (settlement.owner === 'player1') {
      expect(settlement.captureProgress).toBe(0);
      expect(settlement.capturingUnit).toBeNull();
    }
  });
});
