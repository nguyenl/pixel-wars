/**
 * src/game/types.ts
 *
 * All canonical game types. No PixiJS imports — game logic layer is pure TypeScript.
 * Single source of truth for types shared between src/game/, src/renderer/, src/input/.
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
  | 'income'    // Automatic: income collected at turn start
  | 'orders'    // Human player issuing commands
  | 'ai'        // AI computing and applying its moves
  | 'victory';  // Game over; no further input

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
  /**
   * Number of consecutive turns a foreign unit has occupied this settlement.
   * 0 = uncontested, 1 = one turn occupied (capture completes on second turn).
   * Resets to 0 when the occupying unit leaves or is destroyed.
   */
  captureProgress: number;
  /**
   * ID of the unit currently occupying this settlement for capture purposes.
   * null when captureProgress is 0.
   */
  capturingUnit: string | null;
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
// Game Statistics (accumulated per player for scoreboard)
// ---------------------------------------------------------------------------

export interface GameStats {
  /** Total units spawned from production queues */
  unitsProduced: number;
  /** Total friendly units destroyed */
  unitsLost: number;
  /** Cumulative funds collected at start-of-turn income */
  totalIncomeEarned: number;
  /** City count at game-over moment (set once when victory is detected) */
  citiesAtEnd: number;
}

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
  /** Per-player accumulated statistics for the end-game scoreboard */
  gameStats: Record<PlayerId, GameStats>;
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

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

export interface MoveAction {
  type: 'move';
  unitId: string;
  /** Ordered list of tile coords from unit's current position to destination */
  path: TileCoord[];
}

export interface AttackAction {
  type: 'attack';
  attackerUnitId: string;
  targetUnitId: string;
}

export interface ProduceAction {
  type: 'produce';
  settlementId: string;
  unitType: UnitType;
}

export interface UpgradeAction {
  type: 'upgrade';
  settlementId: string;
}

export interface EndTurnAction {
  type: 'end-turn';
}

export type Action = MoveAction | AttackAction | ProduceAction | UpgradeAction | EndTurnAction;

export type ActionError =
  | 'invalid-phase'
  | 'not-your-turn'
  | 'unit-already-moved'
  | 'unit-already-attacked'
  | 'insufficient-funds'
  | 'city-busy'
  | 'path-blocked'
  | 'out-of-range'
  | 'invalid-target'
  | 'settlement-not-town'
  | 'not-owner';

export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: ActionError; message: string };

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export interface CombatResult {
  attackerHpAfter: number;
  defenderHpAfter: number;
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
  counterattackOccurred: boolean;
}

// ---------------------------------------------------------------------------
// Map Generation
// ---------------------------------------------------------------------------

export interface GeneratedMap {
  tiles: Record<string, Tile>;
  tileOrder: string[];
  settlements: Record<string, Settlement>;
  /** Starting city ID for each player */
  startingCities: Record<PlayerId, string>;
  /** Verified seed used (may differ from input if retries occurred) */
  seed: number;
}

// ---------------------------------------------------------------------------
// AI Search Types
// ---------------------------------------------------------------------------

export interface EvaluationWeights {
  material: number;
  cityOwnership: number;
  townOwnership: number;
  incomeDifferential: number;
  threatToEnemyCities: number;
  undefendedSettlement: number;
  lowHpPenalty: number;
}

export interface SearchConfig {
  timeBudgetMs: number;
  maxDepth: number;
  maxCandidatesPerUnit: number;
  evaluationWeights: EvaluationWeights;
}

export interface CandidateAction {
  action: Action;
  unitId: string;
  orderScore: number;
}

export interface SearchResult {
  bestActions: Action[];
  searchDepth: number;
  nodesEvaluated: number;
  timeElapsedMs: number;
  usedFallback: boolean;
}

// ---------------------------------------------------------------------------
// Map Generation
// ---------------------------------------------------------------------------

export class MapGenerationError extends Error {
  constructor(
    message: string,
    public readonly attemptsExhausted: number,
  ) {
    super(message);
    this.name = 'MapGenerationError';
  }
}
