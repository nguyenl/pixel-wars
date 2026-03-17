/**
 * src/game/ai/objectives.ts
 *
 * Objective building for AI decision-making.
 * Extracted from ai.ts to avoid circular dependencies with search.ts.
 */

import type { GameState } from '../types';
import { adjacentTiles, tileId as makeTileId } from '../board';
import { type Objective } from './scoring';

const AI_PLAYER = 'player2' as const;
const HUMAN_PLAYER = 'player1' as const;

/**
 * Build a list of objectives for the AI to pursue.
 * When `aggressive` is true, includes known player settlements from AI memory.
 */
export function buildObjectives(state: GameState, aggressive = false): Objective[] {
  const objectives: Objective[] = [];

  // Enemy units as targets
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

  // Unowned settlements (neutral)
  for (const settlement of Object.values(state.settlements)) {
    if (settlement.owner === AI_PLAYER) continue;
    const tile = state.tiles[settlement.tileId];
    if (!tile) continue;
    objectives.push({
      type: 'settlement',
      tileCoord: tile.coord,
      tileId: tile.id,
      settlementId: settlement.id,
    });
  }

  // In aggression mode, also add known player settlements from AI's memory
  if (aggressive) {
    for (const [tileIdKey, known] of Object.entries(state.aiKnownWorld)) {
      if (!known.settlementId) continue;
      const settlement = state.settlements[known.settlementId];
      if (!settlement || settlement.owner !== HUMAN_PLAYER) continue;
      if (objectives.some(o => o.settlementId === settlement.id)) continue;
      const tile = state.tiles[tileIdKey];
      if (!tile) continue;
      objectives.push({
        type: 'settlement',
        tileCoord: tile.coord,
        tileId: tile.id,
        settlementId: settlement.id,
      });
    }
  }

  // Exploration objectives: known tiles bordering unknown territory
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
