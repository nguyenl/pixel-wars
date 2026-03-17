/**
 * src/game/fog.ts
 *
 * Fog of war computation.
 * Recomputes a player's FogMap based on current unit positions using
 * Chebyshev distance (8-directional) for vision range.
 */

import type { GameState, PlayerId, FogMap } from './types';
import { UNIT_CONFIG, SETTLEMENT_VISION } from './constants';
import { chebyshevDistance } from './board';

/**
 * Recompute the fog map for a given player.
 * - Tiles within any friendly unit's visionRange → 'visible'
 * - Previously 'visible' tiles now out of range → 'explored'
 * - 'explored' tiles never revert to 'hidden'
 */
export function recomputeFog(state: GameState, playerId: PlayerId): FogMap {
  const previousFog = state.fog[playerId];
  const newFog: FogMap = {};

  // Start from previous fog state: visible → explored, explored/hidden unchanged
  for (const [tileId, fogState] of Object.entries(previousFog)) {
    newFog[tileId] = fogState === 'visible' ? 'explored' : fogState;
  }

  // Apply vision from each friendly unit
  const friendlyUnits = Object.values(state.units).filter(u => u.owner === playerId);

  for (const unit of friendlyUnits) {
    const unitTile = state.tiles[unit.tileId];
    if (!unitTile) continue;

    const visionRange = UNIT_CONFIG[unit.type].visionRange;

    // Sweep all tiles within Chebyshev distance
    for (const [tileId, tile] of Object.entries(state.tiles)) {
      if (chebyshevDistance(unitTile.coord, tile.coord) <= visionRange) {
        newFog[tileId] = 'visible';
      }
    }
  }

  // Apply vision from owned settlements
  for (const settlement of Object.values(state.settlements)) {
    if (settlement.owner !== playerId) continue;
    const settTile = state.tiles[settlement.tileId];
    if (!settTile) continue;
    const range = SETTLEMENT_VISION[settlement.type];
    for (const [tid, tile] of Object.entries(state.tiles)) {
      if (chebyshevDistance(settTile.coord, tile.coord) <= range) {
        newFog[tid] = 'visible';
      }
    }
  }

  return newFog;
}
