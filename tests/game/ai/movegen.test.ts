import { describe, it, expect } from 'vitest';
import { generateCandidateActions, generateAllUnitActions } from '../../../src/game/ai/movegen';
import { AI_MAX_CANDIDATES, DEFAULT_EVALUATION_WEIGHTS, UNIT_CONFIG } from '../../../src/game/constants';
import type { GameState, Tile, Unit, Settlement, SearchConfig } from '../../../src/game/types';

// ---------------------------------------------------------------------------
// Test helper: build a minimal GameState for movegen tests
// ---------------------------------------------------------------------------

function makeTile(row: number, col: number, terrain: Tile['terrain'] = 'plains'): Tile {
  const id = `${row},${col}`;
  return { id, coord: { row, col }, terrain, settlementId: null, unitId: null };
}

interface BoardSetup {
  size?: number;
  units?: Record<string, Unit>;
  settlements?: Record<string, Settlement>;
  waterTiles?: Array<[number, number]>;
}

function makeGameState(setup: BoardSetup = {}): GameState {
  const size = setup.size ?? 8;
  const tiles: Record<string, Tile> = {};
  const tileOrder: string[] = [];
  const waterSet = new Set((setup.waterTiles ?? []).map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = `${r},${c}`;
      const terrain = waterSet.has(id) ? 'water' as const : 'plains' as const;
      const tile = makeTile(r, c, terrain);
      tiles[tile.id] = tile;
      tileOrder.push(tile.id);
    }
  }

  const units = setup.units ?? {};
  for (const unit of Object.values(units)) {
    if (tiles[unit.tileId]) {
      tiles[unit.tileId] = { ...tiles[unit.tileId], unitId: unit.id };
    }
  }

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
      player2: { id: 'player2', name: 'Player 2', funds: 300, isAI: true },
    },
    fog: { player1: {}, player2: {} },
    aiKnownWorld: {},
    winner: null,
    mapSeed: 1,
    gameStats: {
      player1: { unitsProduced: 0, unitsLost: 0, totalIncomeEarned: 0, citiesAtEnd: 0 },
      player2: { unitsProduced: 0, unitsLost: 0, totalIncomeEarned: 0, citiesAtEnd: 0 },
    },
  };
}

function makeUnit(id: string, owner: 'player1' | 'player2', type: 'scout' | 'infantry' | 'artillery', tileId: string, overrides?: Partial<Unit>): Unit {
  const cfg = UNIT_CONFIG[type];
  return {
    id,
    type,
    owner,
    tileId,
    hp: cfg.maxHp,
    movementPoints: cfg.movementAllowance,
    hasAttacked: false,
    ...overrides,
  };
}

function makeSettlement(id: string, tileId: string, type: 'city' | 'town', owner: 'player1' | 'player2' | 'neutral'): Settlement {
  return { id, tileId, type, owner, productionQueue: null, captureProgress: 0, capturingUnit: null };
}

const defaultConfig: SearchConfig = {
  timeBudgetMs: 2500,
  maxDepth: 20,
  maxCandidatesPerUnit: AI_MAX_CANDIDATES,
  evaluationWeights: DEFAULT_EVALUATION_WEIGHTS,
};

// ---------------------------------------------------------------------------
// Phase 3-5: Capture Prioritization Tests (T001-T007)
// ---------------------------------------------------------------------------

const CAPTURE_BONUS = 4000;
const MID_CAPTURE_HOLD_SCORE = 8000;

