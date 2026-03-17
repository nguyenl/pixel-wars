import { describe, it, expect } from 'vitest';
import { newGame, applyAction } from '../../src/game/state';
import type { GameState, UpgradeAction } from '../../src/game/types';
import { UPGRADE_COST } from '../../src/game/constants';

function makeStateWithTown(): { state: GameState; townId: string } {
  let state = newGame('small', 42);
  // Give player enough funds
  state = {
    ...state,
    players: {
      ...state.players,
      player1: { ...state.players.player1, funds: 1000 },
    },
  };

  // Find or create a player-owned town
  const existingTown = Object.values(state.settlements).find(
    s => s.owner === 'player1' && s.type === 'town',
  );

  if (existingTown) {
    return { state, townId: existingTown.id };
  }

  // Capture a neutral town by setting ownership
  const neutralTown = Object.values(state.settlements).find(s => s.owner === 'neutral' && s.type === 'town');
  if (neutralTown) {
    state = {
      ...state,
      settlements: {
        ...state.settlements,
        [neutralTown.id]: { ...neutralTown, owner: 'player1' },
      },
    };
    return { state, townId: neutralTown.id };
  }

  // Create a town on a free tile
  const freeTile = Object.values(state.tiles).find(
    t => t.terrain !== 'water' && t.terrain !== 'mountain' && t.settlementId === null && t.unitId === null,
  );
  const townId = 'test-town';
  state = {
    ...state,
    settlements: {
      ...state.settlements,
      [townId]: {
        id: townId,
        tileId: freeTile!.id,
        type: 'town',
        owner: 'player1',
        productionQueue: null,
      },
    },
    tiles: {
      ...state.tiles,
      [freeTile!.id]: { ...freeTile!, settlementId: townId },
    },
  };
  return { state, townId };
}

describe('Upgrade action validation', () => {
  it('rejects upgrade when insufficient funds', () => {
    const { state, townId } = makeStateWithTown();
    const poorState: GameState = {
      ...state,
      players: {
        ...state.players,
        player1: { ...state.players.player1, funds: 499 },
      },
    };
    const action: UpgradeAction = { type: 'upgrade', settlementId: townId };
    const result = applyAction(poorState, action);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('insufficient-funds');
    }
  });

  it('rejects upgrade when not owner', () => {
    const { state, townId } = makeStateWithTown();
    // Change town owner to player2
    const enemyState: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [townId]: { ...state.settlements[townId], owner: 'player2' },
      },
    };
    const action: UpgradeAction = { type: 'upgrade', settlementId: townId };
    const result = applyAction(enemyState, action);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('not-owner');
    }
  });

  it('rejects upgrade when settlement is already a city', () => {
    const { state } = makeStateWithTown();
    const city = Object.values(state.settlements).find(
      s => s.owner === 'player1' && s.type === 'city',
    );
    expect(city).toBeDefined();
    if (!city) return;

    const action: UpgradeAction = { type: 'upgrade', settlementId: city.id };
    const result = applyAction(state, action);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('settlement-not-town');
    }
  });

  it('rejects upgrade during wrong phase', () => {
    const { state, townId } = makeStateWithTown();
    const wrongPhaseState: GameState = { ...state, phase: 'income' };
    const action: UpgradeAction = { type: 'upgrade', settlementId: townId };
    const result = applyAction(wrongPhaseState, action);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('invalid-phase');
    }
  });
});

describe('Upgrade action application', () => {
  it('changes settlement type from town to city', () => {
    const { state, townId } = makeStateWithTown();
    const action: UpgradeAction = { type: 'upgrade', settlementId: townId };
    const result = applyAction(state, action);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.settlements[townId].type).toBe('city');
    }
  });

  it('deducts upgrade cost from player funds', () => {
    const { state, townId } = makeStateWithTown();
    const fundsBefore = state.players.player1.funds;
    const action: UpgradeAction = { type: 'upgrade', settlementId: townId };
    const result = applyAction(state, action);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.players.player1.funds).toBe(fundsBefore - UPGRADE_COST);
    }
  });

  it('recomputes fog with city vision range after upgrade', () => {
    const { state, townId } = makeStateWithTown();
    const townTileId = state.settlements[townId].tileId;
    const townTile = state.tiles[townTileId];

    const action: UpgradeAction = { type: 'upgrade', settlementId: townId };
    const result = applyAction(state, action);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // City has vision range 3, town had vision range 2
    // Check that tiles at distance 3 from the settlement are now visible
    const fog = result.state.fog.player1;
    let foundRange3Visible = false;
    for (const [tileId, tile] of Object.entries(result.state.tiles)) {
      const dr = Math.abs(tile.coord.row - townTile.coord.row);
      const dc = Math.abs(tile.coord.col - townTile.coord.col);
      const dist = Math.max(dr, dc);
      if (dist === 3 && fog[tileId] === 'visible') {
        foundRange3Visible = true;
        break;
      }
    }
    expect(foundRange3Visible).toBe(true);
  });
});
