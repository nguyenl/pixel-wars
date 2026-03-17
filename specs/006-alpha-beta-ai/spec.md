# Feature Specification: Alpha-Beta AI Opponent

**Feature Branch**: `006-alpha-beta-ai`
**Created**: 2026-03-15
**Status**: Draft
**Input**: User description: "Implement an AI opponent that uses alpha-beta pruning, move ordering, iterative deepening, and a fixed time budget per turn."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Makes Competitive Decisions Within Time Limit (Priority: P1)

The human player faces an AI opponent that evaluates multiple future game states to choose strong moves. The AI completes its entire turn within a fixed time budget, ensuring the game remains responsive and the player never waits excessively for the AI to act.

**Why this priority**: The core value proposition is an AI that plays well and responds promptly. Without both qualities, the feature fails—a slow genius AI or a fast random AI are equally unsatisfying.

**Independent Test**: Start a game and let the AI take its turn. Verify the AI completes all actions (unit movement, attacks, production) within the time budget and that the chosen actions demonstrate look-ahead reasoning (e.g., the AI avoids walking into traps, sets up multi-turn attacks).

**Acceptance Scenarios**:

1. **Given** it is the AI's turn with multiple units on the board, **When** the AI begins its turn, **Then** all AI actions are determined and executed within the configured time budget.
2. **Given** a board state where one move leads to immediate unit loss and another leads to a favorable exchange two turns ahead, **When** the AI evaluates its options, **Then** the AI selects the move that leads to the favorable multi-turn outcome.
3. **Given** the AI has units, production capacity, and funds available, **When** the AI's turn completes, **Then** the AI has issued move, attack, and/or produce actions—not simply ended its turn with idle units.

---

### User Story 2 - AI Searches Deeper When Time Allows (Priority: P2)

The AI uses iterative deepening to search progressively deeper into the game tree. On simpler board states (fewer units, fewer possible moves), the AI naturally searches more moves ahead, leading to stronger play. On complex boards, the AI still produces a reasonable move within the time budget by returning the best result found so far.

**Why this priority**: Iterative deepening ensures the AI always has a move ready (from shallower searches) while improving quality when time permits. This makes the AI robust across all board complexities.

**Independent Test**: Observe AI behavior on a small board (few units) vs. a large board (many units). On the small board the AI should search deeper (visible through stronger play patterns). On the large board the AI should still respond within the time budget.

**Acceptance Scenarios**:

1. **Given** a simple board state with 2-3 units per side, **When** the AI evaluates its turn, **Then** the AI searches deeper than on a complex board state with 8+ units per side, while both complete within the time budget.
2. **Given** any board state, **When** the time budget expires mid-search, **Then** the AI uses the best move found from the deepest fully completed search iteration rather than returning an incomplete or random result.

---

### User Story 3 - AI Prioritizes Promising Moves First (Priority: P2)

The AI evaluates the most promising moves before less promising ones (move ordering), allowing it to prune more of the search tree and effectively search deeper within the same time budget. This makes the AI play noticeably better than a naive search that evaluates moves in arbitrary order.

**Why this priority**: Move ordering directly amplifies the effectiveness of alpha-beta pruning. Without it, the AI wastes time evaluating clearly bad moves and searches shallower, resulting in weaker play.

**Independent Test**: Compare AI decision quality with and without move ordering on the same board state. With move ordering enabled, the AI should find equal or better moves because it searches deeper within the same time budget.

**Acceptance Scenarios**:

1. **Given** a board with multiple possible unit actions, **When** the AI evaluates moves, **Then** capture/attack moves and moves toward objectives are evaluated before passive or retreating moves.
2. **Given** two otherwise identical searches, **When** move ordering is applied, **Then** the search examines fewer total positions (more branches pruned) compared to an unordered search.

---

### User Story 4 - AI Evaluates Board Positions Strategically (Priority: P2)

The AI uses a board evaluation function that considers material advantage (unit count, unit health), positional advantage (territory control, settlement ownership), and strategic factors (threat proximity, production capacity) to score game states. This evaluation drives the quality of the AI's decisions at every level of the search tree.

**Why this priority**: The search algorithm is only as good as its evaluation function. A sophisticated search with a poor evaluator will still make bad decisions. This story ensures the AI "understands" what constitutes a good board position.

**Independent Test**: Present the AI with board states where material and positional advantages conflict (e.g., sacrificing a unit to capture a city). Verify the AI makes contextually appropriate trade-offs.

**Acceptance Scenarios**:

