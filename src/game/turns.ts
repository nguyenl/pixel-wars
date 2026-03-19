/**
 * src/game/turns.ts
 *
 * Turn phase state machine:
 * income → orders → ai → (victory check) → income (next player)
 *
 * startTurn: collect income, reset units, spawn production, recompute fog
 * endTurn:   resolve captures, check victory, transition to AI phase
 */

import type { GameState, Unit } from './types';
import { UNIT_CONFIG, SETTLEMENT_INCOME } from './constants';
import { recomputeFog } from './fog';

let _unitCounter = 0;
function newUnitId(): string {
  return `unit-${++_unitCounter}`;
}

// ---------------------------------------------------------------------------
// Victory detection
// ---------------------------------------------------------------------------

export function checkVictory(state: GameState): GameState {
  if (state.phase === 'victory') return state;

  const player1Cities = Object.values(state.settlements).filter(
    s => s.type === 'city' && s.owner === 'player1'
  ).length;
  const player2Cities = Object.values(state.settlements).filter(
    s => s.type === 'city' && s.owner === 'player2'
  ).length;

  if (player2Cities === 0) {
    return {
      ...state,
      winner: 'player1',
      phase: 'victory',
      gameStats: {
        player1: { ...state.gameStats['player1'], citiesAtEnd: player1Cities },
        player2: { ...state.gameStats['player2'], citiesAtEnd: 0 },
      },
    };
  }
  if (player1Cities === 0) {
    return {
      ...state,
      winner: 'player2',
      phase: 'victory',
      gameStats: {
        player1: { ...state.gameStats['player1'], citiesAtEnd: 0 },
        player2: { ...state.gameStats['player2'], citiesAtEnd: player2Cities },
      },
    };
  }
  return state;
}

// ---------------------------------------------------------------------------
// Start turn (income phase → orders phase)
// ---------------------------------------------------------------------------

/**
 * Process the start of a player's turn:
 * 1. Spawn units from production queues
 * 2. Collect income from owned settlements
 * 3. Reset unit movement points and hasAttacked flags
 * 4. Recompute fog of war
 * 5. Transition to 'orders' phase
 */
export function startTurn(state: GameState): GameState {
  const player = state.currentPlayer;

  let newState = { ...state };
  const newUnits = { ...state.units };
  const newTiles = { ...state.tiles };
  const newSettlements = { ...state.settlements };

  // Step 1: Spawn production queue units for this player's cities
  for (const settlement of Object.values(newSettlements)) {
    if (settlement.owner !== player) continue;
    if (settlement.type !== 'city') continue;
    if (!settlement.productionQueue) continue;

    const cityTile = newTiles[settlement.tileId];
    if (!cityTile || cityTile.unitId !== null) {
      // City tile is occupied — skip spawning (unit lost this turn)
      newSettlements[settlement.id] = { ...settlement, productionQueue: null };
      continue;
    }

    const unitType = settlement.productionQueue;
    const config = UNIT_CONFIG[unitType];
    const unit: Unit = {
      id: newUnitId(),
      type: unitType,
      owner: player,
      tileId: settlement.tileId,
      hp: config.maxHp,
      movementPoints: config.movementAllowance,
      hasAttacked: false,
    };
    newUnits[unit.id] = unit;
    newTiles[settlement.tileId] = { ...cityTile, unitId: unit.id };
    newSettlements[settlement.id] = { ...settlement, productionQueue: null };
  }

  // Step 2: Collect income for this player
  let income = 0;
  for (const settlement of Object.values(newSettlements)) {
    if (settlement.owner === player) {
      income += SETTLEMENT_INCOME[settlement.type];
    }
  }

  const newPlayers = {
    ...state.players,
    [player]: {
      ...state.players[player],
      funds: state.players[player].funds + income,
    },
  };

  const newGameStats = {
    ...state.gameStats,
    [player]: {
      ...state.gameStats[player],
      totalIncomeEarned: state.gameStats[player].totalIncomeEarned + income,
    },
  };

  // Step 3: Reset unit movement and attack flags for this player's units
  for (const [id, unit] of Object.entries(newUnits)) {
    if (unit.owner === player) {
      newUnits[id] = {
        ...unit,
        movementPoints: UNIT_CONFIG[unit.type].movementAllowance,
        hasAttacked: false,
      };
    }
  }

  newState = {
    ...newState,
    units: newUnits,
    tiles: newTiles,
    settlements: newSettlements,
    players: newPlayers,
    gameStats: newGameStats,
    phase: 'orders',
  };

  // Step 4: Recompute fog for this player
  const newFog = recomputeFog(newState, player);
  newState = {
    ...newState,
    fog: { ...newState.fog, [player]: newFog },
  };

  return newState;
}

