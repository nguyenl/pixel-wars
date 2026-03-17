/**
 * src/game/rules.ts
 *
 * Action validation and application for move, attack, and produce actions.
 * All functions are pure — they return new state, never mutate.
 */

import type {
  GameState,
  MoveAction,
  AttackAction,
  ProduceAction,
  UpgradeAction,
  ActionError,
} from './types';
import { TERRAIN_CONFIG, UNIT_CONFIG, UPGRADE_COST } from './constants';
import { tileId, chebyshevDistance } from './board';
import { recomputeFog } from './fog';
import { resolveCombat, applyCombatResult } from './combat';
import { checkVictory } from './turns';

// ---------------------------------------------------------------------------
// Move
// ---------------------------------------------------------------------------

export function validateMove(
  state: GameState,
  action: MoveAction,
): { ok: false; error: ActionError; message: string } | null {
  const unit = state.units[action.unitId];
  if (!unit) return { ok: false, error: 'not-your-turn', message: 'Unit not found.' };
  if (unit.owner !== state.currentPlayer) {
    return { ok: false, error: 'not-your-turn', message: 'Not your unit.' };
  }
  if (unit.movementPoints <= 0) {
    return { ok: false, error: 'unit-already-moved', message: 'Unit has no movement points remaining.' };
  }

  const path = action.path;
  if (path.length < 2) {
    return { ok: false, error: 'path-blocked', message: 'Path must have at least 2 steps.' };
  }

  // Validate each step in path (excluding start)
  let totalCost = 0;
  for (let i = 1; i < path.length; i++) {
    const coord = path[i];
    const id = tileId(coord.row, coord.col);
    const tile = state.tiles[id];
    if (!tile) {
      return { ok: false, error: 'path-blocked', message: `Tile ${id} does not exist.` };
    }
    const moveCost = TERRAIN_CONFIG[tile.terrain].moveCost;
    if (!isFinite(moveCost)) {
      return { ok: false, error: 'path-blocked', message: `Tile ${id} is impassable.` };
    }
    // Block any occupied tile (friendly or enemy)
    if (tile.unitId !== null) {
      return { ok: false, error: 'path-blocked', message: `Tile ${id} is occupied.` };
    }
    totalCost += moveCost;
  }

  if (totalCost > unit.movementPoints) {
    return { ok: false, error: 'unit-already-moved', message: 'Insufficient movement points for this path.' };
  }

  return null; // valid
}

export function applyMove(state: GameState, action: MoveAction): GameState {
  const unit = state.units[action.unitId];
  const path = action.path;
  const destCoord = path[path.length - 1];
  const destId = tileId(destCoord.row, destCoord.col);

  // Calculate movement cost
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    const id = tileId(path[i].row, path[i].col);
    cost += TERRAIN_CONFIG[state.tiles[id].terrain].moveCost;
  }

  const oldTileId = unit.tileId;
  const newUnits = {
    ...state.units,
    [action.unitId]: {
      ...unit,
      tileId: destId,
      movementPoints: unit.movementPoints - cost,
    },
  };
  const newTiles = {
    ...state.tiles,
    [oldTileId]: { ...state.tiles[oldTileId], unitId: null },
    [destId]: { ...state.tiles[destId], unitId: action.unitId },
  };

  let newState = { ...state, units: newUnits, tiles: newTiles };

  // Recompute fog for current player after move
  const newFog = recomputeFog(newState, state.currentPlayer);
  newState = {
    ...newState,
    fog: { ...newState.fog, [state.currentPlayer]: newFog },
  };

  return newState;
}

// ---------------------------------------------------------------------------
// Attack
// ---------------------------------------------------------------------------

