import { describe, it, expect } from 'vitest';
import { recomputeFog } from '../../src/game/fog';
import { newGame } from '../../src/game/state';
import type { GameState, Unit } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { UNIT_CONFIG } from '../../src/game/constants';

describe('recomputeFog', () => {
  it('on new game all tiles outside starting vision are hidden for player1', () => {
    const state = newGame('small', 1);
    // The new game already has fog computed; check some are hidden
    const fogMap = state.fog['player1'];
    const hiddenCount = Object.values(fogMap).filter(f => f === 'hidden').length;
    // Should have many hidden tiles (small map is 10x10 = 100 tiles)
    expect(hiddenCount).toBeGreaterThan(0);
  });

  it('tiles within Scout visionRange=4 become visible after move', () => {
    const state = newGame('medium', 42);
    // Place a scout at a known position
    const unitId = 'fog-scout';
    const scoutRow = 7;
    const scoutCol = 7;
    const scoutTileId = tileId(scoutRow, scoutCol);
    const stateWithScout: GameState = {
      ...state,
      units: {
        [unitId]: {
          id: unitId,
          type: 'scout',
          owner: 'player1',
          tileId: scoutTileId,
          hp: 3,
          movementPoints: UNIT_CONFIG.scout.movementAllowance,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [scoutTileId]: { ...state.tiles[scoutTileId], unitId },
      },
    };
    const newFog = recomputeFog(stateWithScout, 'player1');
    // Tiles within Chebyshev distance 4 of (7,7) should be visible
    for (let r = 3; r <= 11; r++) {
      for (let c = 3; c <= 11; c++) {
        const id = tileId(r, c);
        if (stateWithScout.tiles[id]) {
          expect(newFog[id]).toBe('visible');
        }
      }
    }
  });

  it('tiles that were visible and leave all unit ranges drop to explored', () => {
    const state = newGame('small', 1);
    const unitId = 'moving-unit';
    const pos1 = tileId(2, 2);

    // Remove all settlements to isolate unit vision behavior
    const neutralSettlements = { ...state.settlements };
    for (const [id, s] of Object.entries(neutralSettlements)) {
      neutralSettlements[id] = { ...s, owner: 'neutral' };
    }

    const stateWithUnit: GameState = {
      ...state,
      settlements: neutralSettlements,
      units: {
        [unitId]: {
          id: unitId,
          type: 'infantry',
          owner: 'player1',
          tileId: pos1,
          hp: 5,
          movementPoints: 3,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [pos1]: { ...state.tiles[pos1], unitId },
      },
    };
    // First recompute: tiles within visionRange=2 of (2,2) are visible
    const fog1 = recomputeFog(stateWithUnit, 'player1');

    // Now move unit far away and recompute
    const pos2 = tileId(8, 8);
    const stateUnitMoved: GameState = {
      ...stateWithUnit,
      fog: { ...state.fog, player1: fog1 },
      units: {
        [unitId]: {
          ...stateWithUnit.units[unitId],
          tileId: pos2,
        },
      },
      tiles: {
        ...stateWithUnit.tiles,
        [pos1]: { ...stateWithUnit.tiles[pos1], unitId: null },
        [pos2]: { ...stateWithUnit.tiles[pos2], unitId },
      },
    };
    const fog2 = recomputeFog(stateUnitMoved, 'player1');

    // (2,2) should have been visible in fog1 but is now explored in fog2
    if (fog1[pos1] === 'visible') {
      expect(fog2[pos1]).toBe('explored');
    }
  });

  it('enemy unit on explored tile is not exposed', () => {
    const state = newGame('small', 1);
    // Create a situation where an enemy is on an explored tile
    // Use a tile far from any player1 settlements to avoid settlement vision
    const enemyUnitId = 'enemy-1';
    const exploredTile = tileId(0, 0);

    // Remove all player1 units so only settlement vision could interfere
    // Also clear all settlement ownership to isolate the test
    const neutralSettlements = { ...state.settlements };
    for (const [id, s] of Object.entries(neutralSettlements)) {
      neutralSettlements[id] = { ...s, owner: 'neutral' };
    }

    // Set the tile as explored in fog
    const fogWithExplored = {
      ...state.fog['player1'],
      [exploredTile]: 'explored' as const,
    };
    const stateWithEnemy: GameState = {
      ...state,
      settlements: neutralSettlements,
      fog: { ...state.fog, player1: fogWithExplored },
      units: {
        [enemyUnitId]: {
          id: enemyUnitId,
          type: 'infantry',
          owner: 'player2',
          tileId: exploredTile,
          hp: 5,
          movementPoints: 3,
          hasAttacked: false,
        },
      },
      tiles: {
        ...state.tiles,
        [exploredTile]: { ...state.tiles[exploredTile], unitId: enemyUnitId },
      },
    };
    // Fog map doesn't expose enemy unit — fog states only track visibility
    // The renderer is responsible for not showing enemies on explored tiles.
    // We verify the fog state itself remains 'explored', not 'visible'.
    const newFog = recomputeFog(stateWithEnemy, 'player1');
    // Enemy unit alone doesn't make tile visible for player1
    expect(newFog[exploredTile]).toBe('explored');
  });

  it('owned city grants 3-tile Chebyshev vision with no units', () => {
    const state = newGame('medium', 42);
    // Find player1's city
    const city = Object.values(state.settlements).find(
      s => s.type === 'city' && s.owner === 'player1',
    )!;
    const cityTile = state.tiles[city.tileId];

    // Create a state with NO units (only the city provides vision)
    const stateNoUnits: GameState = {
      ...state,
      units: {},
      tiles: Object.fromEntries(
        Object.entries(state.tiles).map(([id, t]) => [id, { ...t, unitId: null }]),
      ),
    };
    const fog = recomputeFog(stateNoUnits, 'player1');

    // All tiles within Chebyshev distance 3 of the city should be visible
    for (const [id, tile] of Object.entries(stateNoUnits.tiles)) {
      const dist = Math.max(
        Math.abs(tile.coord.row - cityTile.coord.row),
        Math.abs(tile.coord.col - cityTile.coord.col),
      );
      if (dist <= 3) {
        expect(fog[id], `tile ${id} at dist ${dist} from city should be visible`).toBe('visible');
      }
    }
  });

  it('owned town grants 2-tile Chebyshev vision with no units', () => {
    const state = newGame('medium', 42);
    // Find a town and assign it to player1
    const town = Object.values(state.settlements).find(
      s => s.type === 'town' && s.owner === 'neutral',
    )!;
    const townTile = state.tiles[town.tileId];

    const stateWithTown: GameState = {
      ...state,
      settlements: {
        ...state.settlements,
        [town.id]: { ...town, owner: 'player1' },
      },
      units: {},
      tiles: Object.fromEntries(
        Object.entries(state.tiles).map(([id, t]) => [id, { ...t, unitId: null }]),
      ),
    };
    const fog = recomputeFog(stateWithTown, 'player1');

    for (const [id, tile] of Object.entries(stateWithTown.tiles)) {
      const dist = Math.max(
        Math.abs(tile.coord.row - townTile.coord.row),
        Math.abs(tile.coord.col - townTile.coord.col),
      );
      if (dist <= 2) {
        expect(fog[id], `tile ${id} at dist ${dist} from town should be visible`).toBe('visible');
      }
    }
  });

  it('neutral city grants no vision to either player', () => {
    const state = newGame('medium', 42);
    // Make all settlements neutral, remove all units
    const neutralSettlements: typeof state.settlements = {};
    for (const [id, s] of Object.entries(state.settlements)) {
      neutralSettlements[id] = { ...s, owner: 'neutral' };
    }
    const stateNeutral: GameState = {
      ...state,
      settlements: neutralSettlements,
      units: {},
      tiles: Object.fromEntries(
        Object.entries(state.tiles).map(([id, t]) => [id, { ...t, unitId: null }]),
      ),
    };
    const fog = recomputeFog(stateNeutral, 'player1');

    // No tiles should be visible (no units, no owned settlements)
    const visibleCount = Object.values(fog).filter(f => f === 'visible').length;
    expect(visibleCount).toBe(0);
  });

  it('enemy city grants no vision to opponent', () => {
    const state = newGame('medium', 42);
    // Make all settlements owned by player2, remove all units
    const enemySettlements: typeof state.settlements = {};
    for (const [id, s] of Object.entries(state.settlements)) {
      enemySettlements[id] = { ...s, owner: 'player2' };
    }
    const stateEnemy: GameState = {
      ...state,
      settlements: enemySettlements,
      units: {},
      tiles: Object.fromEntries(
        Object.entries(state.tiles).map(([id, t]) => [id, { ...t, unitId: null }]),
      ),
    };
    const fog = recomputeFog(stateEnemy, 'player1');

    // No tiles should be visible for player1
    const visibleCount = Object.values(fog).filter(f => f === 'visible').length;
    expect(visibleCount).toBe(0);
  });

  it('captured city transfers vision to new owner', () => {
    const state = newGame('medium', 42);
    const city = Object.values(state.settlements).find(
      s => s.type === 'city' && s.owner === 'player2',
    )!;
    const cityTile = state.tiles[city.tileId];

    // Remove all units; city is owned by player2
    const baseState: GameState = {
      ...state,
      units: {},
      tiles: Object.fromEntries(
        Object.entries(state.tiles).map(([id, t]) => [id, { ...t, unitId: null }]),
      ),
    };

    // player1 should NOT see tiles near player2's city
    const fogBefore = recomputeFog(baseState, 'player1');
    // Tiles near the player2 city should not be visible (unless near player1's own city)
    // Check a tile adjacent to player2's city specifically
    const nearTileId = tileId(cityTile.coord.row, cityTile.coord.col);
    // After capture: switch city to player1
    const capturedState: GameState = {
      ...baseState,
      settlements: {
        ...baseState.settlements,
        [city.id]: { ...city, owner: 'player1' },
      },
    };
    const fogAfter = recomputeFog(capturedState, 'player1');
    // The city tile itself should now be visible for player1
    expect(fogAfter[nearTileId]).toBe('visible');
  });
});
