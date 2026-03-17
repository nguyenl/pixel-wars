import { describe, it, expect } from 'vitest';
import { validateMove } from '../../src/game/rules';
import { newGame } from '../../src/game/state';
import { applyAction } from '../../src/game/state';
import type { GameState, Unit, Tile } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { UNIT_CONFIG } from '../../src/game/constants';

function buildTestState(overrides: Partial<GameState> = {}): GameState {
  const base = newGame('medium', 99);
  return { ...base, ...overrides };
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

describe('validateMove', () => {
  it('rejects move when unit has 0 MP remaining', () => {
    const base = buildTestState();
    const unitId = 'test-unit';
    const startTile = tileId(5, 5);
    const destTile = tileId(5, 6);
    const state = placeUnit(base, {
      id: unitId,
      type: 'scout',
      owner: 'player1',
      tileId: startTile,
      hp: 3,
      movementPoints: 0,
      hasAttacked: false,
    });
    const result = validateMove(state, {
      type: 'move',
      unitId,
      path: [
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result?.error).toBe('unit-already-moved');
  });

  it('rejects path through water tile', () => {
    const base = buildTestState();
    // Find a water tile adjacent to a plains tile for testing
    const waterTile = Object.values(base.tiles).find(t => t.terrain === 'water');
    if (!waterTile) return; // Skip if no water

    const unitId = 'test-unit-water';
    const startTile = tileId(0, 0);
    // Ensure start tile is not water
    if (base.tiles[startTile].terrain === 'water') return;

    const state = placeUnit(base, {
      id: unitId,
      type: 'scout',
      owner: 'player1',
      tileId: startTile,
      hp: 3,
      movementPoints: 5,
      hasAttacked: false,
    });
    const result = validateMove(state, {
      type: 'move',
      unitId,
      path: [
        base.tiles[startTile].coord,
        waterTile.coord,
      ],
    });
    expect(result).not.toBeNull();
    expect(result?.error).toBe('path-blocked');
  });

  it('rejects destination occupied by friendly unit', () => {
    const base = buildTestState();
    const unitId1 = 'unit-1';
    const unitId2 = 'unit-2';
    const tile1 = tileId(5, 5);
    const tile2 = tileId(5, 6);

    let state = placeUnit(base, {
      id: unitId1,
      type: 'scout',
      owner: 'player1',
      tileId: tile1,
      hp: 3,
      movementPoints: 5,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: unitId2,
      type: 'infantry',
      owner: 'player1',
      tileId: tile2,
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    });

    const result = validateMove(state, {
      type: 'move',
      unitId: unitId1,
      path: [
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result?.error).toBe('path-blocked');
  });

  it('accepts path where total terrain cost <= unit MP', () => {
    const base = buildTestState();
    const unitId = 'unit-valid';
    const tile1 = tileId(5, 5);
    const tile2 = tileId(5, 6);
    // Ensure both tiles are plains (cost 1 each)
    const state: GameState = {
      ...placeUnit(base, {
        id: unitId,
        type: 'scout',
        owner: 'player1',
        tileId: tile1,
        hp: 3,
        movementPoints: 5,
        hasAttacked: false,
      }),
      tiles: {
        ...base.tiles,
        [tile1]: { ...base.tiles[tile1], terrain: 'plains', unitId },
        [tile2]: { ...base.tiles[tile2], terrain: 'plains', unitId: null },
      },
    };
    const result = validateMove(state, {
      type: 'move',
      unitId,
      path: [
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ],
    });
    expect(result).toBeNull();
  });

  it('rejects destination occupied by an enemy unit', () => {
    const base = buildTestState();
    const unitId = 'mover-1';
    const enemyId = 'enemy-1';
    const tile1 = tileId(5, 5);
    const tile2 = tileId(5, 6);

    let state = placeUnit(base, {
      id: unitId,
      type: 'scout',
      owner: 'player1',
      tileId: tile1,
      hp: 3,
      movementPoints: 5,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: enemyId,
      type: 'infantry',
      owner: 'player2',
      tileId: tile2,
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    });
    // Force both tiles to plains so path cost is valid
    state = {
      ...state,
      tiles: {
        ...state.tiles,
        [tile1]: { ...state.tiles[tile1], terrain: 'plains', unitId: unitId },
        [tile2]: { ...state.tiles[tile2], terrain: 'plains', unitId: enemyId },
      },
    };

    const result = validateMove(state, {
      type: 'move',
      unitId,
      path: [
        { row: 5, col: 5 },
        { row: 5, col: 6 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result?.error).toBe('path-blocked');
  });
});

describe('tile occupation invariant', () => {
  it('no two units share the same tileId after applyMove', () => {
    const base = buildTestState();
    const unitId = 'unit-move';
    const tile1 = tileId(5, 5);
    const tile2 = tileId(5, 6);

    let state = placeUnit(base, {
      id: unitId,
      type: 'scout',
      owner: 'player1',
      tileId: tile1,
      hp: 3,
      movementPoints: 5,
      hasAttacked: false,
    });
    // Force both tiles to plains
    state = {
      ...state,
      tiles: {
        ...state.tiles,
        [tile1]: { ...state.tiles[tile1], terrain: 'plains', unitId: unitId },
        [tile2]: { ...state.tiles[tile2], terrain: 'plains', unitId: null },
      },
    };

    const result = applyAction(state, {
      type: 'move',
      unitId,
      path: [{ row: 5, col: 5 }, { row: 5, col: 6 }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Check no two units share a tileId
      const tileIds = Object.values(result.state.units).map(u => u.tileId);
      const uniqueTileIds = new Set(tileIds);
      expect(uniqueTileIds.size).toBe(tileIds.length);
    }
  });

  it('no two units share the same tileId after applyCombatResult', () => {
    const base = buildTestState();
    const attackerId = 'att-invariant';
    const targetId = 'tgt-invariant';
    const aTile = tileId(5, 5);
    const tTile = tileId(5, 6);

    let state = placeUnit(base, {
      id: attackerId,
      type: 'infantry',
      owner: 'player1',
      tileId: aTile,
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: targetId,
      type: 'infantry',
      owner: 'player2',
      tileId: tTile,
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    });

    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId: attackerId,
      targetUnitId: targetId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const tileIds = Object.values(result.state.units).map(u => u.tileId);
      const uniqueTileIds = new Set(tileIds);
      expect(uniqueTileIds.size).toBe(tileIds.length);
    }
  });
});

// T033 — attack validation tests
describe('validateAttack', () => {
  it('unit with hasAttacked=true is rejected', () => {
    const base = buildTestState();
    const attackerId = 'attacker-1';
    const targetId = 'target-1';
    const attackerTile = tileId(5, 5);
    const targetTile = tileId(5, 6);

    let state = placeUnit(base, {
      id: attackerId,
      type: 'infantry',
      owner: 'player1',
      tileId: attackerTile,
      hp: 5,
      movementPoints: 3,
      hasAttacked: true, // already attacked
    });
    state = placeUnit(state, {
      id: targetId,
      type: 'infantry',
      owner: 'player2',
      tileId: targetTile,
      hp: 5,
      movementPoints: 3,
      hasAttacked: false,
    });

    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId: attackerId,
      targetUnitId: targetId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('unit-already-attacked');
    }
  });

  it('target out of range is rejected (infantry range 1, target 3 away)', () => {
    const base = buildTestState();
    const attackerId = 'attacker-range';
    const targetId = 'target-range';
    const attackerTile = tileId(5, 5);
    const targetTile = tileId(5, 8); // distance 3 — out of range for infantry

    let state = placeUnit(base, {
      id: attackerId,
      type: 'infantry',
      owner: 'player1',
      tileId: attackerTile,
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: targetId,
      type: 'infantry',
      owner: 'player2',
      tileId: targetTile,
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });

    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId: attackerId,
      targetUnitId: targetId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('out-of-range');
    }
  });

  it('Artillery at distance 2 is accepted', () => {
    const base = buildTestState();
    const attackerId = 'arty-1';
    const targetId = 'target-arty';
    const attackerTile = tileId(5, 5);
    const targetTile = tileId(5, 7); // distance 2 — valid for artillery

    let state = placeUnit(base, {
      id: attackerId,
      type: 'artillery',
      owner: 'player1',
      tileId: attackerTile,
      hp: 4,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: targetId,
      type: 'infantry',
      owner: 'player2',
      tileId: targetTile,
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });

    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId: attackerId,
      targetUnitId: targetId,
    });
    expect(result.ok).toBe(true);
  });

  it('Artillery at distance 3 is rejected', () => {
    const base = buildTestState();
    const attackerId = 'arty-2';
    const targetId = 'target-far';
    const attackerTile = tileId(5, 5);
    const targetTile = tileId(5, 8); // distance 3 — out of range for artillery (range 2)

    let state = placeUnit(base, {
      id: attackerId,
      type: 'artillery',
      owner: 'player1',
      tileId: attackerTile,
      hp: 4,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: targetId,
      type: 'infantry',
      owner: 'player2',
      tileId: targetTile,
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });

    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId: attackerId,
      targetUnitId: targetId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('out-of-range');
    }
  });
});