describe('AI Capture Prioritization', () => {
  it('T001 [US1]: capture move for adjacent undefended neutral settlement has orderScore >= CAPTURE_BONUS + 1000 and is highest-scored move', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '3,3'),
      },
      settlements: {
        'neutral-town': makeSettlement('neutral-town', '3,4', 'town', 'neutral'),
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    const moveCandidates = candidates.filter(c => c.action.type === 'move' && c.action.path.length > 0);

    const captureMove = moveCandidates.find(c => {
      if (c.action.type !== 'move') return false;
      const dest = c.action.path[c.action.path.length - 1];
      return dest?.row === 3 && dest?.col === 4;
    });

    expect(captureMove).toBeDefined();
    expect(captureMove!.orderScore).toBeGreaterThanOrEqual(CAPTURE_BONUS + 1000);
    const maxMoveScore = Math.max(...moveCandidates.map(c => c.orderScore));
    expect(captureMove!.orderScore).toBe(maxMoveScore);
  });

  it('T002 [US1]: mid-capture hold-position has orderScore === MID_CAPTURE_HOLD_SCORE', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '3,3'),
      },
      settlements: {
        'contested-town': {
          ...makeSettlement('contested-town', '3,3', 'town', 'neutral'),
          captureProgress: 1,
          capturingUnit: 'ai-inf',
        },
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    const holdCandidate = candidates.find(c => c.action.type === 'move' && c.action.path.length === 0);

    expect(holdCandidate).toBeDefined();
    expect(holdCandidate!.orderScore).toBe(MID_CAPTURE_HOLD_SCORE);
  });

  it('T005 [US2]: capture move score exceeds best non-capture move score', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '3,3'),
      },
      settlements: {
        'neutral-town': makeSettlement('neutral-town', '3,4', 'town', 'neutral'),
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    const moveCandidates = candidates.filter(c => c.action.type === 'move' && c.action.path.length > 0);

    const captureMove = moveCandidates.find(c => {
      if (c.action.type !== 'move') return false;
      const dest = c.action.path[c.action.path.length - 1];
      return dest?.row === 3 && dest?.col === 4;
    });

    const nonCaptureMoves = moveCandidates.filter(c => {
      if (c.action.type !== 'move') return false;
      const dest = c.action.path[c.action.path.length - 1];
      return !(dest?.row === 3 && dest?.col === 4);
    });

    expect(captureMove).toBeDefined();
    const bestNonCaptureScore = nonCaptureMoves.length > 0
      ? Math.max(...nonCaptureMoves.map(c => c.orderScore))
      : 0;
    expect(captureMove!.orderScore).toBeGreaterThan(bestNonCaptureScore);
  });

  it('T007 [US3]: second AI unit does not get CAPTURE_BONUS when a friendly unit is already capturing the settlement', () => {
    // ai-inf1 is registered as capturingUnit for neutral-town (captureProgress=1),
    // but lives on a different tile — artificial state to test the guard independently
    // of the unitId occupancy filter.
    const state = makeGameState({
      units: {
        'ai-inf1': makeUnit('ai-inf1', 'player2', 'infantry', '2,4'),
        'ai-inf2': makeUnit('ai-inf2', 'player2', 'infantry', '3,5'),
      },
      settlements: {
        'neutral-town': {
          ...makeSettlement('neutral-town', '3,4', 'town', 'neutral'),
          captureProgress: 1,
          capturingUnit: 'ai-inf1',
        },
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates2 = generateCandidateActions(state, 'ai-inf2', defaultConfig);
    const captureMove2 = candidates2.find(c => {
      if (c.action.type !== 'move') return false;
      const dest = c.action.path[c.action.path.length - 1];
      return dest?.row === 3 && dest?.col === 4;
    });

    // ai-inf2 must NOT get CAPTURE_BONUS since a friendly unit (ai-inf1) is already capturing
    expect(captureMove2?.orderScore ?? 0).toBeLessThanOrEqual(1020);
  });
});

// ---------------------------------------------------------------------------
// Phase 4 / US3 Tests (T016-T023)
// ---------------------------------------------------------------------------

describe('generateCandidateActions', () => {
  it('T016: returns attack actions for units adjacent to enemies', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '3,3'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '3,4'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    const attackCandidates = candidates.filter(c => c.action.type === 'attack');
    expect(attackCandidates.length).toBeGreaterThan(0);
  });

  it('T017: returns move actions toward objectives for units with no adjacent enemies', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '7,7'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,6', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    const moveCandidates = candidates.filter(c => c.action.type === 'move');
    expect(moveCandidates.length).toBeGreaterThan(0);
  });

  it('T018: returns produce actions for owned idle cities with sufficient funds', () => {
    const state = makeGameState({
      units: {
        // No unit on the city tile
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '2,2'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    // Generate for a virtual "city" unit — movegen generates produce for cities
    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    // Produce actions are generated at the unit level for nearby cities — or via generateAllUnitActions.
    // Actually, produce actions are generated separately. Let's check via generateAllUnitActions.
    const allActions = generateAllUnitActions(state, 'player2', defaultConfig);
    const allCandidates = allActions.flat();
    const produceCandidates = allCandidates.filter(c => c.action.type === 'produce');
    expect(produceCandidates.length).toBeGreaterThan(0);
  });

  it('T019: kill shot actions are ordered before non-lethal attacks', () => {
    // AI infantry (attack 4) vs player infantry at 1 HP (kill shot) and 5 HP (non-lethal)
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '3,3'),
        'p1-weak': makeUnit('p1-weak', 'player1', 'infantry', '3,4', { hp: 1 }),
        'p1-strong': makeUnit('p1-strong', 'player1', 'infantry', '3,2', { hp: 5 }),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    const attacks = candidates.filter(c => c.action.type === 'attack');
    expect(attacks.length).toBeGreaterThanOrEqual(2);

    // First attack should target the weak unit (kill shot)
    const firstAttack = attacks[0].action;
    expect(firstAttack.type).toBe('attack');
    if (firstAttack.type === 'attack') {
      expect(firstAttack.targetUnitId).toBe('p1-weak');
    }
  });

  it('T020: attack actions are ordered before move-only actions', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '3,3'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '3,4'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    const firstAttackIdx = candidates.findIndex(c => c.action.type === 'attack');
    const firstMoveIdx = candidates.findIndex(c => c.action.type === 'move');

    if (firstAttackIdx >= 0 && firstMoveIdx >= 0) {
      expect(firstAttackIdx).toBeLessThan(firstMoveIdx);
    }
  });

  it('T021: hold position (no-op) is always included as a candidate', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '3,3'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,7', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    // Hold is represented as a move to the same position (empty path) or null action
    // We'll represent it as having at least one candidate even with no targets
    expect(candidates.length).toBeGreaterThan(0);
    // The last candidate (lowest priority) should be the hold
    const holdCandidates = candidates.filter(c =>
      c.action.type === 'move' && c.action.path.length === 0
    );
    expect(holdCandidates.length).toBe(1);
  });

  it('T022: number of candidates per unit does not exceed maxCandidatesPerUnit', () => {
    const state = makeGameState({
      size: 10,
      units: {
        'ai-scout': makeUnit('ai-scout', 'player2', 'scout', '5,5'),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '9,9'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,0', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '9,8', 'city', 'player1'),
      },
    });

    const config: SearchConfig = { ...defaultConfig, maxCandidatesPerUnit: 3 };
    const candidates = generateCandidateActions(state, 'ai-scout', config);
    expect(candidates.length).toBeLessThanOrEqual(3);
  });

  it('T023: units with no movement points and no attack targets return only hold position', () => {
    const state = makeGameState({
      units: {
        'ai-inf': makeUnit('ai-inf', 'player2', 'infantry', '0,0', { movementPoints: 0, hasAttacked: true }),
        'p1-inf': makeUnit('p1-inf', 'player1', 'infantry', '7,7'),
      },
      settlements: {
        'city-ai': makeSettlement('city-ai', '0,1', 'city', 'player2'),
        'city-p1': makeSettlement('city-p1', '7,6', 'city', 'player1'),
      },
    });

    const candidates = generateCandidateActions(state, 'ai-inf', defaultConfig);
    expect(candidates.length).toBe(1);
    expect(candidates[0].action.type).toBe('move');
    if (candidates[0].action.type === 'move') {
      expect(candidates[0].action.path.length).toBe(0);
    }
  });
});
