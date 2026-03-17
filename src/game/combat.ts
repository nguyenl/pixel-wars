/**
 * src/game/combat.ts
 *
 * Combat resolution. Pure function — does not mutate state.
 * Formula: damage = max(1, attacker.attackStrength - defender.defenseStrength)
 * Counterattack iff attacker.attackRange === 1 AND defender survives AND adjacent.
 */

import type { GameState, CombatResult } from './types';
import { UNIT_CONFIG } from './constants';
import { chebyshevDistance } from './board';

/**
 * Compute combat outcome without mutating state.
 * Returns a CombatResult describing HP changes and whether a counterattack occurred.
 */
export function resolveCombat(
  state: GameState,
  attackerUnitId: string,
  targetUnitId: string,
): CombatResult {
  const attacker = state.units[attackerUnitId];
  const defender = state.units[targetUnitId];
  if (!attacker || !defender) {
    throw new Error(`Invalid unit IDs: ${attackerUnitId}, ${targetUnitId}`);
  }

  const attackerConfig = UNIT_CONFIG[attacker.type];
  const defenderConfig = UNIT_CONFIG[defender.type];

  // Initial attack
  const damage = Math.max(1, attackerConfig.attackStrength - defenderConfig.defenseStrength);
  const defenderHpAfter = defender.hp - damage;
  const defenderDestroyed = defenderHpAfter <= 0;

  // Counterattack conditions:
  // 1. Attacker is melee (attackRange === 1)
  // 2. Defender survived the initial hit
  // 3. Defender is adjacent (Chebyshev distance 1)
  const attackerTile = state.tiles[attacker.tileId];
  const defenderTile = state.tiles[defender.tileId];
  const isAdjacent = attackerTile && defenderTile &&
    chebyshevDistance(attackerTile.coord, defenderTile.coord) <= 1;

  const counterattackOccurred =
    attackerConfig.attackRange === 1 &&
    !defenderDestroyed &&
    !!isAdjacent;

  let attackerHpAfter = attacker.hp;
  let attackerDestroyed = false;

  if (counterattackOccurred) {
    const counterDamage = Math.max(1, defenderConfig.attackStrength - attackerConfig.defenseStrength);
    attackerHpAfter = attacker.hp - counterDamage;
    attackerDestroyed = attackerHpAfter <= 0;
  }

  return {
    attackerHpAfter,
    defenderHpAfter,
    attackerDestroyed,
    defenderDestroyed,
    counterattackOccurred,
  };
}

/**
 * Apply a combat result to the game state.
 * Removes destroyed units from state and clears their tile references.
 * Returns the updated state.
 */
export function applyCombatResult(
  state: GameState,
  attackerUnitId: string,
  targetUnitId: string,
  result: CombatResult,
): GameState {
  let newState = state;
  const newUnits = { ...state.units };
  const newTiles = { ...state.tiles };

  // Update attacker
  if (result.attackerDestroyed) {
    const attackerTileId = newUnits[attackerUnitId].tileId;
    delete newUnits[attackerUnitId];
    newTiles[attackerTileId] = { ...newTiles[attackerTileId], unitId: null };
  } else {
    newUnits[attackerUnitId] = {
      ...newUnits[attackerUnitId],
      hp: result.attackerHpAfter,
      hasAttacked: true,
    };
  }

  // Update defender
  if (result.defenderDestroyed) {
    const defenderTileId = newUnits[targetUnitId].tileId;
    delete newUnits[targetUnitId];
    newTiles[defenderTileId] = { ...newTiles[defenderTileId], unitId: null };
  } else {
    newUnits[targetUnitId] = {
      ...newUnits[targetUnitId],
      hp: result.defenderHpAfter,
    };
  }

  return { ...newState, units: newUnits, tiles: newTiles };
}
