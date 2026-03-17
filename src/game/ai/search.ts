/**
 * src/game/ai/search.ts
 *
 * Alpha-beta search with iterative deepening and time budget.
 * Sequential unit decisions: each unit's action choice = one level in the tree.
 */

import type { GameState, PlayerId, Action, SearchConfig, SearchResult } from '../types';
import { AI_TIME_BUDGET_MS, AI_MAX_CANDIDATES, DEFAULT_EVALUATION_WEIGHTS, UNIT_CONFIG } from '../constants';
import { evaluateBoard } from './evaluate';
import { generateCandidateActions, generateAllUnitActions } from './movegen';
import { applyAction } from '../state';

const AI_PLAYER: PlayerId = 'player2';

/** Default search configuration */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  timeBudgetMs: AI_TIME_BUDGET_MS,
  maxDepth: 20,
  maxCandidatesPerUnit: AI_MAX_CANDIDATES,
  evaluationWeights: DEFAULT_EVALUATION_WEIGHTS,
};

export interface AlphaBetaResult {
  score: number;
  actions: Action[];
  nodesEvaluated: number;
}

/**
 * Alpha-beta minimax search with sequential unit decisions.
 */
export function alphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: PlayerId,
  config: SearchConfig,
  deadline: number,
): AlphaBetaResult {
  // Time check
  if (performance.now() >= deadline) {
    return { score: evaluateBoard(state, aiPlayer, config.evaluationWeights), actions: [], nodesEvaluated: 1 };
  }

  // Terminal state or depth limit → evaluate
  if (depth <= 0 || state.phase === 'victory') {
    return { score: evaluateBoard(state, aiPlayer, config.evaluationWeights), actions: [], nodesEvaluated: 1 };
  }

  const opponent: PlayerId = aiPlayer === 'player1' ? 'player2' : 'player1';
  const currentPlayer = isMaximizing ? aiPlayer : opponent;

  // Get actionable units for this side
  const units = Object.values(state.units)
    .filter(u => u.owner === currentPlayer && (u.movementPoints > 0 || !u.hasAttacked));

  if (units.length === 0) {
    // No actionable units — switch sides with reduced depth
    if (isMaximizing) {
      return alphaBeta(state, depth - 1, alpha, beta, false, aiPlayer, config, deadline);
    }
    return { score: evaluateBoard(state, aiPlayer, config.evaluationWeights), actions: [], nodesEvaluated: 1 };
  }

  // Process units sequentially
  return processUnit(state, depth, alpha, beta, isMaximizing, aiPlayer, units, 0, config, deadline);
}

/**
 * Process one unit at a time through the search tree.
 */
function processUnit(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: PlayerId,
  units: Array<{ id: string; owner: PlayerId }>,
  unitIndex: number,
  config: SearchConfig,
  deadline: number,
): AlphaBetaResult {
  if (performance.now() >= deadline) {
    return { score: evaluateBoard(state, aiPlayer, config.evaluationWeights), actions: [], nodesEvaluated: 1 };
  }

  // All units processed → switch sides
  if (unitIndex >= units.length) {
    if (isMaximizing) {
      return alphaBeta(state, depth - 1, alpha, beta, false, aiPlayer, config, deadline);
    } else {
      return alphaBeta(state, depth - 1, alpha, beta, true, aiPlayer, config, deadline);
    }
  }

  const unit = state.units[units[unitIndex].id];
  if (!unit) {
    // Unit was destroyed — skip
    return processUnit(state, depth, alpha, beta, isMaximizing, aiPlayer, units, unitIndex + 1, config, deadline);
  }

  const candidates = generateCandidateActions(state, unit.id, config);
  if (candidates.length === 0) {
    return processUnit(state, depth, alpha, beta, isMaximizing, aiPlayer, units, unitIndex + 1, config, deadline);
  }

  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestActions: Action[] = [];
  let totalNodes = 0;

  for (const candidate of candidates) {
    if (performance.now() >= deadline) break;

    // Hold position (empty path) — skip to next unit without state change
    if (candidate.action.type === 'move' && candidate.action.path.length === 0) {
      const result = processUnit(state, depth, alpha, beta, isMaximizing, aiPlayer, units, unitIndex + 1, config, deadline);
      totalNodes += result.nodesEvaluated;

      if (isMaximizing ? result.score > bestScore : result.score < bestScore) {
        bestScore = result.score;
        bestActions = result.actions;
      }

      if (isMaximizing) {
        alpha = Math.max(alpha, bestScore);
      } else {
        beta = Math.min(beta, bestScore);
      }
      if (alpha >= beta) break;
      continue;
    }

    // Apply the action
    const applied = applyAction(state, candidate.action);
    if (!applied.ok) continue;

    totalNodes++;
    const result = processUnit(applied.state, depth, alpha, beta, isMaximizing, aiPlayer, units, unitIndex + 1, config, deadline);
    totalNodes += result.nodesEvaluated;

    if (isMaximizing ? result.score > bestScore : result.score < bestScore) {
      bestScore = result.score;
      bestActions = [candidate.action, ...result.actions];
    }

    if (isMaximizing) {
      alpha = Math.max(alpha, bestScore);
    } else {
      beta = Math.min(beta, bestScore);
    }
    if (alpha >= beta) break;
  }

  // If no candidates were evaluated, skip this unit
  if (bestScore === (isMaximizing ? -Infinity : Infinity)) {
    return processUnit(state, depth, alpha, beta, isMaximizing, aiPlayer, units, unitIndex + 1, config, deadline);
  }

  return { score: bestScore, actions: bestActions, nodesEvaluated: totalNodes };
}

