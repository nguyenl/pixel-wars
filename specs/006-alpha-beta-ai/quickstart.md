# Quickstart: Alpha-Beta AI Opponent

**Feature**: 006-alpha-beta-ai | **Date**: 2026-03-15

## Prerequisites

- Node.js (for npm)
- The repository cloned and on branch `006-alpha-beta-ai`

## Setup

```bash
npm install
```

No new dependencies are required — the feature is pure TypeScript game logic.

## Development Workflow

### Run tests

```bash
npm test
```

### Run linting

```bash
npm run lint
```

### Run both (as per CLAUDE.md)

```bash
npm test && npm run lint
```

### Start dev server

```bash
npm run dev
```

Opens the game in browser. Play against the AI to observe its behavior.

## Key Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/game/ai/evaluate.ts` | CREATE | Board evaluation function |
| `src/game/ai/movegen.ts` | CREATE | Move generation with ordering |
| `src/game/ai/search.ts` | CREATE | Alpha-beta search with iterative deepening |
| `src/game/ai/ai.ts` | MODIFY | Wire search into `computeTurn` |
| `src/game/ai/scoring.ts` | MODIFY | Adapt utility functions for move ordering |
| `src/game/constants.ts` | MODIFY | Add `AI_TIME_BUDGET_MS`, `AI_MAX_CANDIDATES` |
| `src/game/types.ts` | MODIFY | Add `SearchResult`, `CandidateAction`, `SearchConfig` types |
| `tests/game/ai/evaluate.test.ts` | CREATE | Evaluation function tests |
| `tests/game/ai/movegen.test.ts` | CREATE | Move generation tests |
| `tests/game/ai/search.test.ts` | CREATE | Search algorithm tests |
| `tests/game/ai.test.ts` | MODIFY | Update integration tests |

## Implementation Order

1. **Board evaluation** (`evaluate.ts` + tests) — no dependencies on other new code
2. **Move generation** (`movegen.ts` + tests) — no dependencies on evaluation
3. **Alpha-beta search** (`search.ts` + tests) — depends on evaluation + move generation
4. **Integration** (modify `ai.ts` + update tests) — wires everything together

## Testing Strategy

Each module is independently testable using crafted `GameState` objects:

- **Evaluation**: Create board states with known advantages, verify scores reflect them
- **Move generation**: Create states with units in various positions, verify candidate actions are correctly generated and ordered
- **Search**: Create simple game states (2-3 units), verify search finds optimal moves within time budget
- **Integration**: Run full `computeTurn` on realistic boards, verify time budget compliance and action quality
