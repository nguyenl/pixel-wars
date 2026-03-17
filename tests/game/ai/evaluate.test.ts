import { describe, it, expect } from 'vitest';
import { evaluateBoard } from '../../../src/game/ai/evaluate';
import { DEFAULT_EVALUATION_WEIGHTS, UNIT_CONFIG } from '../../../src/game/constants';
import type { GameState, Tile, Unit, Settlement, EvaluationWeights } from '../../../src/game/types';

// ---------------------------------------------------------------------------
// Test helper: build a minimal GameState for evaluation tests
// ---------------------------------------------------------------------------

function makeTile(row: number, col: number, extra?: Partial<Tile>): Tile {
  const id = `${row},${col}`;
  return {
    id,
    coord: { row, col },
    terrain: 'plains',
    settlementId: null,
    unitId: null,
    ...extra,
  };
}

interface BoardSetup {
  size?: number;
  units?: Record<string, Unit>;
  settlements?: Record<string, Settlement>;
}

function makeGameState(setup: BoardSetup = {}): GameState {
  const size = setup.size ?? 5;
  const tiles: Record<string, Tile> = {};
  const tileOrder: string[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tile = makeTile(r, c);
      tiles[tile.id] = tile;
      tileOrder.push(tile.id);
    }
  }

  // Wire units onto tiles
  const units = setup.units ?? {};
  for (const unit of Object.values(units)) {
    if (tiles[unit.tileId]) {
      tiles[unit.tileId] = { ...tiles[unit.tileId], unitId: unit.id };
    }
  }

  // Wire settlements onto tiles
  const settlements = setup.settlements ?? {};
  for (const s of Object.values(settlements)) {
    if (tiles[s.tileId]) {
      tiles[s.tileId] = { ...tiles[s.tileId], settlementId: s.id };
    }
  }

  return {
    turn: 1,
    currentPlayer: 'player2',
    phase: 'ai',
    mapSize: { rows: size, cols: size },
    tiles,
    tileOrder,
    settlements,
    units,
    players: {
      player1: { id: 'player1', name: 'Player 1', funds: 200, isAI: false },
      player2: { id: 'player2', name: 'Player 2', funds: 200, isAI: true },
    },
    fog: { player1: {}, player2: {} },
    aiKnownWorld: {},
    winner: null,
    mapSeed: 1,
  };
}

function makeUnit(id: string, owner: 'player1' | 'player2', type: 'scout' | 'infantry' | 'artillery', tileId: string, hp?: number): Unit {
  const maxHp = { scout: 3, infantry: 5, artillery: 4 };
  return {
    id,
    type,
    owner,
    tileId,
    hp: hp ?? maxHp[type],
    movementPoints: 0,
    hasAttacked: false,
  };
}

function makeSettlement(id: string, tileId: string, type: 'city' | 'town', owner: 'player1' | 'player2' | 'neutral'): Settlement {
  return { id, tileId, type, owner, productionQueue: null };
}

// ---------------------------------------------------------------------------
// Phase 2 Tests (T003-T009)
// ---------------------------------------------------------------------------

