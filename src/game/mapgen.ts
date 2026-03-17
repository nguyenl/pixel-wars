/**
 * src/game/mapgen.ts
 *
 * Procedural map generator.
 * Uses Simplex noise for terrain, Poisson-disk-lite for settlements,
 * and flood-fill to guarantee land connectivity between starting cities.
 */

import { createNoise2D } from 'simplex-noise';
import type {
  MapSizeOption,
  TerrainType,
  Tile,
  Settlement,
  PlayerId,
  GeneratedMap,
} from './types';
import { MapGenerationError } from './types';
import { MAP_SIZE_CONFIG, MAX_GEN_ATTEMPTS, TOWN_COUNT_RANGE, MIN_SETTLEMENT_DISTANCE, TERRAIN_THRESHOLDS } from './constants';
import { mulberry32 } from '../utils/rng';
import { tileId, chebyshevDistance } from './board';

// ---------------------------------------------------------------------------
// Terrain generation
// ---------------------------------------------------------------------------

function noiseValueToTerrain(value: number): TerrainType {
  // value is in [0, 1] (normalized from [-1, 1] noise)
  if (value < TERRAIN_THRESHOLDS.water)    return 'water';
  if (value < TERRAIN_THRESHOLDS.mountain) return 'mountain';
  if (value < TERRAIN_THRESHOLDS.plains)   return 'plains';
  if (value < TERRAIN_THRESHOLDS.grassland) return 'grassland';
  return 'forest';
}

function generateTiles(
  rows: number,
  cols: number,
  noise: (x: number, y: number) => number,
  scale = 0.10,
): Record<string, Tile> {
  const tiles: Record<string, Tile> = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const raw = noise(c * scale, r * scale); // in [-1, 1]
      const normalized = (raw + 1) / 2;        // in [0, 1]
      const terrain = noiseValueToTerrain(normalized);
      const id = tileId(r, c);
      tiles[id] = {
        id,
        coord: { row: r, col: c },
        terrain,
        settlementId: null,
        unitId: null,
      };
    }
  }
  return tiles;
}

// ---------------------------------------------------------------------------
// Connectivity check (flood fill from a starting tile on land)
// ---------------------------------------------------------------------------

function floodFillLand(tiles: Record<string, Tile>, startId: string): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startId];
  visited.add(startId);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const { row, col } = tiles[cur].coord;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nid = tileId(row + dr, col + dc);
        if (tiles[nid] && tiles[nid].terrain !== 'water' && !visited.has(nid)) {
          visited.add(nid);
          queue.push(nid);
        }
      }
    }
  }
  return visited;
}

// ---------------------------------------------------------------------------
// Settlement placement (Poisson-disk-lite)
// ---------------------------------------------------------------------------

function candidateLandTiles(tiles: Record<string, Tile>): Tile[] {
  return Object.values(tiles).filter(
    t => t.terrain !== 'water' && t.terrain !== 'mountain'
  );
}

function tooClose(
  coord: { row: number; col: number },
  placed: Array<{ row: number; col: number }>,
  minDist: number,
): boolean {
  return placed.some(p => chebyshevDistance(coord, p) < minDist);
}

function placeSettlements(
  tiles: Record<string, Tile>,
  mapSize: MapSizeOption,
  rng: () => number,
): {
  settlements: Record<string, Settlement>;
  cities: Settlement[];
  candidatesLeft: Tile[];
} {
  const minDist = MIN_SETTLEMENT_DISTANCE[mapSize];
  const cityMinDist = Math.floor(minDist * 1.5);
  const [minTowns, maxTowns] = TOWN_COUNT_RANGE[mapSize];

  const candidates = candidateLandTiles(tiles);
  // Seeded shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const settlements: Record<string, Settlement> = {};
  const placed: Array<{ row: number; col: number }> = [];
  const cities: Settlement[] = [];

  // Place 2 cities first with 1.5× minimum distance
  let cityCounter = 0;
  for (const tile of candidates) {
    if (cities.length >= 2) break;
    if (tooClose(tile.coord, placed, cityMinDist)) continue;
    const id = `city-${cityCounter++}`;
    const settlement: Settlement = {
      id,
      tileId: tile.id,
      type: 'city',
      owner: 'neutral',
      productionQueue: null,
    };
    settlements[id] = settlement;
    cities.push(settlement);
    placed.push(tile.coord);
    tiles[tile.id] = { ...tiles[tile.id], settlementId: id };
  }

  // Place towns in remaining eligible tiles
  const targetTownCount = minTowns + Math.floor(rng() * (maxTowns - minTowns + 1));
  let townCounter = 0;
  for (const tile of candidates) {
    if (townCounter >= targetTownCount) break;
    if (tiles[tile.id].settlementId !== null) continue; // already a city
    if (tooClose(tile.coord, placed, minDist)) continue;
    const id = `town-${townCounter++}`;
    const settlement: Settlement = {
      id,
      tileId: tile.id,
      type: 'town',
      owner: 'neutral',
      productionQueue: null,
    };
    settlements[id] = settlement;
    placed.push(tile.coord);
    tiles[tile.id] = { ...tiles[tile.id], settlementId: id };
  }

  return { settlements, cities, candidatesLeft: candidates };
}

