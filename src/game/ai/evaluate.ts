/**
 * src/game/ai/evaluate.ts
 *
 * Board evaluation function for alpha-beta search.
 * Scores a GameState from the perspective of the given AI player.
 * Positive = AI advantage, negative = opponent advantage.
 */

import type { GameState, PlayerId, EvaluationWeights } from '../types';
import { UNIT_CONFIG, SETTLEMENT_INCOME } from '../constants';
import { chebyshevDistance } from '../board';

/**
 * Evaluate the board position from `aiPlayer`'s perspective.
 * Returns +Infinity for AI victory (opponent has no cities),
 * -Infinity for AI loss (AI has no cities),
 * or a weighted score otherwise.
 */
export function evaluateBoard(
  state: GameState,
  aiPlayer: PlayerId,
  weights: EvaluationWeights,
): number {
  const opponent: PlayerId = aiPlayer === 'player1' ? 'player2' : 'player1';

  // --- Terminal state detection ---
  let aiCities = 0;
  let opponentCities = 0;
  for (const s of Object.values(state.settlements)) {
    if (s.type === 'city') {
      if (s.owner === aiPlayer) aiCities++;
      else if (s.owner === opponent) opponentCities++;
    }
  }
  if (opponentCities === 0) return Infinity;
  if (aiCities === 0) return -Infinity;

  // --- Material score: HP-weighted unit values ---
  let aiMaterial = 0;
  let opponentMaterial = 0;
  const aiUnits: Array<{ tileId: string; hp: number; type: string }> = [];

  for (const unit of Object.values(state.units)) {
    const config = UNIT_CONFIG[unit.type];
    const value = config.productionCost * (unit.hp / config.maxHp);
    if (unit.owner === aiPlayer) {
      aiMaterial += value;
      aiUnits.push({ tileId: unit.tileId, hp: unit.hp, type: unit.type });
    } else {
      opponentMaterial += value;
    }
  }

  const materialScore = (aiMaterial - opponentMaterial) * weights.material;

  // --- Settlement scores ---
  let aiTowns = 0;
  let opponentTowns = 0;
  let aiIncome = 0;
  let opponentIncome = 0;

  for (const s of Object.values(state.settlements)) {
    if (s.owner === aiPlayer) {
      if (s.type === 'town') aiTowns++;
      aiIncome += SETTLEMENT_INCOME[s.type];
    } else if (s.owner === opponent) {
      if (s.type === 'town') opponentTowns++;
      opponentIncome += SETTLEMENT_INCOME[s.type];
    }
  }

  const cityScore = (aiCities - opponentCities) * weights.cityOwnership;
  const townScore = (aiTowns - opponentTowns) * weights.townOwnership;
  const incomeScore = (aiIncome - opponentIncome) * weights.incomeDifferential;

  // --- Threat to enemy cities: AI units near opponent cities ---
  let threatScore = 0;
  const opponentCityTiles: Array<{ row: number; col: number }> = [];
  for (const s of Object.values(state.settlements)) {
    if (s.type === 'city' && s.owner === opponent) {
      const tile = state.tiles[s.tileId];
      if (tile) opponentCityTiles.push(tile.coord);
    }
  }

  for (const aiUnit of aiUnits) {
    const unitTile = state.tiles[aiUnit.tileId];
    if (!unitTile) continue;
    for (const cityCoord of opponentCityTiles) {
      const dist = chebyshevDistance(unitTile.coord, cityCoord);
      if (dist <= 3) {
        threatScore += (4 - dist) * weights.threatToEnemyCities;
      }
    }
  }

  // --- Undefended settlement penalty ---
  let undefendedPenalty = 0;
  for (const s of Object.values(state.settlements)) {
    if (s.owner !== aiPlayer) continue;
    const sTile = state.tiles[s.tileId];
    if (!sTile) continue;
    const hasDefender = aiUnits.some(u => {
      const uTile = state.tiles[u.tileId];
      return uTile && chebyshevDistance(uTile.coord, sTile.coord) <= 1;
    });
    if (!hasDefender) {
      undefendedPenalty += weights.undefendedSettlement;
    }
  }

  // --- Low HP penalty ---
  let lowHpPenalty = 0;
  for (const aiUnit of aiUnits) {
    const maxHp = UNIT_CONFIG[aiUnit.type as keyof typeof UNIT_CONFIG].maxHp;
    if (aiUnit.hp < maxHp * 0.5) {
      lowHpPenalty += weights.lowHpPenalty;
    }
  }

  return materialScore + cityScore + townScore + incomeScore + threatScore + undefendedPenalty + lowHpPenalty;
}