describe('evaluateBoard', () => {
  it('T003: AI-advantaged board (more units, more settlements) scores positive', () => {
    const state = makeGameState({
      units: {
        'ai-inf-1': makeUnit('ai-inf-1', 'player2', 'infantry', '0,0'),
        'ai-inf-2': makeUnit('ai-inf-2', 'player2', 'infantry', '0,1'),
        'ai-scout': makeUnit('ai-scout', 'player2', 'scout', '0,2'),
        'p1-scout': makeUnit('p1-scout', 'player1', 'scout', '4,4'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '1,0', 'city', 'player2'),
        'town-ai': makeSettlement('town-ai', '1,1', 'town', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
      },
    });

    const score = evaluateBoard(state, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    expect(score).toBeGreaterThan(0);
  });

  it('T004: player-advantaged board scores negative', () => {
    const state = makeGameState({
      units: {
        'ai-scout': makeUnit('ai-scout', 'player2', 'scout', '0,0'),
        'p1-inf-1': makeUnit('p1-inf-1', 'player1', 'infantry', '4,0'),
        'p1-inf-2': makeUnit('p1-inf-2', 'player1', 'infantry', '4,1'),
        'p1-art': makeUnit('p1-art', 'player1', 'artillery', '4,2'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
        'town-p1-1': makeSettlement('town-p1-1', '4,4', 'town', 'player1'),
        'town-p1-2': makeSettlement('town-p1-2', '3,4', 'town', 'player1'),
      },
    });

    const score = evaluateBoard(state, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    expect(score).toBeLessThan(0);
  });

  it('T005: equal board scores near zero', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '4,4'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
      },
    });

    const score = evaluateBoard(state, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    // "Near zero" — within a reasonable range. Positional differences may cause slight offset.
    expect(Math.abs(score)).toBeLessThan(5);
  });

  it('T006: city ownership is weighted higher than town ownership', () => {
    // Board A: AI has 1 city + 1 extra city, player has 1 city
    const stateA = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '4,4'),
      },
      settlements: {
        'city-ai-1': makeSettlement('city-ai-1', '0,1', 'city', 'player2'),
        'city-ai-2': makeSettlement('city-ai-2', '0,2', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
      },
    });

    // Board B: AI has 1 city + 1 extra town, player has 1 city
    const stateB = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '4,4'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'town-ai': makeSettlement('town-ai', '0,2', 'town', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
      },
    });

    const scoreA = evaluateBoard(stateA, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    const scoreB = evaluateBoard(stateB, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    // Extra city should be worth more than extra town
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it('T007: material score accounts for HP-weighted unit values (damaged unit < full HP unit)', () => {
    // Board A: AI has full HP infantry
    const stateA = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0', 5),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '4,4', 5),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
      },
    });

    // Board B: AI has damaged infantry (1 HP)
    const stateB = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0', 1),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '4,4', 5),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
      },
    });

    const scoreA = evaluateBoard(stateA, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    const scoreB = evaluateBoard(stateB, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it('T008: terminal state (all enemy cities destroyed) returns extreme positive score', () => {
    // Player has no cities → AI wins
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '4,4'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        // No player1 cities
      },
    });

    const score = evaluateBoard(state, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    expect(score).toBe(Infinity);
  });

  it('T009: terminal state (all AI cities destroyed) returns extreme negative score', () => {
    // AI has no cities → player wins
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '4,4'),
      },
      settlements: {
        'city-p1': makeSettlement('city-p1', '4,3', 'city', 'player1'),
        // No AI cities
      },
    });

    const score = evaluateBoard(state, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    expect(score).toBe(-Infinity);
  });
});

// ---------------------------------------------------------------------------
// Phase 3 / US4 Tests (T012-T014): Strategic trade-offs
// ---------------------------------------------------------------------------

