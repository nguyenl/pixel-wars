/**
 * src/game/ai/ai.ts
 *
 * AI Controller — computes the full sequence of actions for the AI's turn.
 * Uses alpha-beta search with iterative deepening, falling back to greedy
 * objective assignment when time is insufficient.
 */

import type { GameState, Action, Unit } from '../types';
import { UNIT_CONFIG, AI_UPGRADE_THRESHOLD } from '../constants';
import { chebyshevDistance } from '../board';
import { reachableMap, getAttackableTargets, findPath } from '../pathfinding';
import { resolveCombat } from '../combat';
import { validateMove, applyMove, validateAttack, applyAttack, validateProduce, applyProduce, validateUpgrade, applyUpgrade } from '../rules';
import { computeUtility, type Objective } from './scoring';
import { buildObjectives, isOffensivePhase } from './objectives';
import { search, DEFAULT_SEARCH_CONFIG } from './search';

// Re-export for backward compatibility with existing tests and for test imports
export { buildObjectives, isOffensivePhase } from './objectives';

const AI_PLAYER = 'player2' as const;
const HUMAN_PLAYER = 'player1' as const;

// ---------------------------------------------------------------------------
// Known world update
// ---------------------------------------------------------------------------

function updateKnownWorld(state: GameState): GameState {
  const knownWorld = { ...state.aiKnownWorld };
  const aiUnits = Object.values(state.units).filter(u => u.owner === AI_PLAYER);

  for (const unit of aiUnits) {
    const unitTile = state.tiles[unit.tileId];
    if (!unitTile) continue;
    const visionRange = UNIT_CONFIG[unit.type].visionRange;

    for (const [id, tile] of Object.entries(state.tiles)) {
      if (chebyshevDistance(unitTile.coord, tile.coord) <= visionRange) {
        const unitOnTile = tile.unitId ? state.units[tile.unitId] : null;
        knownWorld[id] = {
          lastSeenTurn: state.turn,
          terrain: tile.terrain,
          settlementId: tile.settlementId,
          lastSeenUnit: unitOnTile
            ? { type: unitOnTile.type, owner: unitOnTile.owner }
            : null,
        };
      }
    }
  }

  return { ...state, aiKnownWorld: knownWorld };
}

// ---------------------------------------------------------------------------
// Safe action application for internal state simulation
// ---------------------------------------------------------------------------

