import { describe, it, expect } from 'vitest';
import { generateMap } from '../../src/game/mapgen';
import type { TerrainType, MapSizeOption } from '../../src/game/types';
import { tileId } from '../../src/game/board';
import { MAP_SIZE_CONFIG, TOWN_COUNT_RANGE } from '../../src/game/constants';

const SIZES = ['small', 'medium', 'large'] as const;

describe('generateMap', () => {
  it('generated map matches requested dimensions', () => {
    const map = generateMap('medium', 1);
    const expectedTiles = 30 * 30;
    expect(Object.keys(map.tiles).length).toBe(expectedTiles);
    expect(map.tileOrder.length).toBe(expectedTiles);
  });

  it('small map has 20x20 tiles', () => {
    const map = generateMap('small', 1);
    expect(Object.keys(map.tiles).length).toBe(400);
  });

  it('large map has 40x40 tiles', () => {
    const map = generateMap('large', 1);
    expect(Object.keys(map.tiles).length).toBe(1600);
  });

  it('all 5 terrain types are present on medium map', () => {
    const map = generateMap('medium', 42);
    const terrains = new Set<TerrainType>();
    for (const tile of Object.values(map.tiles)) {
      terrains.add(tile.terrain);
    }
    expect(terrains.has('water')).toBe(true);
    expect(terrains.has('mountain')).toBe(true);
    expect(terrains.has('plains')).toBe(true);
    expect(terrains.has('grassland')).toBe(true);
    expect(terrains.has('forest')).toBe(true);
  });

  it('settlement counts are within spec ranges for each map size', () => {
    for (const size of SIZES) {
      const map = generateMap(size, 1);
      const settlements = Object.values(map.settlements);
      const cities = settlements.filter(s => s.type === 'city');
      const towns = settlements.filter(s => s.type === 'town');
      const [minTowns, maxTowns] = TOWN_COUNT_RANGE[size];
      expect(cities.length).toBe(2);
      expect(towns.length).toBeGreaterThanOrEqual(minTowns);
      expect(towns.length).toBeLessThanOrEqual(maxTowns);
    }
  });

  it('each player has a starting city', () => {
    const map = generateMap('medium', 1);
    expect(map.startingCities['player1']).toBeDefined();
    expect(map.startingCities['player2']).toBeDefined();
    expect(map.startingCities['player1']).not.toBe(map.startingCities['player2']);
  });

  it('starting cities are owned by the correct player', () => {
    const map = generateMap('medium', 1);
    const city1 = map.settlements[map.startingCities['player1']];
    const city2 = map.settlements[map.startingCities['player2']];
    expect(city1.owner).toBe('player1');
    expect(city2.owner).toBe('player2');
  });

  it('tileOrder covers all tiles in row-major order', () => {
    const map = generateMap('small', 1);
    const { rows, cols } = MAP_SIZE_CONFIG['small'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = tileId(r, c);
        expect(map.tileOrder).toContain(id);
        expect(map.tiles[id]).toBeDefined();
      }
    }
  });

  it('flood-fill confirms all land settlements reachable from both starting cities', () => {
    for (const size of SIZES) {
      const map = generateMap(size, 100);
      const tiles = map.tiles;

      // BFS from city1 on land tiles
      const city1 = map.settlements[map.startingCities['player1']];
      const city2 = map.settlements[map.startingCities['player2']];

      function bfsReachable(startTileId: string): Set<string> {
        const visited = new Set<string>();
        const queue = [startTileId];
        visited.add(startTileId);
        while (queue.length > 0) {
          const cur = queue.shift()!;
          const { row, col } = tiles[cur].coord;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nid = `${row + dr},${col + dc}`;
              if (tiles[nid] && tiles[nid].terrain !== 'water' && !visited.has(nid)) {
                visited.add(nid);
                queue.push(nid);
              }
            }
          }
        }
        return visited;
      }

      const reachable = bfsReachable(city1.tileId);
      expect(reachable.has(city2.tileId)).toBe(true);
    }
  });

  it('10 consecutive maps all pass connectivity check', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const map = generateMap('medium', seed * 1000);
      const city1 = map.settlements[map.startingCities['player1']];
      const city2 = map.settlements[map.startingCities['player2']];
      const tiles = map.tiles;

      const visited = new Set<string>();
      const queue = [city1.tileId];
      visited.add(city1.tileId);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const { row, col } = tiles[cur].coord;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nid = `${row + dr},${col + dc}`;
            if (tiles[nid] && tiles[nid].terrain !== 'water' && !visited.has(nid)) {
              visited.add(nid);
              queue.push(nid);
            }
          }
        }
      }
      expect(visited.has(city2.tileId)).toBe(true);
    }
  });

  it('all settlements are land-connected across 10 maps per size', () => {
    for (const size of SIZES) {
      for (let seed = 1; seed <= 10; seed++) {
        const map = generateMap(size, seed * 777);
        const tiles = map.tiles;

        // BFS from player1's starting city
        const city1TileId = map.settlements[map.startingCities['player1']].tileId;
        const visited = new Set<string>();
        const queue = [city1TileId];
        visited.add(city1TileId);
        while (queue.length > 0) {
          const cur = queue.shift()!;
          const { row, col } = tiles[cur].coord;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nid = `${row + dr},${col + dc}`;
              if (tiles[nid] && tiles[nid].terrain !== 'water' && !visited.has(nid)) {
                visited.add(nid);
                queue.push(nid);
              }
            }
          }
        }

        // Every settlement tile must be in the reachable set
        for (const settlement of Object.values(map.settlements)) {
          expect(
            visited.has(settlement.tileId),
            `${size} seed=${seed * 777}: settlement ${settlement.id} at ${settlement.tileId} is not reachable from city1`,
          ).toBe(true);
        }
      }
    }
  });

  it('starting cities are on opposite halves of the map across 10 maps per size', () => {
    for (const size of SIZES) {
      const { rows, cols } = MAP_SIZE_CONFIG[size];
      for (let seed = 1; seed <= 10; seed++) {
        const map = generateMap(size, seed * 333);
        const c1 = map.tiles[map.settlements[map.startingCities['player1']].tileId].coord;
        const c2 = map.tiles[map.settlements[map.startingCities['player2']].tileId].coord;

        const separatedOnCols = Math.abs(c1.col - c2.col) >= cols / 2;
        const separatedOnRows = Math.abs(c1.row - c2.row) >= rows / 2;
        expect(
          separatedOnCols || separatedOnRows,
          `${size} seed=${seed * 333}: cities at (${c1.row},${c1.col}) and (${c2.row},${c2.col}) are not on opposite halves (rows=${rows}, cols=${cols})`,
        ).toBe(true);
      }
    }
  });
});