describe('evaluateBoard — US4 strategic trade-offs', () => {
  it('T012: sacrificing a scout to capture an undefended enemy city produces a higher evaluation', () => {
    // Board A: AI has scout + city, player has city (undefended)
    // Represents state AFTER sacrifice: scout is gone but captured the city
    const stateAfterCapture = makeGameState({
      size: 8,
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        // Scout was sacrificed / used to capture
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-captured': makeSettlement('city-captured', '7,7', 'city', 'player2'), // was player's
        // Player has no cities left → terminal, but let's give them one
        'city-p1': makeSettlement('city-p1', '7,0', 'city', 'player1'),
      },
    });

    // Board B: AI has scout + city, player has city
    // Represents state BEFORE sacrifice: scout alive, enemy city still owned by player
    const stateBeforeCapture = makeGameState({
      size: 8,
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'ai-scout': makeUnit('ai-scout', 'player2', 'scout', '6,6'), // alive, near enemy city
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1-1': makeSettlement('city-p1-1', '7,7', 'city', 'player1'), // not captured yet
        'city-p1-2': makeSettlement('city-p1-2', '7,0', 'city', 'player1'),
      },
    });

    const scoreAfter = evaluateBoard(stateAfterCapture, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    const scoreBefore = evaluateBoard(stateBeforeCapture, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    // Gaining a city (weight 5.0) should outweigh losing a scout (cost 100 * 1.0)
    expect(scoreAfter).toBeGreaterThan(scoreBefore);
  });

  it('T013: board with more units but fewer settlements scores differently than board with fewer units but more settlements', () => {
    // Board A: AI has 3 infantry, 1 city. Player has 1 infantry, 1 city + 2 towns.
    const stateMoreUnits = makeGameState({
      size: 8,
      units: {
        'ai-inf-1': makeUnit('ai-inf-1', 'player2', 'infantry', '0,0'),
        'ai-inf-2': makeUnit('ai-inf-2', 'player2', 'infantry', '0,1'),
        'ai-inf-3': makeUnit('ai-inf-3', 'player2', 'infantry', '0,2'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '7,7'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '1,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,6', 'city', 'player1'),
        'town-p1-1': makeSettlement('town-p1-1', '7,5', 'town', 'player1'),
        'town-p1-2': makeSettlement('town-p1-2', '7,4', 'town', 'player1'),
      },
    });

    // Board B: AI has 1 infantry, 1 city + 2 towns. Player has 3 infantry, 1 city.
    const stateMoreSettlements = makeGameState({
      size: 8,
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf-1': makeUnit('p1-inf-1', 'player1', 'infantry', '7,7'),
        'p1-inf-2': makeUnit('p1-inf-2', 'player1', 'infantry', '7,6'),
        'p1-inf-3': makeUnit('p1-inf-3', 'player1', 'infantry', '7,5'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '1,0', 'city', 'player2'),
        'town-ai-1': makeSettlement('town-ai-1', '1,1', 'town', 'player2'),
        'town-ai-2': makeSettlement('town-ai-2', '1,2', 'town', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,4', 'city', 'player1'),
      },
    });

    const scoreA = evaluateBoard(stateMoreUnits, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    const scoreB = evaluateBoard(stateMoreSettlements, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    // The scores should be different — material advantage vs settlement advantage
    expect(scoreA).not.toEqual(scoreB);
  });

  it('T014: AI units within attack range of enemy city increase the evaluation score (threat component)', () => {
    // Board A: AI unit far from enemy city
    const stateFar = makeGameState({
      size: 10,
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '9,0'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '9,9', 'city', 'player1'),
      },
    });

    // Board B: AI unit near enemy city (within 3 tiles)
    const stateNear = makeGameState({
      size: 10,
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '8,8'), // 1 tile from city at 9,9
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '9,0'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '9,9', 'city', 'player1'),
      },
    });

    const scoreFar = evaluateBoard(stateFar, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    const scoreNear = evaluateBoard(stateNear, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    // Proximity to enemy city should increase score via threat component
    expect(scoreNear).toBeGreaterThan(scoreFar);
  });
});

// ---------------------------------------------------------------------------
// Phase 7 Edge Case (T051): Fog of war compliance
// ---------------------------------------------------------------------------

describe('evaluateBoard — fog of war', () => {
  it('T051: evaluation uses the game state as provided (fog compliance is handled by search feeding aiKnownWorld-filtered state)', () => {
    // The evaluation function scores what it sees in the state.
    // When the search filters the state through aiKnownWorld before evaluating,
    // hidden units/settlements won't be in the state and thus won't affect the score.
    // This test verifies that adding hidden units changes the score (proving eval uses state data).
    const stateWithout = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,4', 'city', 'player1'),
      },
    });

    // Same board but with an extra hidden player unit
    const stateWith = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-hidden': makeUnit('p1-hidden', 'player1', 'infantry', '4,3'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '4,4', 'city', 'player1'),
      },
    });

    const scoreWithout = evaluateBoard(stateWithout, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    const scoreWith = evaluateBoard(stateWith, 'player2', DEFAULT_EVALUATION_WEIGHTS);
    // Extra enemy unit should lower the score
    expect(scoreWithout).toBeGreaterThan(scoreWith);
  });
});
