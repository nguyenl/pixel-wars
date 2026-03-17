/**
 * src/game/pathfinding.ts
 *
 * Pathfinding algorithms for movement and attack range calculation.
 * - Dijkstra: computes all tiles reachable within a movement budget
 * - A*: finds a path from origin to destination
 */

import type { GameState, TileCoord } from './types';
import { TERRAIN_CONFIG, UNIT_CONFIG } from './constants';
import { tileId, tileCoord, adjacentTiles, manhattanDistance, chebyshevDistance } from './board';

// ---------------------------------------------------------------------------
// Dijkstra — movement range
// ---------------------------------------------------------------------------

/**
 * Compute minimum cost to reach each tile from origin within `budget` MP.
 * Returns a Map of tileId → accumulated cost.
 * Excludes: impassable tiles (water), tiles costing more than budget.
 * Treats friendly units as blocking only the destination (not the path).
 */
export function reachableMap(
  state: GameState,
  origin: TileCoord,
  budget: number,
): Map<string, number> {
  if (budget <= 0) return new Map();

  const dist = new Map<string, number>();
  // Priority queue as sorted array (adequate for ≤400 tiles)
  const queue: Array<{ id: string; cost: number }> = [];

  const startId = tileId(origin.row, origin.col);
  dist.set(startId, 0);
  queue.push({ id: startId, cost: 0 });

  while (queue.length > 0) {
    // Pop minimum cost entry
    queue.sort((a, b) => a.cost - b.cost);
    const { id: curId, cost: curCost } = queue.shift()!;

    if (curCost > (dist.get(curId) ?? Infinity)) continue;

    const curTile = state.tiles[curId];
    if (!curTile) continue;

    const neighbors = adjacentTiles(state.tiles, curTile.coord);
    for (const neighbor of neighbors) {
      const moveCost = TERRAIN_CONFIG[neighbor.terrain].moveCost;
      if (!isFinite(moveCost)) continue; // impassable (water)

      const newCost = curCost + moveCost;
      if (newCost > budget) continue;

      const existingCost = dist.get(neighbor.id);
      if (existingCost === undefined || newCost < existingCost) {
        dist.set(neighbor.id, newCost);
        queue.push({ id: neighbor.id, cost: newCost });
      }
    }
  }

  // Remove origin from result (can't "move" to current position)
  dist.delete(startId);
  return dist;
}

/**
 * Return all tile coordinates reachable by a unit given its remaining MP.
 * Excludes tiles occupied by friendly units.
 */
export function getReachableTiles(state: GameState, unitId: string): TileCoord[] {
  const unit = state.units[unitId];
  if (!unit || unit.movementPoints <= 0) return [];

  const unitTile = state.tiles[unit.tileId];
  if (!unitTile) return [];

  const reachable = reachableMap(state, unitTile.coord, unit.movementPoints);
  const result: TileCoord[] = [];

  for (const [id] of reachable) {
    const tile = state.tiles[id];
    if (!tile) continue;
    // Exclude tiles occupied by any unit (friendly or enemy)
    if (tile.unitId !== null) {
      continue;
    }
    result.push(tile.coord);
  }

  return result;
}

// ---------------------------------------------------------------------------
// A* — point-to-point navigation
// ---------------------------------------------------------------------------

/**
 * Find minimum-cost path from origin to destination, or null if unreachable.
 * Uses Manhattan distance heuristic.
 */
export function findPath(
  state: GameState,
  origin: TileCoord,
  destination: TileCoord,
  budget: number,
): TileCoord[] | null {
  const startId = tileId(origin.row, origin.col);
  const goalId = tileId(destination.row, destination.col);

  if (startId === goalId) return [origin];

  const gScore = new Map<string, number>([[startId, 0]]);
  const fScore = new Map<string, number>([[startId, manhattanDistance(origin, destination)]]);
  const cameFrom = new Map<string, string>();
  const open = new Set<string>([startId]);

  while (open.size > 0) {
    // Get node with lowest fScore
    let curId = '';
    let minF = Infinity;
    for (const id of open) {
      const f = fScore.get(id) ?? Infinity;
      if (f < minF) { minF = f; curId = id; }
    }

    if (curId === goalId) {
      // Reconstruct path
      const path: TileCoord[] = [];
      let node = curId;
      while (node !== startId) {
        path.unshift(tileCoord(node));
        node = cameFrom.get(node)!;
      }
      path.unshift(origin);
      return path;
    }

    open.delete(curId);
    const curTile = state.tiles[curId];
    if (!curTile) continue;

    for (const neighbor of adjacentTiles(state.tiles, curTile.coord)) {
      const moveCost = TERRAIN_CONFIG[neighbor.terrain].moveCost;
      if (!isFinite(moveCost)) continue;

      const tentativeG = (gScore.get(curId) ?? Infinity) + moveCost;
      if (tentativeG > budget) continue;

      if (tentativeG < (gScore.get(neighbor.id) ?? Infinity)) {
        cameFrom.set(neighbor.id, curId);
        gScore.set(neighbor.id, tentativeG);
        fScore.set(neighbor.id, tentativeG + manhattanDistance(neighbor.coord, destination));
        open.add(neighbor.id);
      }
    }
  }

  return null; // No path found
}

// ---------------------------------------------------------------------------
// Attack range
// ---------------------------------------------------------------------------

/**
 * Return IDs of all enemy units attackable by the given unit.
 * Uses Chebyshev distance for range check.
 */
export function getAttackableTargets(state: GameState, unitId: string): string[] {
  const unit = state.units[unitId];
  if (!unit || unit.hasAttacked) return [];

  const unitTile = state.tiles[unit.tileId];
  if (!unitTile) return [];

  const attackRange = UNIT_CONFIG[unit.type].attackRange;
  const targets: string[] = [];

  for (const [enemyId, enemy] of Object.entries(state.units)) {
    if (enemy.owner === unit.owner) continue; // friendly
    const enemyTile = state.tiles[enemy.tileId];
    if (!enemyTile) continue;
    if (chebyshevDistance(unitTile.coord, enemyTile.coord) <= attackRange) {
      targets.push(enemyId);
    }
  }

  return targets;
}
