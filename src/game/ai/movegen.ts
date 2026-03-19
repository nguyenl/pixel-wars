/**
 * src/game/ai/movegen.ts
 *
 * Move generation with heuristic ordering for alpha-beta search.
 * Generates top-K candidate actions per unit, sorted by priority:
 *   1. Kill shots (lethal attacks)
 *   2. Attacks by expected damage
 *   3. Moves toward objectives
 *   4. Production actions
 *   5. Hold position (no-op baseline)
 */

import type { GameState, PlayerId, Action, Unit, SearchConfig, CandidateAction } from '../types';
import { UNIT_CONFIG } from '../constants';
import { chebyshevDistance } from '../board';
import { reachableMap, getAttackableTargets, findPath } from '../pathfinding';
import { resolveCombat } from '../combat';
import { computeUtility, type Objective } from './scoring';
import { buildObjectives, isOffensivePhase } from './objectives';

/**
 * Generate ordered candidate actions for a single unit.
 * Returns up to `config.maxCandidatesPerUnit` candidates, sorted by orderScore descending.
 */
export function generateCandidateActions(
  state: GameState,
  unitId: string,
  config: SearchConfig,
): CandidateAction[] {
  const unit = state.units[unitId];
  if (!unit) return [];

  const candidates: CandidateAction[] = [];

  // --- Attack candidates ---
  if (!unit.hasAttacked) {
    const targets = getAttackableTargets(state, unitId);
    for (const targetId of targets) {
      const target = state.units[targetId];
      if (!target) continue;
      const combat = resolveCombat(state, unitId, targetId);
      const action: Action = { type: 'attack', attackerUnitId: unitId, targetUnitId: targetId };

      let score: number;
      if (combat.defenderDestroyed) {
        // Kill shot — highest priority. Score by target value.
        score = 10000 + UNIT_CONFIG[target.type].productionCost;
      } else {
        // Non-lethal attack. Score by net damage advantage.
        const damageDealt = target.hp - combat.defenderHpAfter;
        const damageTaken = unit.hp - combat.attackerHpAfter;
        score = 5000 + (damageDealt - damageTaken) * 100;
      }

      candidates.push({ action, unitId, orderScore: score });
    }
  }

  // --- Move candidates ---
  if (unit.movementPoints > 0) {
    const unitTile = state.tiles[unit.tileId];
    if (unitTile) {
      const reachable = reachableMap(state, unitTile.coord, unit.movementPoints);

      // Build objectives to score moves (phase-aware)
      const offensive = isOffensivePhase(state);
      const objectives = buildObjectives(state, offensive);
      const moveCandidates: CandidateAction[] = [];

      for (const [destId] of reachable) {
        const destTile = state.tiles[destId];
        if (!destTile || destTile.unitId !== null) continue;
        if (destId === unit.tileId) continue;

        const path = findPath(state, unitTile.coord, destTile.coord, unit.movementPoints);
        if (!path || path.length < 2) continue;

        // Score this move by how well it serves the best objective
        let bestObjScore = 0;
        for (const obj of objectives) {
          const utility = computeUtility(unit, obj, state, offensive);
          const distBefore = chebyshevDistance(unitTile.coord, obj.tileCoord);
          const distAfter = chebyshevDistance(destTile.coord, obj.tileCoord);
          if (distAfter < distBefore) {
            bestObjScore = Math.max(bestObjScore, utility * (distBefore - distAfter));
          }
        }

        const action: Action = { type: 'move', unitId, path };
        moveCandidates.push({ action, unitId, orderScore: 1000 + bestObjScore });
      }

      // Sort move candidates and take top ones
      moveCandidates.sort((a, b) => b.orderScore - a.orderScore);
      const moveLimit = Math.max(1, config.maxCandidatesPerUnit - candidates.length - 1); // -1 for hold
      candidates.push(...moveCandidates.slice(0, moveLimit));
    }
  }

  // --- Hold position (always included as baseline) ---
  candidates.push({
    action: { type: 'move', unitId, path: [] },
    unitId,
    orderScore: 0,
  });

  // Sort all candidates by orderScore descending and truncate
  candidates.sort((a, b) => b.orderScore - a.orderScore);
  return candidates.slice(0, config.maxCandidatesPerUnit);
}

/**
 * Sort units by strategic priority: units near enemies first, then by distance to nearest objective.
 */
export function sortUnitsByPriority(units: Unit[], state: GameState): Unit[] {
  const enemyUnits = Object.values(state.units).filter(u => u.owner !== units[0]?.owner);

  return [...units].sort((a, b) => {
    const aTile = state.tiles[a.tileId];
    const bTile = state.tiles[b.tileId];
    if (!aTile || !bTile) return 0;

    // Distance to nearest enemy
    let aMinDist = Infinity;
    let bMinDist = Infinity;
    for (const enemy of enemyUnits) {
      const eTile = state.tiles[enemy.tileId];
      if (!eTile) continue;
      aMinDist = Math.min(aMinDist, chebyshevDistance(aTile.coord, eTile.coord));
      bMinDist = Math.min(bMinDist, chebyshevDistance(bTile.coord, eTile.coord));
    }

    return aMinDist - bMinDist;
  });
}

/**
 * Generate candidate actions for all units belonging to a player.
 * Returns an array of candidate lists, one per unit, sorted by strategic priority.
 * Also generates produce actions for idle cities.
 */
export function generateAllUnitActions(
  state: GameState,
  playerId: PlayerId,
  config: SearchConfig,
): CandidateAction[][] {
  const units = Object.values(state.units).filter(u => u.owner === playerId);
  const sorted = sortUnitsByPriority(units, state);

  const result: CandidateAction[][] = [];

  for (const unit of sorted) {
    result.push(generateCandidateActions(state, unit.id, config));
  }

  // --- Produce actions for idle cities ---
  const produceCandidates: CandidateAction[] = [];
  const funds = state.players[playerId].funds;

  for (const settlement of Object.values(state.settlements)) {
    if (settlement.owner !== playerId || settlement.type !== 'city' || settlement.productionQueue !== null) continue;

    // Generate produce actions for affordable unit types
    for (const unitType of ['infantry', 'scout', 'artillery'] as const) {
      const cost = UNIT_CONFIG[unitType].productionCost;
      if (cost <= funds) {
        const action: Action = { type: 'produce', settlementId: settlement.id, unitType };
        produceCandidates.push({
          action,
          unitId: settlement.id, // use settlement ID as the "unit" for produce actions
          orderScore: 2000 + cost, // higher cost units slightly preferred
        });
      }
    }
  }

  if (produceCandidates.length > 0) {
    produceCandidates.sort((a, b) => b.orderScore - a.orderScore);
    result.push(produceCandidates);
  }

  return result;
}
