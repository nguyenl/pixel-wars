# Implementation Plan: Alpha-Beta AI Opponent

**Branch**: `006-alpha-beta-ai` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-alpha-beta-ai/spec.md`

## Summary

Replace the current greedy objective-based AI with a minimax search using alpha-beta pruning, iterative deepening, move ordering, and a configurable time budget. The AI evaluates multi-turn consequences of its actions by simulating both its own and the opponent's best responses through the game tree, producing stronger strategic play while remaining responsive.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: pixi.js 8.x (rendering only — search is pure game logic), simplex-noise 4.x (map generation only)
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x
**Target Platform**: Browser (static files, GitHub Pages)
**Project Type**: Browser game (single-player vs AI)
**Performance Goals**: AI decision-making within 2-3 second time budget across all map sizes (10x10, 15x15, 20x20)
**Constraints**: Main thread execution (no Web Workers in initial implementation); must not freeze UI during search; state cloning must be lightweight for tree exploration
**Scale/Scope**: 3 unit types, up to ~20 units per side on large maps, 3 map sizes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Alpha-beta pruning is the simplest well-known game tree search that meets the requirements. No neural networks, Monte Carlo methods, or learning systems. Move ordering and iterative deepening are standard, minimal-complexity enhancements to alpha-beta. |
| II. Test-First Development | PASS | Evaluation function, move generation, alpha-beta search, and time budget enforcement are all unit-testable via the pure `applyAction` reducer. Tests will be written before implementation per Red-Green-Refactor. |
| III. Vertical Slice Delivery | PASS | Plan delivers in slices: (1) board evaluation function, (2) move generation with ordering, (3) alpha-beta search with iterative deepening and time budget, (4) integration into game loop. Each slice is independently testable. |
| IV. Single-Player First, Multiplayer-Ready | PASS | Search operates on `GameState` through the existing `applyAction` reducer — no player-specific coupling. The AI module's interface (`computeTurn(state) → Action[]`) remains unchanged, so multiplayer transition is unaffected. |
| V. Browser-Only Execution | PASS | All search runs in-browser with no server dependencies. Time budget ensures the main thread is not blocked indefinitely. |

## Project Structure

### Documentation (this feature)

```text
specs/006-alpha-beta-ai/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── ai/
│   │   ├── ai.ts              # MODIFY: Replace computeTurn internals with search-based AI
│   │   ├── scoring.ts          # MODIFY: Retain Objective/utility types; add move ordering heuristic
│   │   ├── evaluate.ts         # NEW: Board evaluation function (material + positional + tactical)
│   │   ├── search.ts           # NEW: Alpha-beta search with iterative deepening and time budget
│   │   └── movegen.ts          # NEW: Legal move generation with ordering for all AI units
│   ├── board.ts               # No changes
│   ├── combat.ts              # No changes
│   ├── constants.ts           # MODIFY: Add AI_TIME_BUDGET_MS constant
│   ├── pathfinding.ts         # No changes
│   ├── rules.ts               # No changes
│   ├── state.ts               # No changes (applyAction is the simulation engine)
│   ├── turns.ts               # No changes
│   └── types.ts               # MODIFY: Add SearchResult type
│   ...

