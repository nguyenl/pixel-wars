# Data Model: Alpha-Beta AI Opponent

**Feature**: 006-alpha-beta-ai | **Date**: 2026-03-15

## New Types

### SearchResult

Returned by the search module to the AI orchestrator.

```
SearchResult {
  bestActions: Action[]       -- Ordered sequence of actions for the AI's turn
  searchDepth: number         -- Deepest fully completed iteration
  nodesEvaluated: number      -- Total nodes expanded (for diagnostics)
  timeElapsedMs: number       -- Wall-clock time spent searching
  usedFallback: boolean       -- True if search didn't complete depth 1 and fell back to heuristic
}
```

### CandidateAction

An action paired with its heuristic ordering score, used during move generation.

```
CandidateAction {
  action: Action              -- The game action (move, attack, produce)
  unitId: string              -- The unit this action belongs to
  orderScore: number          -- Heuristic priority score (higher = searched first)
}
```

### EvaluationWeights

Configurable weights for the board evaluation function. Allows tuning without code changes.

```
EvaluationWeights {
  material: number            -- Weight for net unit value (AI - player)
  cityOwnership: number       -- Weight per city owned
  townOwnership: number       -- Weight per town owned
  incomeDifferential: number  -- Weight for income gap
  threatToEnemyCities: number -- Weight for AI units near enemy cities
  undefendedSettlement: number -- Penalty for unprotected AI settlements
  lowHpPenalty: number        -- Penalty for AI units below 50% HP
}
```

### SearchConfig

Configuration for the search algorithm, including time budget.

```
SearchConfig {
  timeBudgetMs: number        -- Maximum wall-clock time for search (default: 2500)
  maxDepth: number            -- Maximum iterative deepening depth cap (default: 20)
  maxCandidatesPerUnit: number -- Top-K moves to consider per unit (default: 5)
  evaluationWeights: EvaluationWeights
}
```

## Modified Types

### GameState (existing, no structural changes)

No new fields. The search operates on `GameState` via `applyAction` without extending the state shape. `aiKnownWorld` already provides the fog-of-war-aware state the search needs.

### Constants (existing, extended)

```
AI_TIME_BUDGET_MS: number     -- Default time budget in milliseconds (2500)
AI_MAX_CANDIDATES: number     -- Default top-K candidates per unit (5)
```

## Entity Relationships

```
SearchConfig ──uses──> EvaluationWeights
     │
     v
  search() ──generates──> SearchResult
     │                        │
     │                        └──contains──> Action[] (existing type)
     │
     ├──calls──> generateCandidateActions() ──produces──> CandidateAction[]
     │                                                        │
     │                                                        └──wraps──> Action (existing)
     │
     ├──calls──> evaluateBoard() ──reads──> GameState (existing)
     │                                          │
     │                                          ├── units (existing)
     │                                          ├── settlements (existing)
     │                                          └── aiKnownWorld (existing)
     │
     └──calls──> applyAction() ──transforms──> GameState → GameState (existing pure reducer)
```

## State Transitions

The search does not introduce new game phases or modify the turn state machine. It replaces the internals of `computeTurn()`:

```
Phase: 'ai'
  │
  ├── [BEFORE] computeTurn: greedy objective assignment → Action[]
  │
  └── [AFTER]  computeTurn:
                 ├── updateKnownWorld(state)
                 ├── search(state, config) → SearchResult
                 │     ├── iterative deepening loop (depth 1, 2, 3, ...)
                 │     │     ├── alpha-beta with move ordering
                 │     │     └── evaluateBoard at leaves
                 │     └── time budget check → return best completed depth
                 └── return SearchResult.bestActions + [EndTurnAction]
```

## Validation Rules

- `SearchConfig.timeBudgetMs` must be > 0
- `SearchConfig.maxDepth` must be ≥ 1
- `SearchConfig.maxCandidatesPerUnit` must be ≥ 1
- All `EvaluationWeights` values must be finite numbers
- `SearchResult.bestActions` must be non-empty (at minimum, fallback heuristic produces actions)
- Every action in `SearchResult.bestActions` must pass `applyAction` validation (guaranteed by construction since search uses `applyAction` to simulate)
