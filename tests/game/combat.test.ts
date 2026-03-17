import { describe, it, expect } from 'vitest';
import { resolveCombat } from '../../src/game/combat';
import { newGame } from '../../src/game/state';
import { applyAction } from '../../src/game/state';
import type { GameState, Unit } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { UNIT_CONFIG } from '../../src/game/constants';

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

function makeBaseState(): GameState {
  const state = newGame('medium', 7);
  // Clear all units for clean tests
  const cleanTiles = { ...state.tiles };
  for (const id of Object.keys(cleanTiles)) {
    cleanTiles[id] = { ...cleanTiles[id], unitId: null };
  }
  return { ...state, units: {}, tiles: cleanTiles };
}

describe('resolveCombat', () => {
  it('Infantry vs Infantry: 1 damage each (atk=4 vs def=3)', () => {
    let state = makeBaseState();
    // Infantry: atk=4, def=3 → damage = max(1, 4-3) = 1
    state = placeUnit(state, {
      id: 'inf-attacker',
      type: 'infantry',
      owner: 'player1',
      tileId: tileId(5, 5),
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: 'inf-defender',
      type: 'infantry',
      owner: 'player2',
      tileId: tileId(5, 6),
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });
    const result = resolveCombat(state, 'inf-attacker', 'inf-defender');
    expect(result.defenderHpAfter).toBe(4); // 5 - 1
    expect(result.counterattackOccurred).toBe(true);
    expect(result.attackerHpAfter).toBe(4); // counterattack: 5 - 1
    expect(result.defenderDestroyed).toBe(false);
    expect(result.attackerDestroyed).toBe(false);
  });

  it('Artillery vs Infantry at range 2: 3 damage, no counterattack', () => {
    let state = makeBaseState();
    // Artillery: atk=6 vs Infantry def=3 → damage = max(1, 6-3) = 3
    state = placeUnit(state, {
      id: 'arty',
      type: 'artillery',
      owner: 'player1',
      tileId: tileId(5, 5),
      hp: 4,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: 'inf-target',
      type: 'infantry',
      owner: 'player2',
      tileId: tileId(5, 7), // distance 2 — ranged
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });
    const result = resolveCombat(state, 'arty', 'inf-target');
    expect(result.defenderHpAfter).toBe(2); // 5 - 3
    expect(result.counterattackOccurred).toBe(false);
    expect(result.attackerHpAfter).toBe(4); // no counterattack
    expect(result.defenderDestroyed).toBe(false);
  });

  it('unit at 0 HP is destroyed', () => {
    let state = makeBaseState();
    // Infantry attacker vs Scout defender (def=1): damage = max(1, 4-1) = 3 > Scout HP=3
    state = placeUnit(state, {
      id: 'killer',
      type: 'infantry',
      owner: 'player1',
      tileId: tileId(5, 5),
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: 'dead-scout',
      type: 'scout',
      owner: 'player2',
      tileId: tileId(5, 6),
      hp: 3,
      movementPoints: 0,
      hasAttacked: false,
    });
    const result = resolveCombat(state, 'killer', 'dead-scout');
    expect(result.defenderHpAfter).toBeLessThanOrEqual(0);
    expect(result.defenderDestroyed).toBe(true);
    // No counterattack since defender is destroyed
    expect(result.counterattackOccurred).toBe(false);
  });

  it('minimum damage is always 1 even when defense > attack', () => {
    let state = makeBaseState();
    // Scout (atk=2) vs Infantry (def=3): damage = max(1, 2-3) = max(1, -1) = 1
    state = placeUnit(state, {
      id: 'weak-attacker',
      type: 'scout',
      owner: 'player1',
      tileId: tileId(5, 5),
      hp: 3,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: 'strong-defender',
      type: 'infantry',
      owner: 'player2',
      tileId: tileId(5, 6),
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });
    const result = resolveCombat(state, 'weak-attacker', 'strong-defender');
    expect(result.defenderHpAfter).toBe(4); // 5 - 1 (minimum 1)
  });

  it('applyAction attack removes destroyed unit from state', () => {
    let state = makeBaseState();
    state = placeUnit(state, {
      id: 'inf-killer',
      type: 'infantry',
      owner: 'player1',
      tileId: tileId(5, 5),
      hp: 5,
      movementPoints: 0,
      hasAttacked: false,
    });
    state = placeUnit(state, {
      id: 'scout-dead',
      type: 'scout',
      owner: 'player2',
      tileId: tileId(5, 6),
      hp: 3, // Scout will die: max(1, 4-1) = 3 damage
      movementPoints: 0,
      hasAttacked: false,
    });
    const result = applyAction(state, {
      type: 'attack',
      attackerUnitId: 'inf-killer',
      targetUnitId: 'scout-dead',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.units['scout-dead']).toBeUndefined();
      expect(result.state.tiles[tileId(5, 6)].unitId).toBeNull();
    }
  });
});