/**
 * Iterative deepening search with time budget.
 */
export function search(state: GameState, config: SearchConfig): SearchResult {
  const startTime = performance.now();
  const deadline = startTime + config.timeBudgetMs;

  const aiUnits = Object.values(state.units).filter(u => u.owner === AI_PLAYER);

  // Handle produce actions up front (outside the search tree)
  const produceActions: Action[] = [];
  let searchState = state;
  for (const settlement of Object.values(state.settlements)) {
    if (settlement.owner !== AI_PLAYER || settlement.type !== 'city' || settlement.productionQueue !== null) continue;
    const funds = searchState.players[AI_PLAYER].funds;

    const unitCounts = { scout: 0, infantry: 0, artillery: 0 };
    for (const unit of Object.values(searchState.units)) {
      if (unit.owner === AI_PLAYER) unitCounts[unit.type]++;
    }

    let unitType: 'scout' | 'infantry' | 'artillery' | null = null;
    if (unitCounts.scout === 0 && funds >= 100) unitType = 'scout';
    else if (unitCounts.infantry < 2 && funds >= 200) unitType = 'infantry';
    else if (funds >= 300) unitType = 'artillery';
    else if (funds >= 200) unitType = 'infantry';
    else if (funds >= 100) unitType = 'scout';

    if (unitType) {
      const action: Action = { type: 'produce', settlementId: settlement.id, unitType };
      const applied = applyAction(searchState, action);
      if (applied.ok) {
        searchState = applied.state;
        produceActions.push(action);
      }
    }
  }

  if (aiUnits.length === 0) {
    return {
      bestActions: produceActions,
      searchDepth: 0,
      nodesEvaluated: 0,
      timeElapsedMs: performance.now() - startTime,
      usedFallback: produceActions.length === 0,
    };
  }

  if (performance.now() >= deadline) {
    const fallback = heuristicFallback(searchState);
    return {
      bestActions: [...produceActions, ...fallback],
      searchDepth: 0,
      nodesEvaluated: 0,
      timeElapsedMs: performance.now() - startTime,
      usedFallback: true,
    };
  }

  let bestActions: Action[] = [];
  let bestDepth = 0;
  let totalNodes = 0;

  for (let depth = 1; depth <= config.maxDepth; depth++) {
    if (performance.now() >= deadline) break;

    const result = alphaBeta(searchState, depth, -Infinity, Infinity, true, AI_PLAYER, config, deadline);
    totalNodes += result.nodesEvaluated;

    // Accept result if this iteration completed or it's the first depth
    if (performance.now() < deadline || depth === 1) {
      // Filter out hold-position no-ops
      bestActions = result.actions.filter(a => !(a.type === 'move' && a.path.length === 0));
      bestDepth = depth;
    }

    if (result.score === Infinity || result.score === -Infinity) break;
  }

  const usedFallback = bestActions.length === 0 && aiUnits.length > 0;
  if (usedFallback) {
    bestActions = heuristicFallback(searchState);
  }

  return {
    bestActions: [...produceActions, ...bestActions],
    searchDepth: bestDepth,
    nodesEvaluated: totalNodes,
    timeElapsedMs: performance.now() - startTime,
    usedFallback,
  };
}

/**
 * Heuristic fallback: pick the highest-scored candidate action for each unit.
 * Used when search can't complete even depth 1.
 */
export function heuristicFallback(state: GameState): Action[] {
  const allUnitActions = generateAllUnitActions(state, AI_PLAYER, DEFAULT_SEARCH_CONFIG);
  const actions: Action[] = [];

  for (const unitCandidates of allUnitActions) {
    if (unitCandidates.length === 0) continue;
    // Pick the top candidate (highest orderScore)
    const best = unitCandidates[0];
    // Skip hold-position no-ops
    if (best.action.type === 'move' && best.action.path.length === 0) continue;
    // Apply to check validity
    const applied = applyAction(state, best.action);
    if (applied.ok) {
      actions.push(best.action);
    }
  }

  return actions;
}
