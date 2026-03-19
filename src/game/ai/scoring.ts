/**
 * src/game/ai/scoring.ts
 *
 * Utility scoring functions used by the AI to rank unit-objective pairs.
 */

import type { GameState, Unit, Settlement, TileCoord } from '../types';
import { UNIT_CONFIG, SETTLEMENT_INCOME } from '../constants';
import { chebyshevDistance } from '../board';

export interface Objective {
  type: 'enemy-unit' | 'settlement' | 'explore' | 'block-capture' | 'defend';
  tileCoord: TileCoord;
  tileId: string;
  /** Enemy unit ID (for 'enemy-unit' objectives) */
  enemyUnitId?: string;
  /** Settlement ID (for 'settlement', 'block-capture', and 'defend' objectives) */
  settlementId?: string;
}

/**
 * Distance score: inverse of Chebyshev distance. Closer = higher score.
 */
export function distanceScore(unit: Unit, objective: Objective, state: GameState): number {
  const unitTile = state.tiles[unit.tileId];
  if (!unitTile) return 0;
  const dist = chebyshevDistance(unitTile.coord, objective.tileCoord);
  return dist === 0 ? 10 : 1 / dist;
}

/**
 * Unit type fit for objective:
 * - Scout → scouting/explore objectives get bonus
 * - Infantry → settlement capture gets bonus
 * - Artillery → enemy unit objectives get bonus
 */
export function unitFitScore(unit: Unit, objective: Objective): number {
  switch (objective.type) {
    case 'explore':
      return unit.type === 'scout' ? 2 : 0.5;
    case 'settlement':
      return unit.type === 'infantry' ? 2 : unit.type === 'scout' ? 1 : 0.5;
    case 'enemy-unit':
      return unit.type === 'artillery' ? 2 : unit.type === 'infantry' ? 1.5 : 1;
    case 'block-capture':
      return unit.type === 'infantry' ? 2 : unit.type === 'scout' ? 1.5 : 1;
    case 'defend':
      return unit.type === 'infantry' ? 2 : unit.type === 'artillery' ? 1.5 : 1;
  }
}

/**
 * Objective value: settlements by income, enemy units by remaining HP threat.
 */
export function objectiveValueScore(objective: Objective, state: GameState): number {
  switch (objective.type) {
    case 'settlement': {
      if (!objective.settlementId) return 1;
      const settlement = state.settlements[objective.settlementId];
      if (!settlement) return 1;
      return settlement.type === 'city' ? 3 : 1;
    }
    case 'enemy-unit': {
      if (!objective.enemyUnitId) return 1;
      const enemy = state.units[objective.enemyUnitId];
      if (!enemy) return 0;
      // Higher score for weaker enemies (easier kills)
      const maxHp = UNIT_CONFIG[enemy.type].maxHp;
      return 2 - (enemy.hp / maxHp);
    }
    case 'explore':
      return 0.5;
    case 'block-capture': {
      // High value: blocking a city capture is worth more than blocking a town
      if (!objective.settlementId) return 2;
      const settlement = state.settlements[objective.settlementId];
      if (!settlement) return 2;
      return settlement.type === 'city' ? 4 : 2;
    }
    case 'defend':
      return 1.5;
  }
}

/**
 * Threat score: how dangerous is this objective's location.
 * Higher threat means more enemy units nearby.
 */
export function threatScore(objective: Objective, state: GameState): number {
  const aiPlayer = 'player2';
  let threat = 0;
  for (const unit of Object.values(state.units)) {
    if (unit.owner === aiPlayer) continue;
    const tile = state.tiles[unit.tileId];
    if (!tile) continue;
    const dist = chebyshevDistance(tile.coord, objective.tileCoord);
    if (dist <= 3) threat += 1 / (dist + 1);
  }
  return threat;
}

/**
 * Combined utility score for assigning a unit to an objective.
 * When `isOffensivePhase` is true, enemy-unit and aggressive objectives get
 * higher weight and the threat penalty is reduced.
 * When in expansion phase, block-capture objectives get a bonus multiplier.
 */
export function computeUtility(
  unit: Unit,
  objective: Objective,
  state: GameState,
  isOffensivePhase = false,
): number {
  const isOffensive = isOffensivePhase;
  let valueWeight: number;
  if (isOffensive && (objective.type === 'enemy-unit')) {
    valueWeight = 3;
  } else if (!isOffensive && objective.type === 'block-capture') {
    valueWeight = 3; // high priority during expansion
  } else {
    valueWeight = 2;
  }
  const threatWeight = isOffensive ? 0.2 : 0.5;
  return (
    distanceScore(unit, objective, state) * 2 +
    unitFitScore(unit, objective) * 1.5 +
    objectiveValueScore(objective, state) * valueWeight -
    threatScore(objective, state) * threatWeight
  );
}
