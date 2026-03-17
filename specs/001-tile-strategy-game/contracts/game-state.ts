/**
 * contracts/game-state.ts
 *
 * Core Game State Contract — the canonical shape of all game data.
 * This file is the single source of truth for all types shared between
 * the game logic layer (src/game/) and the renderer (src/renderer/).
 *
 * IMPORTANT: All types here MUST be serializable plain objects.
 * No class instances, no functions, no PixiJS types.
 * This constraint enables future multiplayer (state can be sent over the wire)
 * and headless testing (no DOM or canvas required).
 *
 * Consumers: src/game/*, src/renderer/* (read-only), src/input/*
 */

// ---------------------------------------------------------------------------
// Primitives & Enumerations
// ---------------------------------------------------------------------------

export type TerrainType = 'plains' | 'forest' | 'grassland' | 'mountain' | 'water';

export type UnitType = 'scout' | 'infantry' | 'artillery';

export type PlayerId = 'player1' | 'player2';

export type Owner = PlayerId | 'neutral';

export type SettlementType = 'city' | 'town';

export type TurnPhase =
  | 'income'   // Automatic: income collected at turn start
  | 'orders'   // Human player issuing commands
  | 'ai'       // AI computing and applying its moves
  | 'victory'; // Game over; no further input

export type FogState = 'hidden' | 'explored' | 'visible';

export type MapSizeOption = 'small' | 'medium' | 'large';

// ---------------------------------------------------------------------------
// Coordinate System
// ---------------------------------------------------------------------------

/** Grid coordinate. (0,0) is top-left. Row increases downward, col rightward. */
export interface TileCoord {
  row: number;
  col: number;
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

export interface Tile {
  /** Stable unique ID: `"${row},${col}"` */
  id: string;
  coord: TileCoord;
  terrain: TerrainType;
  /** ID of the settlement on this tile, or null */
  settlementId: string | null;
  /** ID of the unit on this tile, or null */
  unitId: string | null;
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

export interface Settlement {
  id: string;
  /** ID of the tile this settlement occupies */
  tileId: string;
  type: SettlementType;
  owner: Owner;
  /**
   * Unit type queued for production, or null if idle.
   * Production completes at the start of the owner's next turn.
   * Only cities may have a production queue (towns cannot produce units).
   */
  productionQueue: UnitType | null;
}

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export interface Unit {
  id: string;
  type: UnitType;
  owner: PlayerId;
  /** ID of the tile this unit currently occupies */
  tileId: string;
  /** Current hit points */
  hp: number;
  /** Remaining movement points this turn (reset at turn start) */
  movementPoints: number;
  /** True if this unit has already attacked this turn (reset at turn start) */
  hasAttacked: boolean;
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface Player {
  id: PlayerId;
  name: string;
  funds: number;
  isAI: boolean;
}

// ---------------------------------------------------------------------------
// Fog of War
// ---------------------------------------------------------------------------

/**
 * Per-player fog map.
 * Key: tile ID. Value: fog state from that player's perspective.
 * - 'hidden'  : Never visited. Terrain and units invisible.
 * - 'explored': Seen before but not currently in vision range.
 *               Terrain and settlement visible; unit positions hidden.
 * - 'visible' : Within current vision range of ≥1 friendly unit.
 *               Full information visible.
 */
export type FogMap = Record<string, FogState>;

// ---------------------------------------------------------------------------
// AI Known World
// ---------------------------------------------------------------------------

export interface KnownTile {
  /** Turn number when the AI last had vision of this tile */
  lastSeenTurn: number;
  terrain: TerrainType;
  settlementId: string | null;
  /** Last-seen unit on this tile, or null if none was present */
  lastSeenUnit: { type: UnitType; owner: PlayerId } | null;
}

/** AI's memory of the map. Key: tile ID. Partial — only tiles ever seen. */
export type KnownWorld = Record<string, KnownTile>;

// ---------------------------------------------------------------------------
// Game State (root document)
// ---------------------------------------------------------------------------

export interface GameState {
  /** Turn counter, starts at 1 */
  turn: number;
  /** Which player's turn it currently is */
  currentPlayer: PlayerId;
  phase: TurnPhase;
  /** Map dimensions */
  mapSize: { rows: number; cols: number };
  /** All tiles, keyed by tile ID (`"${row},${col}"`) */
  tiles: Record<string, Tile>;
  /** Tile IDs in row-major order for deterministic iteration */
  tileOrder: string[];
  /** All settlements, keyed by settlement ID */
  settlements: Record<string, Settlement>;
  /** All units, keyed by unit ID */
  units: Record<string, Unit>;
  /** Both players */
  players: Record<PlayerId, Player>;
  /** Fog-of-war maps, one per player */
  fog: Record<PlayerId, FogMap>;
  /** AI's remembered world state (used exclusively by src/game/ai/) */
  aiKnownWorld: KnownWorld;
  /** Winning player, or null if game is ongoing */
  winner: PlayerId | null;
  /** Random seed used to generate this map */
  mapSeed: number;
}

// ---------------------------------------------------------------------------
// Static Configuration (not stored in GameState — derived constants)
// ---------------------------------------------------------------------------

export interface TerrainConfig {
  type: TerrainType;
  /** Movement points consumed entering this tile. Infinity = impassable. */
  moveCost: number;
  label: string;
}

export interface UnitTypeConfig {
  type: UnitType;
  maxHp: number;
  movementAllowance: number;
  visionRange: number;
  attackStrength: number;
  defenseStrength: number;
  /** 1 = melee; 2 = ranged (artillery only) */
  attackRange: number;
  productionCost: number;
}

export interface MapSizeConfig {
  rows: number;
  cols: number;
}

export const TERRAIN_CONFIG: Record<TerrainType, TerrainConfig> = {
  plains:    { type: 'plains',    moveCost: 1,        label: 'Plains' },
  grassland: { type: 'grassland', moveCost: 1,        label: 'Grassland' },
  forest:    { type: 'forest',    moveCost: 2,        label: 'Forest' },
  mountain:  { type: 'mountain',  moveCost: 3,        label: 'Mountain' },
  water:     { type: 'water',     moveCost: Infinity, label: 'Water' },
};

export const UNIT_CONFIG: Record<UnitType, UnitTypeConfig> = {
  scout: {
    type: 'scout',
    maxHp: 3,
    movementAllowance: 5,
    visionRange: 4,
    attackStrength: 2,
    defenseStrength: 1,
    attackRange: 1,
    productionCost: 100,
  },
  infantry: {
    type: 'infantry',
    maxHp: 5,
    movementAllowance: 3,
    visionRange: 2,
    attackStrength: 4,
    defenseStrength: 3,
    attackRange: 1,
    productionCost: 200,
  },
  artillery: {
    type: 'artillery',
    maxHp: 4,
    movementAllowance: 2,
    visionRange: 2,
    attackStrength: 6,
    defenseStrength: 2,
    attackRange: 2,
    productionCost: 300,
  },
};

export const MAP_SIZE_CONFIG: Record<MapSizeOption, MapSizeConfig> = {
  small:  { rows: 10, cols: 10 },
  medium: { rows: 15, cols: 15 },
  large:  { rows: 20, cols: 20 },
};

/** Income per turn per settlement type (in dollars) */
export const SETTLEMENT_INCOME: Record<SettlementType, number> = {
  town: 50,
  city: 100,
};

/** Starting funds for each player */
export const STARTING_FUNDS = 200;
