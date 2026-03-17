/**
 * src/game/state.ts
 *
 * GameState factory and the central applyAction reducer.
 * All state mutations flow through applyAction — the input state is never mutated.
 */

import type {
  GameState,
  MapSizeOption,
  Action,
  ActionResult,
  PlayerId,
  Unit,
} from './types';
import { MAP_SIZE_CONFIG, STARTING_FUNDS, UNIT_CONFIG } from './constants';
import { generateMap } from './mapgen';
import { startTurn, endTurn } from './turns';
import { validateMove, applyMove, validateAttack, applyAttack, validateProduce, applyProduce, validateUpgrade, applyUpgrade } from './rules';

/**
 * Create a new game from a map size selection.
 * Generates the map, places both players, and returns state ready for turn 1.
 */
export function newGame(mapSize: MapSizeOption, seed?: number): GameState {
  const usedSeed = seed ?? Date.now();
  const { rows, cols } = MAP_SIZE_CONFIG[mapSize];
  const generated = generateMap(mapSize, usedSeed);

  const initialFog = (_playerId: PlayerId) => {
    const fog: Record<string, 'hidden' | 'explored' | 'visible'> = {};
    for (const id of generated.tileOrder) {
      fog[id] = 'hidden';
    }
    return fog;
  };

  // Create starting scouts for each player at their starting city
  const startingUnits: Record<string, Unit> = {};
  const tilesWithScouts = { ...generated.tiles };
  (['player1', 'player2'] as PlayerId[]).forEach((pid, idx) => {
    const cityId = generated.startingCities[pid];
    const cityTileId = generated.settlements[cityId].tileId;
    const unitId = `unit-start-${idx}`;
    const unit: Unit = {
      id: unitId,
      type: 'scout',
      owner: pid,
      tileId: cityTileId,
      hp: UNIT_CONFIG.scout.maxHp,
      movementPoints: UNIT_CONFIG.scout.movementAllowance,
      hasAttacked: false,
    };
    startingUnits[unitId] = unit;
    tilesWithScouts[cityTileId] = { ...tilesWithScouts[cityTileId], unitId };
  });

  const state: GameState = {
    turn: 1,
    currentPlayer: 'player1',
    phase: 'income',
    mapSize: { rows, cols },
    tiles: tilesWithScouts,
    tileOrder: generated.tileOrder,
    settlements: generated.settlements,
    units: startingUnits,
    players: {
      player1: { id: 'player1', name: 'Player 1', funds: STARTING_FUNDS, isAI: false },
      player2: { id: 'player2', name: 'Player 2', funds: STARTING_FUNDS, isAI: true },
    },
    fog: {
      player1: initialFog('player1'),
      player2: initialFog('player2'),
    },
    aiKnownWorld: {},
    winner: null,
    mapSeed: generated.seed,
  };

  // Start turn 1 (income phase → orders phase, recompute fog)
  return startTurn(state);
}

/**
 * Pure reducer: apply an action to the current state.
 * Returns a new state on success, or an error result on failure.
 * The input state is never mutated.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
  // Victory phase blocks all actions
  if (state.phase === 'victory') {
    return { ok: false, error: 'invalid-phase', message: 'Game is over.' };
  }

  switch (action.type) {
    case 'move': {
      if (state.phase !== 'orders' && state.phase !== 'ai') {
        return { ok: false, error: 'invalid-phase', message: 'Move actions only allowed during orders or ai phase.' };
      }
      const err = validateMove(state, action);
      if (err) return err;
      return { ok: true, state: applyMove(state, action) };
    }

    case 'attack': {
      if (state.phase !== 'orders' && state.phase !== 'ai') {
        return { ok: false, error: 'invalid-phase', message: 'Attack actions only allowed during orders or ai phase.' };
      }
      const err = validateAttack(state, action);
      if (err) return err;
      return { ok: true, state: applyAttack(state, action) };
    }

    case 'produce': {
      if (state.phase !== 'orders' && state.phase !== 'ai') {
        return { ok: false, error: 'invalid-phase', message: 'Produce actions only allowed during orders or ai phase.' };
      }
      const err = validateProduce(state, action);
      if (err) return err;
      return { ok: true, state: applyProduce(state, action) };
    }

    case 'upgrade': {
      if (state.phase !== 'orders' && state.phase !== 'ai') {
        return { ok: false, error: 'invalid-phase', message: 'Upgrade actions only allowed during orders or ai phase.' };
      }
      const err = validateUpgrade(state, action);
      if (err) return err;
      return { ok: true, state: applyUpgrade(state, action) };
    }

    case 'end-turn': {
      if (state.phase !== 'orders') {
        return { ok: false, error: 'invalid-phase', message: 'End-turn only allowed during orders phase.' };
      }
      return { ok: true, state: endTurn(state) };
    }

    default: {
      const _exhaustive: never = action;
      return { ok: false, error: 'invalid-phase', message: `Unknown action type: ${(_exhaustive as Action).type}` };
    }
  }
}