1. **Given** a board where the AI can capture an undefended enemy city by sacrificing a scout, **When** the AI evaluates its options, **Then** the AI chooses to sacrifice the scout for the city capture because the positional gain outweighs the material loss.
2. **Given** two board states—one where the AI has more units but fewer settlements, and another where the AI has fewer units but more settlements—**When** the evaluation function scores both, **Then** it produces distinct scores reflecting the trade-off rather than treating them as equivalent.

---

### Edge Cases

- What happens when the AI has no units and no cities (already lost)? The AI should immediately end its turn or the game should declare victory for the human.
- What happens when the AI has units but no legal moves (all units fully moved/attacked and all cities already producing)? The AI should end its turn promptly without consuming the full time budget.
- What happens when the time budget expires before even the shallowest search completes? The AI should fall back to a heuristic-based move (e.g., the current objective-based logic) rather than making no move at all.
- What happens on the very first turn when the AI has only one unit and one city? The AI should still produce meaningful actions (produce a unit, move the scout) without unnecessary computation.
- How does the AI handle fog of war? The AI should only evaluate based on its known world state, not omniscient game state. Unknown tiles are treated with reasonable assumptions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The AI MUST evaluate game states using a multi-level search that considers opponent responses (look-ahead of at least 2 full turns when time permits).
- **FR-002**: The AI MUST use alpha-beta pruning to eliminate branches of the search tree that cannot influence the final decision, reducing computation without affecting move quality.
- **FR-003**: The AI MUST order moves before evaluation so that the most promising moves (captures, attacks, advances toward objectives) are searched first, maximizing pruning efficiency.
- **FR-004**: The AI MUST use iterative deepening, starting with a shallow search and progressively deepening, so that a valid move is always available regardless of when the time budget expires.
- **FR-005**: The AI MUST complete its entire turn within a fixed time budget. The default time budget MUST be configurable but should default to a value that feels responsive to the player (assumption: 2-3 seconds).
- **FR-006**: The AI MUST evaluate board positions using a scoring function that accounts for material (unit count and health), positional advantage (settlement control, territory), and tactical factors (threats, unit positioning).
- **FR-007**: The AI MUST respect fog of war—it MUST only use information available through its known world state, not the full game state.
- **FR-008**: The AI MUST fall back to a reasonable heuristic move if the time budget expires before the shallowest search depth completes.
- **FR-009**: The AI MUST handle all unit action types: movement, attacks, and production decisions.
- **FR-010**: The AI MUST not degrade the player's experience—the game MUST remain responsive during the AI's turn with visible action execution (unit movements, attacks displayed sequentially).

### Key Entities

- **Search Tree Node**: A snapshot of the game board at a decision point, including available actions and the resulting board state after each action.
- **Board Evaluation**: A numerical score representing how favorable a board state is for the AI, derived from material, positional, and tactical factors.
- **Move Ordering Heuristic**: A ranking system that prioritizes which actions to evaluate first based on estimated quality (captures > advances > retreats).
- **Time Budget**: The maximum wall-clock time the AI is allowed to spend deciding its actions for a single turn.

## Assumptions

- The default time budget is 2-3 seconds per AI turn, which balances competitive play with responsive game feel.
- The AI operates on its known world (fog-of-war-aware) state, treating unseen areas with neutral assumptions rather than cheating with full map knowledge.
- "Turn" in the context of search depth refers to one player's complete set of actions (all unit moves, attacks, and production), not individual unit actions.
- The existing visual action replay system (150ms delays between actions) operates independently of the search time budget—the budget covers decision time only, not animation time.
- Move ordering heuristics are static (based on action type and board heuristics) rather than learned from previous games.
- The search evaluates the AI's best response to the player's best response (minimax paradigm) rather than modeling probabilistic or imperfect-information strategies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The AI completes its decision-making for each turn within the configured time budget (default 2-3 seconds) on all supported map sizes (10x10, 15x15, 20x20).
- **SC-002**: The AI defeats a passive human player (one who does not attack) within 30 turns on a small map, demonstrating proactive strategic play.
- **SC-003**: The AI searches at least 2 full turns ahead (4 plies) on small maps (10x10) within the default time budget.
- **SC-004**: The AI never idles—every AI turn results in at least one meaningful action (move, attack, or produce) when actions are available.
- **SC-005**: The AI makes contextually appropriate trade-offs, choosing positional advantage (capturing settlements) over preserving individual units when strategically beneficial.
- **SC-006**: The game remains visually responsive during AI turns—the player sees unit actions animated sequentially with no perceptible freeze or stutter.
