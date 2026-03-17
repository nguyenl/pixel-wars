/**
 * src/game/constants.ts
 *
 * All static configuration constants. Values are immutable and derived
 * from the data model specification. Never stored in GameState.
 */

import type {
  TerrainType,
  UnitType,
  MapSizeOption,
  SettlementType,
  TerrainConfig,
  UnitTypeConfig,
  MapSizeConfig,
} from './types';

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
  small:  { rows: 20, cols: 20 },
  medium: { rows: 30, cols: 30 },
  large:  { rows: 40, cols: 40 },
};

/** Income per turn per settlement type (in dollars) */
export const SETTLEMENT_INCOME: Record<SettlementType, number> = {
  town: 50,
  city: 100,
};

/** Vision radius granted by an owned settlement, in Chebyshev tile distance */
export const SETTLEMENT_VISION: Record<SettlementType, number> = {
  city: 3,
  town: 2,
};

/** Starting funds for each player at game start */
export const STARTING_FUNDS = 200;

/** Maximum map generation retry attempts before throwing */
export const MAX_GEN_ATTEMPTS = 50;

/** Minimum settlement separation distances by map size */
export const MIN_SETTLEMENT_DISTANCE: Record<MapSizeOption, number> = {
  small: 5,
  medium: 7,
  large: 9,
};

/** Settlement counts by map size: [minTowns, maxTowns] */
export const TOWN_COUNT_RANGE: Record<MapSizeOption, [number, number]> = {
  small:  [6, 8],
  medium: [10, 12],
  large:  [12, 20],
};

/** Gold cost to upgrade a town into a city */
export const UPGRADE_COST = 500;

/** Minimum AI gold to consider upgrading (upgrade cost + cheapest unit cost) */
export const AI_UPGRADE_THRESHOLD = 600;

// ---------------------------------------------------------------------------
// AI Search Constants
// ---------------------------------------------------------------------------

import type { EvaluationWeights } from './types';

/** Time budget for AI search in milliseconds */
export const AI_TIME_BUDGET_MS = 5000;

/** Maximum candidate actions per unit during search */
export const AI_MAX_CANDIDATES = 5;

/** Default evaluation weights for board scoring */
export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  material: 1.0,
  cityOwnership: 5.0,
  townOwnership: 2.0,
  incomeDifferential: 0.5,
  threatToEnemyCities: 1.0,
  undefendedSettlement: -1.5,
  lowHpPenalty: -0.5,
};

/** Terrain noise threshold boundaries (cumulative probability) */
export const TERRAIN_THRESHOLDS = {
  water:    0.225, // ~22.5%
  mountain: 0.350, // ~12.5% above water
  plains:   0.625, // ~27.5% above mountain
  grassland: 0.850, // ~22.5% above plains
  // forest: remainder ~15%
} as const;
