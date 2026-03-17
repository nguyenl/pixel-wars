import { describe, it, expect } from 'vitest';
import { reachableMap, getReachableTiles } from '../../src/game/pathfinding';
import { newGame } from '../../src/game/state';
import type { GameState, Unit } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { TERRAIN_CONFIG } from '../../src/game/constants';

function makeFlatState(rows: number, cols: number): GameState {
  // Build a flat plains-only map for predictable pathfinding tests
  const base = newGame('medium', 1);
  const tiles = { ...base.tiles };
  for (const id of Object.keys(tiles)) {
    // Force all tiles to plains for testing
    tiles[id] = { ...tiles[id], terrain: 'plains', unitId: null, settlementId: null };
  }
  return {
    ...base,
    tiles,
    units: {},
    settlements: {},
  };
}

function placeUnit(state: GameState, unit: Unit): GameState {
  return {
    ...state,
    units: { ...state.units, [unit.id]: unit },
    tiles: {
      ...state.tiles,
      [unit.tileId]: { ...state.tiles[unit.tileId], unitId: unit.id },
    },
  };
}

describe('reachableMap', () => {
  it('Scout (5 MP) on plains reaches 5-step destinations', () => {
    const state = makeFlatState(15, 15);
    const origin = { row: 7, col: 7 };
    const result = reachableMap(state, origin, 5);
    // At (7,7) with budget 5 on plains (cost 1), should reach (7,12) — 5 steps right
    expect(result.has(tileId(7, 12))).toBe(true);
    expect(result.get(tileId(7, 12))).toBeLessThanOrEqual(5);
  });

  it('reachableMap excludes tiles costing more than budget', () => {
    const state = makeFlatState(15, 15);
    const origin = { row: 7, col: 7 };
    const result = reachableMap(state, origin, 3);
    // With budget 3 on plains, can't reach (7,11) which costs 4
    expect(result.has(tileId(7, 11))).toBe(false);
  });

  it('reachableMap excludes water tiles', () => {
    const base = makeFlatState(15, 15);
    // Place water obstacle
    const waterTile = tileId(7, 8);
    const state: GameState = {
      ...base,
      tiles: {
        ...base.tiles,
        [waterTile]: { ...base.tiles[waterTile], terrain: 'water' },
      },
    };
    const origin = { row: 7, col: 7 };
    const result = reachableMap(state, origin, 5);
    // Water tile itself should not be reachable
    expect(result.has(waterTile)).toBe(false);
  });

  it('Artillery (2 MP) cannot pass a mountain tile (cost 3)', () => {
    const base = makeFlatState(15, 15);
    // Place mountain at (7,8) — blocks artillery from passing
    const mountainTile = tileId(7, 8);
    const artilleryTile = tileId(7, 7);
    const state: GameState = {
      ...base,
      tiles: {
        ...base.tiles,
        [mountainTile]: { ...base.tiles[mountainTile], terrain: 'mountain' },
      },
    };
    const origin = { row: 7, col: 7 };
    const result = reachableMap(state, origin, 2); // Artillery budget = 2
    // Mountain costs 3 > budget 2, so it's excluded
    expect(result.has(mountainTile)).toBe(false);
    // Tiles beyond the mountain in a straight line should also not be reachable via that path
    // (7,9) is 2 hops through the mountain — not reachable with budget 2 through mountain
    // But (7,6) is reachable (cost 1)
    expect(result.has(tileId(7, 6))).toBe(true);
  });

  it('all tiles in returned set have accumulated cost <= budget', () => {
    const state = makeFlatState(15, 15);
    const origin = { row: 7, col: 7 };
    const budget = 4;
    const result = reachableMap(state, origin, budget);
    for (const [, cost] of result) {
      expect(cost).toBeLessThanOrEqual(budget);
    }
  });
});

describe('getReachableTiles', () => {
  it('returns TileCoord array for unit with full MP', () => {
    const base = makeFlatState(15, 15);
    const unitId = 'test-scout';
    const unitTile = tileId(7, 7);
    const state = placeUnit(base, {
      id: unitId,
      type: 'scout',
      owner: 'player1',
      tileId: unitTile,
      hp: 3,
      movementPoints: 5,
      hasAttacked: false,
    });
    const result = getReachableTiles(state, unitId);
    expect(result.length).toBeGreaterThan(0);
    // All returned coords should be within budget
    for (const coord of result) {
      const dist = Math.max(Math.abs(coord.row - 7), Math.abs(coord.col - 7));
      expect(dist).toBeLessThanOrEqual(5);
    }
  });

  it('excludes tiles occupied by enemy units', () => {
    const base = makeFlatState(15, 15);
    const friendlyId = 'friendly-scout';
    const enemyId = 'enemy-infantry';
    const friendlyTile = tileId(7, 7);
    const enemyTile = tileId(7, 8); // 1 step east — within reach

    let state = placeUnit(base, {
      id: friendlyId,
      type: 'scout',
      owner: 'player1',
      tileId: friendlyTile,
      hp: 3,
      movementPoints: 5,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: enemyId,
      type: 'infantry',
      owner: 'player2',
      tileId: enemyTile,
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    });

    const result = getReachableTiles(state, friendlyId);
    const hasEnemyTile = result.some(c => c.row === 7 && c.col === 8);
    expect(hasEnemyTile).toBe(false);
  });

  it('returns empty array when unit has 0 MP', () => {
    const base = makeFlatState(15, 15);
    const unitId = 'no-mp-unit';
    const unitTile = tileId(7, 7);
    const state = placeUnit(base, {
      id: unitId,
      type: 'scout',
      owner: 'player1',
      tileId: unitTile,
      hp: 3,
      movementPoints: 0,
      hasAttacked: false,
    });
    const result = getReachableTiles(state, unitId);
    expect(result.length).toBe(0);
  });
});
