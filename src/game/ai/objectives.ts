/**
 * src/game/ai/objectives.ts
 *
 * Objective building for AI decision-making.
 * Extracted from ai.ts to avoid circular dependencies with search.ts.
 */

import type { GameState } from '../types';
import { adjacentTiles, tileId as makeTileId, chebyshevDistance } from '../board';
import { SETTLEMENT_INCOME } from '../constants';
import { type Objective } from './scoring';

const AI_PLAYER = 'player2' as const;
const HUMAN_PLAYER = 'player1' as const;

// ---------------------------------------------------------------------------
// AI Phase computation (lives here to avoid circular deps: ai→search→movegen→ai)
// ---------------------------------------------------------------------------

/**
 * Returns true when the AI should enter offensive mode.
 * Both conditions must hold simultaneously:
 * 1. AI income per turn > player income per turn
 * 2. AI living unit count > player living unit count
 */
export function isOffensivePhase(state: GameState): boolean {
  let aiIncome = 0;
  let playerIncome = 0;
  let aiUnits = 0;
  let playerUnits = 0;

  for (const s of Object.values(state.settlements)) {
    if (s.owner === AI_PLAYER) aiIncome += SETTLEMENT_INCOME[s.type];
    else if (s.owner === HUMAN_PLAYER) playerIncome += SETTLEMENT_INCOME[s.type];
  }

  for (const u of Object.values(state.units)) {
    if (u.owner === AI_PLAYER) aiUnits++;
    else if (u.owner === HUMAN_PLAYER) playerUnits++;
  }

  return aiIncome > playerIncome && aiUnits > playerUnits;
}

/** Radius within which a player unit triggers a block-capture objective for a settlement. */
const BLOCK_CAPTURE_RADIUS = 3;

/**
 * Build a list of objectives for the AI to pursue.
 *
 * With omniscient vision, all player units and settlements are read directly
 * from state (no fog filtering via aiKnownWorld).
 *
 * When `offensive` is true (AI income > player income AND AI units > player units),
 * enemy city/unit objectives take priority. When false, the AI focuses on
 * expansion and blocking player captures.
 */
export function buildObjectives(state: GameState, offensive = false): Objective[] {
  const objectives: Objective[] = [];

  // --- Omniscient enemy unit targets (always visible) ---
  for (const [id, unit] of Object.entries(state.units)) {
    if (unit.owner !== HUMAN_PLAYER) continue;
    const tile = state.tiles[unit.tileId];
    if (!tile) continue;
    objectives.push({
      type: 'enemy-unit',
      tileCoord: tile.coord,
      tileId: tile.id,
      enemyUnitId: id,
    });
  }

  // --- Settlements: neutral + enemy (fully omniscient) ---
  for (const settlement of Object.values(state.settlements)) {
    if (settlement.owner === AI_PLAYER) continue;
    const tile = state.tiles[settlement.tileId];
    if (!tile) continue;
    objectives.push({
      type: offensive ? 'settlement' : 'settlement',
      tileCoord: tile.coord,
      tileId: tile.id,
      settlementId: settlement.id,
    });
  }

  // --- Block-capture objectives (expansion phase priority) ---
  // For each non-AI settlement, check if any player unit is within BLOCK_CAPTURE_RADIUS.
  if (!offensive) {
    for (const settlement of Object.values(state.settlements)) {
      if (settlement.owner === AI_PLAYER) continue;
      const settleTile = state.tiles[settlement.tileId];
      if (!settleTile) continue;

      const playerNearby = Object.values(state.units).some(u => {
        if (u.owner !== HUMAN_PLAYER) return false;
        const unitTile = state.tiles[u.tileId];
        if (!unitTile) return false;
        return chebyshevDistance(unitTile.coord, settleTile.coord) <= BLOCK_CAPTURE_RADIUS;
      });

      if (playerNearby) {
        objectives.push({
          type: 'block-capture',
          tileCoord: settleTile.coord,
          tileId: settleTile.id,
          settlementId: settlement.id,
        });
      }
    }
  }

  // --- Defend objectives (offensive phase: keep one unit per city near own territory) ---
  if (offensive) {
    const aiCities = Object.values(state.settlements).filter(
      s => s.owner === AI_PLAYER && s.type === 'city',
    );
    for (const city of aiCities) {
      const tile = state.tiles[city.tileId];
      if (!tile) continue;
      objectives.push({
        type: 'defend',
        tileCoord: tile.coord,
        tileId: tile.id,
        settlementId: city.id,
      });
    }
  }

  // --- Exploration objectives (boundary tiles) ---
  const boundaryTiles: Array<{ tileId: string; coord: { row: number; col: number } }> = [];
  for (const [id, known] of Object.entries(state.aiKnownWorld)) {
    if (known.terrain === 'water') continue;
    const tile = state.tiles[id];
    if (!tile) continue;
    const neighbors = adjacentTiles(state.tiles, tile.coord);
    const hasUnknownNeighbor = neighbors.some(n => !state.aiKnownWorld[n.id]);
    if (hasUnknownNeighbor) {
      boundaryTiles.push({ tileId: id, coord: tile.coord });
    }
  }

  if (boundaryTiles.length > 0) {
    const step = Math.max(1, Math.floor(boundaryTiles.length / 5));
    for (let i = 0; i < boundaryTiles.length && objectives.filter(o => o.type === 'explore').length < 5; i += step) {
      const bt = boundaryTiles[i];
      objectives.push({
        type: 'explore',
        tileCoord: bt.coord,
        tileId: bt.tileId,
      });
    }
  } else {
    const { rows, cols } = state.mapSize;
    const quadrants = [
      { row: Math.floor(rows * 0.25), col: Math.floor(cols * 0.25) },
      { row: Math.floor(rows * 0.25), col: Math.floor(cols * 0.75) },
      { row: Math.floor(rows * 0.75), col: Math.floor(cols * 0.25) },
      { row: Math.floor(rows * 0.75), col: Math.floor(cols * 0.75) },
    ];
    for (const coord of quadrants) {
      const id = makeTileId(coord.row, coord.col);
      const tile = state.tiles[id];
      if (tile && tile.terrain !== 'water' && !state.aiKnownWorld[id]) {
        objectives.push({ type: 'explore', tileCoord: coord, tileId: id });
      }
    }
  }

  return objectives;
}