function applyActionSafe(state: GameState, action: Action): GameState | null {
  switch (action.type) {
    case 'move': {
      const err = validateMove(state, action);
      if (err) {
        console.warn('[AI] Move rejected:', action, err);
        return null;
      }
      return applyMove(state, action);
    }
    case 'attack': {
      const err = validateAttack(state, action);
      if (err) {
        console.warn('[AI] Attack rejected:', action, err);
        return null;
      }
      return applyAttack(state, action);
    }
    case 'produce': {
      const err = validateProduce(state, action);
      if (err) {
        console.warn('[AI] Produce rejected:', action, err);
        return null;
      }
      return applyProduce(state, action);
    }
    case 'upgrade': {
      const err = validateUpgrade(state, action);
      if (err) {
        console.warn('[AI] Upgrade rejected:', action, err);
        return null;
      }
      return applyUpgrade(state, action);
    }
    case 'end-turn':
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Per-unit decision
// ---------------------------------------------------------------------------

function decideUnitActions(
  unit: Unit,
  state: GameState,
  objective: Objective | null,
): Array<{ action: Action; apply: boolean }> {
  const results: Array<{ action: Action; apply: boolean }> = [];

  const maxHp = UNIT_CONFIG[unit.type].maxHp;
  const isLowHp = unit.hp <= Math.floor(maxHp * 0.25);

  // Check attack targets
  const attackTargets = getAttackableTargets(state, unit.id);

  // Priority 1: Kill shot
  const killTarget = attackTargets.find(targetId => {
    const target = state.units[targetId];
    if (!target) return false;
    const result = resolveCombat(state, unit.id, targetId);
    return result.defenderDestroyed;
  });

  if (killTarget) {
    results.push({
      action: { type: 'attack', attackerUnitId: unit.id, targetUnitId: killTarget },
      apply: true,
    });
    return results;
  }

  // Priority 2: Retreat if low HP
  if (isLowHp) {
    return results; // Wait / retreat (no action)
  }

  // Priority 3: Advantageous attack without moving
  const advantageTarget = attackTargets.find(targetId => {
    const target = state.units[targetId];
    if (!target) return false;
    const result = resolveCombat(state, unit.id, targetId);
    return result.defenderHpAfter < result.attackerHpAfter || unit.type === 'artillery';
  });

  // Priority 4: Move toward objective
  if (objective && unit.movementPoints > 0) {
    const unitTile = state.tiles[unit.tileId];
    if (unitTile) {
      const reachable = reachableMap(state, unitTile.coord, unit.movementPoints);

      let bestTileId = '';
      let bestDist = chebyshevDistance(unitTile.coord, objective.tileCoord);

      for (const [id] of reachable) {
        const tile = state.tiles[id];
        if (!tile) continue;
        if (tile.unitId !== null) {
          const occupant = state.units[tile.unitId];
          if (occupant && occupant.owner === AI_PLAYER) continue;
        }
        const dist = chebyshevDistance(tile.coord, objective.tileCoord);
        if (dist < bestDist) {
          bestDist = dist;
          bestTileId = id;
        }
      }

      if (bestTileId) {
        const destTile = state.tiles[bestTileId];
        if (destTile && destTile.id !== unitTile.id) {
          const path = findPath(state, unitTile.coord, destTile.coord, unit.movementPoints);
          if (path && path.length >= 2) {
            results.push({
              action: { type: 'move', unitId: unit.id, path },
              apply: true,
            });
          }
        }
      }
    }
  }

  // Attack after move (if advantageous target or any target)
  if (advantageTarget) {
    results.push({
      action: { type: 'attack', attackerUnitId: unit.id, targetUnitId: advantageTarget },
      apply: true,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Greedy AI (fallback / heuristic)
// ---------------------------------------------------------------------------

/**
 * Greedy objective-based AI. Used as the heuristic fallback when search
 * time is exhausted. Returns actions WITHOUT the EndTurnAction.
 */
export function computeTurnGreedy(state: GameState): Action[] {
  let currentState = updateKnownWorld(state);
  const allActions: Action[] = [];

  // Upgrade evaluation: upgrade one town if funds are sufficient
  const upgradeAction = evaluateUpgrade(currentState);
  if (upgradeAction) {
    const newState = applyActionSafe(currentState, upgradeAction);
    if (newState) {
      allActions.push(upgradeAction);
      currentState = newState;
    }
  }

  // Production at idle cities
  const ownedIdleCities = Object.values(currentState.settlements).filter(
    s => s.owner === AI_PLAYER && s.type === 'city' && s.productionQueue === null
  );
  let funds = currentState.players[AI_PLAYER].funds;

  const aiUnitCounts = { scout: 0, infantry: 0, artillery: 0 };
  for (const unit of Object.values(currentState.units)) {
    if (unit.owner === AI_PLAYER) aiUnitCounts[unit.type]++;
  }

  for (const city of ownedIdleCities) {
    const cityTile = currentState.tiles[city.tileId];
    if (!cityTile) continue;
    if (funds < 100) break;

    let unitType: 'scout' | 'infantry' | 'artillery';
    if (aiUnitCounts.scout === 0 && funds >= 100) {
      unitType = 'scout';
    } else if (aiUnitCounts.infantry < 2 && funds >= 200) {
      unitType = 'infantry';
    } else if (funds >= 300) {
      unitType = 'artillery';
    } else if (funds >= 200) {
      unitType = 'infantry';
    } else {
      unitType = 'scout';
    }

    const action: Action = { type: 'produce', settlementId: city.id, unitType };
    const newState = applyActionSafe(currentState, action);
    if (newState) {
      allActions.push(action);
      currentState = newState;
      funds = currentState.players[AI_PLAYER].funds;
      aiUnitCounts[unitType]++;
    }
  }

  const offensive = isOffensivePhase(currentState);

  const aiUnits = Object.values(currentState.units)
    .filter(u => u.owner === AI_PLAYER)
    .sort((a, b) => b.hp - a.hp);

  const objectives = buildObjectives(currentState, offensive);
  const claimedObjectives = new Set<string>();

  // In offensive phase, reserve one unit per owned city as a defender
  const aiCityCount = Object.values(currentState.settlements).filter(
    s => s.owner === AI_PLAYER && s.type === 'city',
  ).length;
  const defenderSlots = offensive ? aiCityCount : 0;
  let defendersAssigned = 0;

  for (const unit of aiUnits) {
    const currentUnit = currentState.units[unit.id];
    if (!currentUnit) continue;

    // Determine available objective types based on defender budget
    const unitObjectives = objectives.filter(obj => {
      if (defendersAssigned < defenderSlots && obj.type === 'defend') return true;
      if (obj.type === 'defend') return false;
      return true;
    });

    let bestObjective: Objective | null = null;
    let bestScore = -Infinity;
    for (const obj of unitObjectives) {
      if (claimedObjectives.has(obj.tileId + obj.type)) continue;
      const score = computeUtility(currentUnit, obj, currentState, offensive);
      if (score > bestScore) {
        bestScore = score;
        bestObjective = obj;
      }
    }

    if (bestObjective) {
      claimedObjectives.add(bestObjective.tileId + bestObjective.type);
      if (bestObjective.type === 'defend') defendersAssigned++;
    }

    const decisions = decideUnitActions(currentUnit, currentState, bestObjective);
    for (const { action, apply } of decisions) {
      allActions.push(action);
      if (apply) {
        const newState = applyActionSafe(currentState, action);
        if (newState) currentState = newState;
      }
    }
  }

  return allActions;
}

// ---------------------------------------------------------------------------
// Upgrade evaluation heuristic
// ---------------------------------------------------------------------------

/**
 * Evaluate whether the AI should upgrade a town to a city.
 * Only upgrades if funds >= AI_UPGRADE_THRESHOLD and AI has at least one town.
 * Prioritizes towns when AI has fewer than 2 cities, or towns near enemy territory.
 * Limited to one upgrade per turn.
 */
function evaluateUpgrade(state: GameState): Action | null {
  const aiFunds = state.players[AI_PLAYER].funds;
  if (aiFunds < AI_UPGRADE_THRESHOLD) return null;

  const aiTowns = Object.values(state.settlements).filter(
    s => s.owner === AI_PLAYER && s.type === 'town',
  );
  if (aiTowns.length === 0) return null;

  const aiCityCount = Object.values(state.settlements).filter(
    s => s.owner === AI_PLAYER && s.type === 'city',
  ).length;

  // Find enemy units for proximity scoring
  const enemyUnits = Object.values(state.units).filter(u => u.owner === HUMAN_PLAYER);

  let bestTown = aiTowns[0];
  let bestScore = -Infinity;

  for (const town of aiTowns) {
    let score = 0;
    // Prioritize when AI has fewer than 2 cities
    if (aiCityCount < 2) score += 10;

    // Bonus for towns near enemy territory
    const townTile = state.tiles[town.tileId];
    if (townTile) {
      for (const enemy of enemyUnits) {
        const enemyTile = state.tiles[enemy.tileId];
        if (enemyTile) {
          const dist = chebyshevDistance(townTile.coord, enemyTile.coord);
          if (dist < 8) score += (8 - dist);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTown = town;
    }
  }

  return { type: 'upgrade', settlementId: bestTown.id };
}

// ---------------------------------------------------------------------------
// Main AI entry point
// ---------------------------------------------------------------------------

/**
 * Compute all actions for the AI player's turn.
 * Uses alpha-beta search with iterative deepening.
 * Falls back to greedy objective assignment if search time is exhausted.
 * Returns an ordered list ending with EndTurnAction.
 */
export function computeTurn(state: GameState): Action[] {
  let currentState = updateKnownWorld(state);
  const allActions: Action[] = [];

  // Evaluate upgrade before search (strategic decision, not tactical)
  const upgradeAction = evaluateUpgrade(currentState);
  if (upgradeAction) {
    const newState = applyActionSafe(currentState, upgradeAction);
    if (newState) {
      allActions.push(upgradeAction);
      currentState = newState;
    }
  }

  const result = search(currentState, DEFAULT_SEARCH_CONFIG);
  allActions.push(...result.bestActions);
  allActions.push({ type: 'end-turn' });
  return allActions;
}