tests/
├── game/
│   ├── ai/
│   │   ├── evaluate.test.ts   # NEW: Board evaluation unit tests
│   │   ├── search.test.ts     # NEW: Alpha-beta, iterative deepening, time budget tests
│   │   └── movegen.test.ts    # NEW: Move generation and ordering tests
│   ├── ai.test.ts             # MODIFY: Update existing tests, add integration tests
│   ...
```

**Structure Decision**: Follows the existing `src/game/ai/` directory pattern. Three new modules (`evaluate.ts`, `search.ts`, `movegen.ts`) separate concerns cleanly: evaluation is independent of search strategy, move generation is independent of evaluation weights, and search orchestrates both. This keeps each module small and testable.

## Design Decisions

### D1: Multi-Unit Turn Representation in Game Tree

**Problem**: Each turn involves multiple units taking multiple actions (move + attack + produce). Enumerating all combinations creates an astronomical branching factor (e.g., 5 units × 20 moves each = 20^5 = 3.2M combinations per turn).

**Decision**: Use **sequential unit decision** approach — each unit's action choice is a separate level in the search tree. Units are processed in a fixed order (sorted by strategic priority: units near enemies first). After all AI units have acted, the tree alternates to the opponent's units.

**Rationale**: This linearizes the branching factor from O(m^n) to O(n×m) where n=units and m=moves per unit. Combined with move ordering (top-K candidates per unit, K≈5), the effective branching factor per level is manageable.

**Alternatives rejected**:
- Full turn enumeration: Combinatorial explosion makes even depth-1 search infeasible on large maps.
- Monte Carlo Tree Search: More complex, requires many random playouts, harder to stay within time budget deterministically.

### D2: Action Abstraction for Move Generation

**Problem**: Each unit has dozens of possible move destinations (reachable tiles via Dijkstra) plus attack targets. Generating all of them per unit creates too many branches.

**Decision**: Generate **top-K candidate actions** per unit (K=5-7) using heuristic scoring:
1. Kill shots (lethal attacks) — always included
2. Attacks on adjacent/reachable enemies — sorted by expected damage
3. Moves toward highest-value objectives — sorted by utility score
4. Production actions at owned cities
5. Hold position (no-op) — always included as baseline

**Rationale**: The existing `scoring.ts` utility functions already rank objectives well. Reusing them for move ordering provides good pruning with minimal new code.

### D3: Board Evaluation Function Design

**Problem**: Alpha-beta search needs a static evaluation function to score leaf/terminal nodes.

**Decision**: Weighted linear combination of:
- **Material**: Sum of unit values (HP-weighted) for each side. Unit value = production cost × (currentHP / maxHP).
- **Settlements**: City ownership (high weight) + town ownership (moderate weight) + income differential.
- **Positional**: Units threatening enemy settlements, units near center/objectives.
- **Tactical**: Undefended settlements penalty, units at low HP penalty.

Score = AI_material - Player_material + settlement_score + positional_score + tactical_score

**Rationale**: Linear evaluation is fast to compute (critical for thousands of evaluations per search), easy to tune, and well-understood in game AI literature.

### D4: Time Budget Enforcement

**Problem**: Iterative deepening must respect a wall-clock time budget and return the best result found so far.

**Decision**: Use `performance.now()` timestamps. Check time remaining at each node expansion. When budget expires:
1. If at least depth-1 search completed: return that result.
2. If no search completed: fall back to heuristic move generation (current objective-based logic from existing `ai.ts`).

**Rationale**: `performance.now()` is high-resolution and available in all target browsers. Checking at node expansion (not per-node) balances accuracy with overhead.

### D5: State Simulation Strategy

**Problem**: Alpha-beta requires simulating actions on game state copies. Full deep cloning of `GameState` at every tree node is expensive.

**Decision**: Use the existing `applyAction` pure reducer for simulation. Since `applyAction` already returns a new state object without mutating the input, it is the simulation engine. No additional cloning needed.

**Rationale**: `applyAction` is already tested, correct, and handles all edge cases (validation, fog recomputation, combat resolution). Reusing it avoids duplicating game logic and prevents simulation/real divergence bugs.

**Optimization**: Skip fog-of-war recomputation during search (it's only needed for rendering and AI known world updates, not for move legality). This can be deferred if profiling shows it's a bottleneck.

### D6: Opponent Modeling Under Fog of War

**Problem**: The AI can't see the full board due to fog of war. How does it model the opponent's response in minimax?

**Decision**: The AI searches using its **known world state** (`aiKnownWorld`). For the opponent's simulated turn, the AI assumes the opponent has full visibility of tiles the AI has seen (conservative assumption). Enemy units last seen but currently in fog are assumed to still be at their last known position.

**Rationale**: This matches the spec requirement (FR-007). Assuming enemies haven't moved from last-seen positions is a reasonable heuristic that doesn't require complex belief tracking.

## Complexity Tracking

No constitution violations requiring justification.
