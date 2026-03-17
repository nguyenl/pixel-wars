/**
 * contracts/actions.ts
 *
 * Game Action Contract — the complete set of commands that the input layer
 * (human or AI) can submit to the game engine via `applyAction`.
 *
 * All actions are discriminated unions keyed by `type`.
 * Consumers: src/input/input.ts, src/game/ai/ai.ts, src/game/state.ts
 */

import type { PlayerId, UnitType, TileCoord } from './game-state';

// ---------------------------------------------------------------------------
// Move Action
// ---------------------------------------------------------------------------

/**
 * Move a unit along a path of tile coordinates.
 * - `path` must start at the unit's current tile (excluded from movement cost)
 *   and end at the destination tile.
 * - Each step in the path must be orthogonally or diagonally adjacent.
 * - Total terrain cost of the path must not exceed the unit's `movementPoints`.
 * - No tile in the path (except the start) may contain a friendly unit.
 * - No tile in the path may be water or otherwise impassable.
 *
 * Validation: src/game/rules.ts → validateMove()
 */
export interface MoveAction {
  type: 'move';
  unitId: string;
  /** Ordered list of tile coords from unit's current position to destination */
  path: TileCoord[];
}

// ---------------------------------------------------------------------------
// Attack Action
// ---------------------------------------------------------------------------

/**
 * Order a unit to attack an enemy unit.
 * - The attacker must not have `hasAttacked === true`.
 * - The target must be an enemy unit (different owner).
 * - Tile distance from attacker to target must be ≤ attacker's `attackRange`.
 * - For artillery (attackRange === 2): attack resolves without counterattack.
 * - For melee units (attackRange === 1): defender counterattacks if still alive
 *   and adjacent.
 *
 * Validation: src/game/rules.ts → validateAttack()
 */
export interface AttackAction {
  type: 'attack';
  attackerUnitId: string;
  targetUnitId: string;
}

// ---------------------------------------------------------------------------
// Produce Action
// ---------------------------------------------------------------------------

/**
 * Order a city to begin producing a unit.
 * - The settlement must be a `'city'` (towns cannot produce).
 * - The settlement's `productionQueue` must be null (not already producing).
 * - The ordering player must have sufficient `funds` for the unit's cost.
 * - Cost is deducted immediately; unit appears at turn start next turn.
 *
 * Validation: src/game/rules.ts → validateProduce()
 */
export interface ProduceAction {
  type: 'produce';
  settlementId: string;
  unitType: UnitType;
}

// ---------------------------------------------------------------------------
// End Turn Action
// ---------------------------------------------------------------------------

/**
 * The active player ends their turn.
 * - Triggers capture resolution for any friendly units on neutral/enemy settlements.
 * - Passes control to AI phase (then to next player's income phase).
 * - No validation required; always valid during `'orders'` phase.
 */
export interface EndTurnAction {
  type: 'end-turn';
}

// ---------------------------------------------------------------------------
// Discriminated Union & Result Types
// ---------------------------------------------------------------------------

export type Action = MoveAction | AttackAction | ProduceAction | EndTurnAction;

export type ActionType = Action['type'];

/**
 * Result returned by `applyAction`. On success, contains the new game state.
 * On failure, contains an error code and human-readable message.
 */
export type ActionResult =
  | { ok: true; state: import('./game-state').GameState }
  | { ok: false; error: ActionError; message: string };

export type ActionError =
  | 'invalid-phase'      // Action not allowed in current TurnPhase
  | 'not-your-turn'      // Acting unit/settlement belongs to non-active player
  | 'unit-already-moved' // Unit has exhausted movement points
  | 'unit-already-attacked'
  | 'insufficient-funds'
  | 'city-busy'          // Settlement already has productionQueue set
  | 'path-blocked'       // Path contains an impassable or occupied tile
  | 'out-of-range'       // Target is outside unit's attack range
  | 'invalid-target';    // Target is not an enemy unit
