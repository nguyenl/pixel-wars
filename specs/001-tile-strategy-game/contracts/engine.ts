/**
 * contracts/engine.ts
 *
 * Game Engine Interface Contract — the boundary between the input/AI layer
 * and the game logic layer (src/game/state.ts).
 *
 * The engine exposes pure functions: given a GameState and an Action,
 * it returns a new GameState (or an error). No mutation.
 *
 * Consumers:
 *   - src/input/input.ts  (dispatches human player actions)
 *   - src/game/ai/ai.ts   (dispatches AI actions)
 *   - src/main.ts         (drives the game loop)
 *   - tests/game/         (tests call these directly)
 */

import type { GameState, PlayerId, TileCoord, UnitType, MapSizeOption } from './game-state';
import type { Action, ActionResult } from './actions';

// ---------------------------------------------------------------------------
// Game Engine Interface
// ---------------------------------------------------------------------------

export interface GameEngine {
  /**
   * Apply an action to the current game state.
   * Returns a new immutable GameState on success, or an error result on failure.
   * The input `state` is never mutated.
   */
  applyAction(state: GameState, action: Action): ActionResult;

  /**
   * Return all tile coordinates reachable by a unit given its remaining
   * movement points and terrain costs. Uses Dijkstra.
   * Returns an empty array if the unit has no remaining movement.
   */
  getReachableTiles(state: GameState, unitId: string): TileCoord[];

  /**
   * Return IDs of all enemy units that the given unit can currently attack.
   * Accounts for attack range and whether the unit has already attacked.
   */
  getAttackableTargets(state: GameState, unitId: string): string[];

  /**
   * Start a new game from a menu selection.
   * Generates a map, places settlements and starting cities, and returns
   * the initial GameState with both players ready for turn 1.
   * May throw if map generation fails after max retries.
   */
  newGame(mapSize: MapSizeOption, seed?: number): GameState;
}

// ---------------------------------------------------------------------------
// Combat Resolution (pure function, no side effects)
// ---------------------------------------------------------------------------

export interface CombatResult {
  attackerHpAfter: number;
  defenderHpAfter: number;
  /** True if the attacker is destroyed (hp <= 0) */
  attackerDestroyed: boolean;
  /** True if the defender is destroyed (hp <= 0) */
  defenderDestroyed: boolean;
  /** True if the defender counterattacked */
  counterattackOccurred: boolean;
}

/**
 * Compute combat outcome without mutating state.
 * Formula: damage = max(1, attacker.attack − defender.defense)
 * Counterattack occurs iff: attacker.attackRange === 1 AND defender survives
 * the initial hit AND defender is orthogonally/diagonally adjacent to attacker.
 */
export interface CombatResolver {
  resolve(state: GameState, attackerUnitId: string, targetUnitId: string): CombatResult;
}

// ---------------------------------------------------------------------------
// Pathfinding Interface
// ---------------------------------------------------------------------------

export interface Pathfinder {
  /**
   * Dijkstra: return the minimum cost to reach each reachable tile from origin,
   * within a movement budget. Result keyed by tile ID, value = accumulated cost.
   * Tiles costing more than `budget` are excluded.
   */
  reachableMap(
    state: GameState,
    origin: TileCoord,
    budget: number,
  ): Map<string, number>;

  /**
   * A*: return the minimum-cost path from `origin` to `destination`, or null
   * if no path exists within the given budget.
   * Path includes origin and destination tiles.
   */
  findPath(
    state: GameState,
    origin: TileCoord,
    destination: TileCoord,
    budget: number,
  ): TileCoord[] | null;
}

// ---------------------------------------------------------------------------
// Fog of War Interface
// ---------------------------------------------------------------------------

export interface FogController {
  /**
   * Recompute the fog map for a player based on current unit positions.
   * - Tiles within any unit's visionRange become 'visible'.
   * - Previously 'visible' tiles outside vision drop to 'explored'.
   * - 'explored' tiles never revert to 'hidden'.
   * Returns an updated FogMap (does not mutate input).
   */
  recomputeFog(state: GameState, playerId: PlayerId): import('./game-state').FogMap;
}

// ---------------------------------------------------------------------------
// AI Interface
// ---------------------------------------------------------------------------

export interface AIController {
  /**
   * Compute the full sequence of actions for the AI player's turn.
   * Returns an ordered list of actions to apply sequentially via applyAction.
   * Must complete within 3 seconds (SC-008).
   * Must respect aiKnownWorld, not the true GameState fog (research.md §4.4).
   */
  computeTurn(state: GameState): Action[];
}

// ---------------------------------------------------------------------------
// Map Generator Interface
// ---------------------------------------------------------------------------

export interface MapGenerator {
  /**
   * Generate a complete, connectivity-verified map.
   * May retry internally up to 20 times with different seeds.
   * Throws MapGenerationError if all attempts fail.
   */
  generate(size: MapSizeOption, seed: number): GeneratedMap;
}

export interface GeneratedMap {
  tiles: Record<string, import('./game-state').Tile>;
  tileOrder: string[];
  settlements: Record<string, import('./game-state').Settlement>;
  /** Starting city ID for each player */
  startingCities: Record<PlayerId, string>;
  /** Verified seed used (may differ from input if retries occurred) */
  seed: number;
}

export class MapGenerationError extends Error {
  constructor(
    message: string,
    public readonly attemptsExhausted: number,
  ) {
    super(message);
    this.name = 'MapGenerationError';
  }
}