// ---------------------------------------------------------------------------
// End turn (orders → ai phase, captures, victory check)
// ---------------------------------------------------------------------------

/**
 * End the current player's turn:
 * 1. Resolve captures for units on neutral/enemy settlements
 * 2. Check for victory
 * 3. Transition to AI phase (currentPlayer → player2)
 */
export function endTurn(state: GameState): GameState {
  let newState = resolveCaptures(state);
  newState = checkVictory(newState);
  if (newState.phase === 'victory') return newState;

  // Start AI's turn: reset units, collect income, spawn production
  newState = startTurn({
    ...newState,
    currentPlayer: 'player2',
    phase: 'income',
  });

  // Override phase to 'ai' (startTurn sets it to 'orders')
  return { ...newState, phase: 'ai' };
}

// ---------------------------------------------------------------------------
// AI turn completion → start next human turn
// ---------------------------------------------------------------------------

/**
 * Conclude the AI's turn and begin the next human player's turn.
 * Called by the game loop after all AI actions are applied.
 */
export function endAiTurn(state: GameState): GameState {
  let newState = resolveCaptures(state);
  newState = checkVictory(newState);
  if (newState.phase === 'victory') return newState;

  return startTurn({
    ...newState,
    turn: newState.turn + 1,
    currentPlayer: 'player1',
    phase: 'income',
  });
}

// ---------------------------------------------------------------------------
// Capture resolution
// ---------------------------------------------------------------------------

function resolveCaptures(state: GameState): GameState {
  const activePlayer = state.currentPlayer;
  let newSettlements = { ...state.settlements };

  for (const settlement of Object.values(state.settlements)) {
    if (settlement.owner === activePlayer) {
      // Friendly settlement: reset stale capture state only if no enemy is actively occupying it.
      // If an enemy unit is present, their captureProgress is valid and must not be wiped.
      const friendlyTile = state.tiles[settlement.tileId];
      const unitOnFriendlyTile = friendlyTile?.unitId ? state.units[friendlyTile.unitId] : null;
      const enemyPresent = unitOnFriendlyTile && unitOnFriendlyTile.owner !== activePlayer;
      if (!enemyPresent && (settlement.captureProgress !== 0 || settlement.capturingUnit !== null)) {
        newSettlements[settlement.id] = {
          ...newSettlements[settlement.id],
          captureProgress: 0,
          capturingUnit: null,
        };
      }
      continue;
    }

    const tile = state.tiles[settlement.tileId];
    const unitOnTile = tile?.unitId ? state.units[tile.unitId] : null;

    if (!unitOnTile || unitOnTile.owner !== activePlayer) {
      // No occupying unit from this player — reset progress if it was ours
      if (settlement.capturingUnit !== null) {
        const capturingUnit = state.units[settlement.capturingUnit];
        // If the capturing unit is gone or no longer on this tile, reset
        if (!capturingUnit || capturingUnit.tileId !== settlement.tileId) {
          newSettlements[settlement.id] = {
            ...newSettlements[settlement.id],
            captureProgress: 0,
            capturingUnit: null,
          };
        }
      }
      continue;
    }

    // Active player's unit is on this settlement tile
    const current = newSettlements[settlement.id];

    if (current.capturingUnit !== null && current.capturingUnit !== unitOnTile.id) {
      // Different unit than last turn — reset progress, start fresh
      newSettlements[settlement.id] = {
        ...current,
        captureProgress: 1,
        capturingUnit: unitOnTile.id,
      };
    } else {
      // Same unit (or first time) — increment progress
      const newProgress = current.captureProgress + 1;
      if (newProgress >= 2) {
        // Capture complete: transfer ownership
        newSettlements[settlement.id] = {
          ...current,
          owner: activePlayer,
          productionQueue: null,
          captureProgress: 0,
          capturingUnit: null,
        };
      } else {
        newSettlements[settlement.id] = {
          ...current,
          captureProgress: newProgress,
          capturingUnit: unitOnTile.id,
        };
      }
    }
  }

  return { ...state, settlements: newSettlements };
}
