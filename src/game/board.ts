/**
 * src/game/board.ts
 *
 * Grid utilities: coordinate transforms, adjacency, and distance functions.
 * No PixiJS imports. Pure functions operating on game state data.
 */

import type { Tile, TileCoord } from './types';

/** Encode a grid coordinate as a tile ID string. */
export function tileId(row: number, col: number): string {
  return `${row},${col}`;
}

/** Decode a tile ID string back to a grid coordinate. */
export function tileCoord(id: string): TileCoord {
  const [rowStr, colStr] = id.split(',');
  return { row: parseInt(rowStr, 10), col: parseInt(colStr, 10) };
}

/**
 * Return all tiles orthogonally and diagonally adjacent to `coord`
 * that exist in the grid (i.e., within map bounds).
 */
export function adjacentTiles(grid: Record<string, Tile>, coord: TileCoord): Tile[] {
  const { row, col } = coord;
  const result: Tile[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const id = tileId(row + dr, col + dc);
      const tile = grid[id];
      if (tile !== undefined) {
        result.push(tile);
      }
    }
  }
  return result;
}

/**
 * Chebyshev (8-directional) distance between two grid coordinates.
 * This is the vision-range metric: a unit with visionRange=2 sees
 * all tiles where chebyshevDistance ≤ 2.
 */
export function chebyshevDistance(a: TileCoord, b: TileCoord): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

/**
 * Manhattan (4-directional) distance between two grid coordinates.
 * Used as the A* heuristic for pathfinding.
 */
export function manhattanDistance(a: TileCoord, b: TileCoord): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}