// ---------------------------------------------------------------------------
// Starting city assignment (maximally distant pair)
// ---------------------------------------------------------------------------

function assignStartingCities(
  cities: Settlement[],
  tiles: Record<string, Tile>,
): Record<PlayerId, string> {
  if (cities.length < 2) {
    throw new Error('Not enough cities to assign starting positions');
  }

  let maxDist = -1;
  let best: [Settlement, Settlement] = [cities[0], cities[1]];

  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const a = tiles[cities[i].tileId].coord;
      const b = tiles[cities[j].tileId].coord;
      const dist = Math.sqrt(Math.pow(a.row - b.row, 2) + Math.pow(a.col - b.col, 2));
      if (dist > maxDist) {
        maxDist = dist;
        best = [cities[i], cities[j]];
      }
    }
  }

  return {
    player1: best[0].id,
    player2: best[1].id,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateMap(mapSize: MapSizeOption, seed: number): GeneratedMap {
  const { rows, cols } = MAP_SIZE_CONFIG[mapSize];

  for (let attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
    const attemptSeed = seed + attempt;
    const rng = mulberry32(attemptSeed);

    // Create a noise function seeded via mulberry32
    // simplex-noise createNoise2D accepts a random function
    const noise = createNoise2D(rng);

    const tiles = generateTiles(rows, cols, noise);
    const tileOrder: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tileOrder.push(tileId(r, c));
      }
    }

    // Place settlements (mutates tile settlementId in-place on a copy)
    const tilesCopy: Record<string, Tile> = {};
    for (const [k, v] of Object.entries(tiles)) {
      tilesCopy[k] = { ...v };
    }

    let settlements: Record<string, Settlement>;
    let cities: Settlement[];
    try {
      const placed = placeSettlements(tilesCopy, mapSize, rng);
      settlements = placed.settlements;
      cities = placed.cities;
    } catch {
      continue; // Not enough land — retry
    }

    if (cities.length < 2) continue;

    // Assign starting cities
    const startingCities = assignStartingCities(cities, tilesCopy);

    // Assign ownership
    const settlementsCopy: Record<string, Settlement> = {};
    for (const [k, v] of Object.entries(settlements)) {
      settlementsCopy[k] = { ...v };
    }
    settlementsCopy[startingCities['player1']] = {
      ...settlementsCopy[startingCities['player1']],
      owner: 'player1',
    };
    settlementsCopy[startingCities['player2']] = {
      ...settlementsCopy[startingCities['player2']],
      owner: 'player2',
    };

    // Connectivity check: both starting cities reachable from each other
    const city1TileId = settlementsCopy[startingCities['player1']].tileId;
    const city2TileId = settlementsCopy[startingCities['player2']].tileId;

    if (tilesCopy[city1TileId].terrain === 'water') continue;
    if (tilesCopy[city2TileId].terrain === 'water') continue;

    const reachable = floodFillLand(tilesCopy, city1TileId);
    if (!reachable.has(city2TileId)) continue;

    // All settlements must be on connected land (no isolated towns)
    const allSettlementTileIds = Object.values(settlementsCopy).map(s => s.tileId);
    if (!allSettlementTileIds.every(tid => reachable.has(tid))) continue;

    // Starting cities must be on opposite halves of the map
    const c1 = tilesCopy[city1TileId].coord;
    const c2 = tilesCopy[city2TileId].coord;
    const sameColHalf = Math.abs(c1.col - c2.col) < cols / 2;
    const sameRowHalf = Math.abs(c1.row - c2.row) < rows / 2;
    if (sameColHalf && sameRowHalf) continue;

    // Success
    return {
      tiles: tilesCopy,
      tileOrder,
      settlements: settlementsCopy,
      startingCities,
      seed: attemptSeed,
    };
  }

  throw new MapGenerationError(
    `Failed to generate a connected map for ${mapSize} after ${MAX_GEN_ATTEMPTS} attempts`,
    MAX_GEN_ATTEMPTS,
  );
}
