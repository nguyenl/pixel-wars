import { describe, it, expect } from 'vitest';
import { tileId, tileCoord, adjacentTiles, chebyshevDistance, manhattanDistance } from '../../src/game/board';
import type { Tile, TileCoord } from '../../src/game/types';

function makeTile(row: number, col: number): Tile {
  return {
    id: tileId(row, col),
    coord: { row, col },
    terrain: 'plains',
    settlementId: null,
    unitId: null,
  };
}

function makeGrid(rows: number, cols: number): Record<string, Tile> {
  const grid: Record<string, Tile> = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = tileId(r, c);
      grid[id] = makeTile(r, c);
    }
  }
  return grid;
}

describe('tileId', () => {
  it('encodes row and col into a string', () => {
    expect(tileId(0, 0)).toBe('0,0');
    expect(tileId(3, 7)).toBe('3,7');
    expect(tileId(10, 15)).toBe('10,15');
  });
});

describe('tileCoord', () => {
  it('round-trips with tileId', () => {
    const coords: TileCoord[] = [
      { row: 0, col: 0 },
      { row: 5, col: 9 },
      { row: 14, col: 14 },
    ];
    for (const c of coords) {
      expect(tileCoord(tileId(c.row, c.col))).toEqual(c);
    }
  });
});

describe('adjacentTiles', () => {
  const grid = makeGrid(5, 5);

  it('returns 8 neighbours for an interior tile', () => {
    const adj = adjacentTiles(grid, { row: 2, col: 2 });
    expect(adj.length).toBe(8);
  });

  it('returns 3 neighbours for a corner tile', () => {
    const adj = adjacentTiles(grid, { row: 0, col: 0 });
    expect(adj.length).toBe(3);
  });

  it('returns 5 neighbours for an edge tile', () => {
    const adj = adjacentTiles(grid, { row: 0, col: 2 });
    expect(adj.length).toBe(5);
  });

  it('all returned tiles are valid (exist in grid)', () => {
    const adj = adjacentTiles(grid, { row: 1, col: 1 });
    for (const tile of adj) {
      expect(grid[tile.id]).toBeDefined();
    }
  });

  it('does not include the origin tile', () => {
    const adj = adjacentTiles(grid, { row: 2, col: 2 });
    const hasOrigin = adj.some(t => t.coord.row === 2 && t.coord.col === 2);
    expect(hasOrigin).toBe(false);
  });
});

describe('chebyshevDistance', () => {
  it('returns 0 for same coordinate', () => {
    expect(chebyshevDistance({ row: 3, col: 3 }, { row: 3, col: 3 })).toBe(0);
  });

  it('returns 1 for orthogonal and diagonal neighbours', () => {
    expect(chebyshevDistance({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(1);
    expect(chebyshevDistance({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(1);
  });

  it('is symmetric', () => {
    const a: TileCoord = { row: 2, col: 5 };
    const b: TileCoord = { row: 7, col: 1 };
    expect(chebyshevDistance(a, b)).toBe(chebyshevDistance(b, a));
  });

  it('returns max(|dr|, |dc|)', () => {
    expect(chebyshevDistance({ row: 0, col: 0 }, { row: 3, col: 5 })).toBe(5);
    expect(chebyshevDistance({ row: 0, col: 0 }, { row: 4, col: 2 })).toBe(4);
  });
});

describe('manhattanDistance', () => {
  it('returns 0 for same coordinate', () => {
    expect(manhattanDistance({ row: 2, col: 2 }, { row: 2, col: 2 })).toBe(0);
  });

  it('returns |dr| + |dc|', () => {
    expect(manhattanDistance({ row: 0, col: 0 }, { row: 3, col: 4 })).toBe(7);
    expect(manhattanDistance({ row: 1, col: 1 }, { row: 4, col: 1 })).toBe(3);
  });

  it('is symmetric', () => {
    const a: TileCoord = { row: 0, col: 5 };
    const b: TileCoord = { row: 3, col: 0 };
    expect(manhattanDistance(a, b)).toBe(manhattanDistance(b, a));
  });
});
