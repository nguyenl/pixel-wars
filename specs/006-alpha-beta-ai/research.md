# Research: Alpha-Beta AI Opponent

**Feature**: 006-alpha-beta-ai | **Date**: 2026-03-15

## R1: Multi-Unit Minimax in Turn-Based Strategy Games

**Decision**: Sequential unit decision tree (each unit's action = one tree level) instead of full-turn enumeration.

**Rationale**: Full-turn enumeration creates branching factor O(m^n) where m=moves per unit and n=units. For 5 units with 20 moves each, that's 3.2 million branches at depth 1 alone. Sequential unit decisions linearize this to O(n × m) per ply, making alpha-beta pruning tractable within a 2-3 second budget.

**Alternatives considered**:
- **Full-turn enumeration**: Branching factor too large (millions per ply). Rejected.
- **Monte Carlo Tree Search (MCTS)**: More complex to implement, requires tuning exploration/exploitation constants, and random playouts may not terminate within budget on large maps. Better suited for games with very large branching factors (Go). Rejected for being unnecessarily complex per Constitution Principle I.
- **Best-response search**: Only optimize one unit at a time while holding others fixed. Simpler but misses unit coordination (e.g., combined attacks). Rejected for producing weaker play.

## R2: Move Ordering Heuristics for Strategy Games

**Decision**: Static heuristic ordering using action type priority and existing utility scoring.

**Rationale**: Move ordering is critical for alpha-beta efficiency — optimal ordering achieves O(b^(d/2)) vs O(b^d) for random ordering. For this game, effective heuristics are:

1. **Kill shots first**: Attacks that destroy an enemy unit (eliminates opponent's future actions)
2. **Attacks by expected value**: Damage dealt minus expected counterattack damage
3. **Captures**: Moves onto unowned/enemy settlements
4. **Advances**: Moves toward high-value objectives (using existing `computeUtility()`)
5. **Production**: City production actions (always beneficial if affordable)
6. **Retreats/holds**: Low-priority fallbacks

**Alternatives considered**:
- **Killer move heuristic** (remember refutation moves across branches): Adds complexity; the sequential unit structure means killer moves don't transfer well between units. Deferred.
- **History heuristic** (track which moves caused cutoffs historically): Useful in deeper searches but adds bookkeeping overhead. Can be added later if search depth exceeds 4 plies. Deferred.
- **Transposition table ordering**: Hash game states to detect duplicates. Adds memory overhead and hash collision risk. Deferred until profiling shows significant duplicate states.

## R3: Board Evaluation Function Components

**Decision**: Weighted linear evaluation with four components: material, settlements, positional, tactical.

**Rationale**: Linear evaluation functions are fast (thousands of evaluations per second), interpretable, and sufficient for the game's complexity. The existing `scoring.ts` utilities already capture most of these concepts and can be adapted.

**Component weights** (initial values, to be tuned via testing):

| Component | Weight | Description |
|-----------|--------|-------------|
| Material | 1.0 | Sum of (unit_cost × hp/maxHp) for each side. Net = AI - Player |
| City ownership | 5.0 | Per city owned by AI (+) or player (-). Cities are victory condition. |
| Town ownership | 2.0 | Per town owned. Income advantage. |
| Income differential | 0.5 | (AI income - Player income) per turn |
| Threat to enemy cities | 1.0 | AI units within striking distance of player cities |
| Undefended settlements | -1.5 | AI settlements with no nearby friendly units |
| Low HP penalty | -0.5 | AI units below 50% HP |

**Alternatives considered**:
- **Neural network evaluation**: Far too complex, requires training data, violates Simplicity First. Rejected.
- **Piece-square tables** (position-dependent unit values): Common in chess engines but less applicable here since terrain already encodes positional value. Could be added later for unit-terrain synergies. Deferred.

## R4: Time Budget Implementation

**Decision**: `performance.now()` with check-at-expansion pattern.

**Rationale**: The search checks `performance.now()` against the deadline at each node expansion (before generating children). This provides sub-millisecond accuracy with negligible overhead (one comparison per node). When the budget expires mid-iteration of iterative deepening, the search returns the best move from the last fully completed depth.

**Budget allocation** (within the overall 2-3s budget):
- Reserve ~50ms for move generation and ordering at the root
- Reserve ~50ms for fallback heuristic move (if search fails to complete depth 1)
- Remaining ~1900-2900ms for iterative deepening search

**Alternatives considered**:
- **setTimeout / requestAnimationFrame**: Asynchronous approaches would require yielding the main thread. More complex, and the 2-3s budget is short enough that brief main thread blocking is acceptable (animations are paused during AI decision phase anyway). Deferred to a Web Worker approach if user feedback indicates UI jank.
- **Node count budget** (stop after N nodes): Less predictable across hardware. Time-based is more portable. Rejected.

## R5: State Cloning Strategy for Search

**Decision**: Reuse `applyAction` pure reducer as-is. No custom cloning.

**Rationale**: `applyAction(state, action)` returns a new `GameState` without mutating the input. This means each search node naturally gets an independent state by applying an action to its parent's state. The existing function handles all validation, combat resolution, fog updates, and state transitions correctly.

**Performance concern**: `applyAction` recomputes fog of war on every move action. During search, fog recomputation is unnecessary (the AI doesn't need to update visibility for simulated moves). If profiling shows this is a bottleneck, a lightweight `applyActionForSearch` variant that skips fog can be introduced.

**Alternatives considered**:
- **Incremental state updates with undo**: Apply action in-place, then undo after evaluation. Faster but error-prone and breaks the immutability contract. Rejected for correctness risk.
- **Structural sharing (Immutable.js)**: Adds a dependency and conversion overhead. The game state is small enough that plain object copies are fast. Rejected.

## R6: Fog of War in Opponent Modeling

**Decision**: AI searches using its known world state. Opponent modeled with same visible information.

**Rationale**: The spec (FR-007) requires the AI to respect fog of war. For minimax opponent modeling, the AI assumes:
1. Enemy units last seen in fog are still at their last known positions
2. The opponent can see everything the AI has seen (conservative — avoids underestimating opponent)
3. Tiles never seen by the AI are treated as passable terrain with no units

This is a standard "information set" approach for imperfect information games, simplified to avoid the complexity of belief tracking or opponent modeling.

**Alternatives considered**:
- **Perfect information search** (ignore fog): Violates FR-007 and would make the AI cheat. Rejected.
- **Probabilistic belief tracking**: Model probability distributions of enemy positions. Significantly more complex and computationally expensive. Rejected per Simplicity First.