export function validateAttack(
  state: GameState,
  action: AttackAction,
): { ok: false; error: ActionError; message: string } | null {
  const attacker = state.units[action.attackerUnitId];
  const target = state.units[action.targetUnitId];

  if (!attacker) return { ok: false, error: 'not-your-turn', message: 'Attacker not found.' };
  if (!target) return { ok: false, error: 'invalid-target', message: 'Target not found.' };
  if (attacker.owner !== state.currentPlayer) {
    return { ok: false, error: 'not-your-turn', message: 'Not your unit.' };
  }
  if (attacker.hasAttacked) {
    return { ok: false, error: 'unit-already-attacked', message: 'Unit has already attacked this turn.' };
  }
  if (target.owner === attacker.owner) {
    return { ok: false, error: 'invalid-target', message: 'Cannot attack friendly unit.' };
  }

  const attackerTile = state.tiles[attacker.tileId];
  const targetTile = state.tiles[target.tileId];
  const attackRange = UNIT_CONFIG[attacker.type].attackRange;
  const distance = chebyshevDistance(attackerTile.coord, targetTile.coord);

  if (distance > attackRange) {
    return { ok: false, error: 'out-of-range', message: `Target is out of range (distance ${distance}, range ${attackRange}).` };
  }

  return null; // valid
}

export function applyAttack(state: GameState, action: AttackAction): GameState {
  const result = resolveCombat(state, action.attackerUnitId, action.targetUnitId);
  let newState = applyCombatResult(state, action.attackerUnitId, action.targetUnitId, result);
  newState = checkVictory(newState);
  return newState;
}

// ---------------------------------------------------------------------------
// Produce
// ---------------------------------------------------------------------------

export function validateProduce(
  state: GameState,
  action: ProduceAction,
): { ok: false; error: ActionError; message: string } | null {
  const settlement = state.settlements[action.settlementId];
  if (!settlement) {
    return { ok: false, error: 'not-your-turn', message: 'Settlement not found.' };
  }
  if (settlement.owner !== state.currentPlayer) {
    return { ok: false, error: 'not-your-turn', message: 'Settlement belongs to another player.' };
  }
  if (settlement.type !== 'city') {
    return { ok: false, error: 'not-your-turn', message: 'Only cities can produce units.' };
  }
  if (settlement.productionQueue !== null) {
    return { ok: false, error: 'city-busy', message: 'City is already producing a unit.' };
  }

  const cost = UNIT_CONFIG[action.unitType].productionCost;
  const player = state.players[state.currentPlayer];
  if (player.funds < cost) {
    return { ok: false, error: 'insufficient-funds', message: `Insufficient funds (need $${cost}, have $${player.funds}).` };
  }

  return null; // valid
}

export function applyProduce(state: GameState, action: ProduceAction): GameState {
  const cost = UNIT_CONFIG[action.unitType].productionCost;
  const player = state.players[state.currentPlayer];

  return {
    ...state,
    settlements: {
      ...state.settlements,
      [action.settlementId]: {
        ...state.settlements[action.settlementId],
        productionQueue: action.unitType,
      },
    },
    players: {
      ...state.players,
      [state.currentPlayer]: {
        ...player,
        funds: player.funds - cost,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Upgrade (town → city)
// ---------------------------------------------------------------------------

export function validateUpgrade(
  state: GameState,
  action: UpgradeAction,
): { ok: false; error: ActionError; message: string } | null {
  const settlement = state.settlements[action.settlementId];
  if (!settlement) {
    return { ok: false, error: 'invalid-target', message: 'Settlement not found.' };
  }
  if (settlement.type !== 'town') {
    return { ok: false, error: 'settlement-not-town', message: 'Settlement is already a city.' };
  }
  if (settlement.owner !== state.currentPlayer) {
    return { ok: false, error: 'not-owner', message: 'You do not own this settlement.' };
  }
  const player = state.players[state.currentPlayer];
  if (player.funds < UPGRADE_COST) {
    return { ok: false, error: 'insufficient-funds', message: `Insufficient funds (need $${UPGRADE_COST}, have $${player.funds}).` };
  }
  return null;
}

export function applyUpgrade(state: GameState, action: UpgradeAction): GameState {
  const player = state.players[state.currentPlayer];

  let newState: GameState = {
    ...state,
    settlements: {
      ...state.settlements,
      [action.settlementId]: {
        ...state.settlements[action.settlementId],
        type: 'city',
      },
    },
    players: {
      ...state.players,
      [state.currentPlayer]: {
        ...player,
        funds: player.funds - UPGRADE_COST,
      },
    },
  };

  // Recompute fog for current player (city has vision range 3 vs town's 2)
  const newFog = recomputeFog(newState, state.currentPlayer);
  newState = {
    ...newState,
    fog: { ...newState.fog, [state.currentPlayer]: newFog },
  };

  return newState;
}
