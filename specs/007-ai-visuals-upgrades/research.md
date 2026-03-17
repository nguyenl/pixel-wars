# Research: AI Visuals, Map Expansion & Settlement Upgrades

**Feature**: 007-ai-visuals-upgrades
**Date**: 2026-03-16

## R1: AI Turn Animation Strategy

**Decision**: Reuse existing `AnimationController` (playMove, playAttack, playDeath) for AI unit animations. After `computeTurn()` returns actions, queue them into a sequential playback pipeline that applies each action to game state, triggers the corresponding animation, and waits for completion before proceeding to the next action.

**Rationale**: The animation system already supports move, attack, and death animations with callback-based completion. The missing piece is orchestration — currently AI actions are applied in a tight loop with a 150ms delay between each. Instead, the game loop needs an "AI playback" phase that feeds one action at a time, waits for the animation callback, then proceeds.

**Alternatives considered**:
- **Apply all actions first, then replay visually**: Would require recording before/after state diffs and replaying them. More complex, and state would already be final before animations play, causing inconsistency with fog-of-war reveals.
- **Simultaneous animations**: All AI units move at once. Rejected because the player can't follow multiple simultaneous movements on a large map.

**Key implementation details**:
- Actions from `computeTurn()` are an ordered array ending with `end-turn`
- Each action is applied to state via `applyAction()`, then the renderer animates the result
- Move animations chain waypoint-to-waypoint at 150ms/tile (existing `playMove`)
- Attack animations play the lunge/return sequence (existing `playAttack`)
- Death animations exist in code (`playDeath`) but are currently never called — this feature should activate them
- After all actions animate, `endAiTurn()` is called to transition back to player's turn

---

## R2: AI Computation Threading (Thinking Indicator)

**Decision**: Move AI computation (`computeTurn`) to a Web Worker. The main thread stays free to render the animated thinking indicator during the up-to-5-second computation window.

**Rationale**: `computeTurn` is synchronous and CPU-intensive (alpha-beta search with iterative deepening). Running it on the main thread for up to 5 seconds would freeze the UI completely — no animations, no thinking indicator, no responsiveness. A Web Worker is the only way to keep the main thread responsive during computation.

**Alternatives considered**:
- **Show static indicator, then block**: Simplest approach — use `setTimeout` to let one frame render, then run computation. Rejected because the indicator can't animate (spinner/dots won't move) and the browser may show a "page unresponsive" warning after 5 seconds.
- **Chunked computation with requestAnimationFrame yielding**: Break the search into micro-steps and yield control between frames. Rejected because the alpha-beta search is recursive and deeply nested — restructuring it for cooperative scheduling would be a major refactor with limited benefit over a Web Worker.
- **requestIdleCallback approach**: Not viable for CPU-intensive computation that needs to complete within a deadline.

**Key implementation details**:
- The AI computation is pure logic (no DOM access, no PixiJS dependency) — ideal for a Worker
- The Worker receives serializable game state, returns an action array
- Communication via `postMessage` / `onmessage` (standard Worker API)
- Main thread shows thinking indicator immediately, hides it when Worker posts results
- The thinking indicator should be an animated element (pulsing text or spinner) rendered on the PixiJS stage or as a DOM overlay
- Deadline enforcement (`performance.now()`) already exists in the search and works identically in Workers

---

## R3: Settlement Visual Design

**Decision**: Replace the current diamond shapes with multi-shape drawn graphics using the PixiJS Graphics API. Cities render as a cluster of buildings with a prominent tower. Towns render as 2-3 small houses. Owner color is applied as a colored border or flag element.

**Rationale**: The current diamonds (rotated squares) are functional but don't communicate "city" or "settlement" to the player. Drawing recognizable building silhouettes using the existing Graphics API keeps the approach consistent with how all other tile decorations (trees, mountains, grass tufts) are drawn — no external sprite assets needed.

**Alternatives considered**:
- **External sprite images (PNG files)**: Would provide higher-quality visuals but introduces asset management complexity, loading concerns, and departs from the fully-drawn aesthetic. Rejected for consistency with existing style.
- **Unicode/emoji text rendering**: Simple but inconsistent cross-platform and doesn't support owner coloring well.
- **Keep diamonds but add text labels**: Minimal effort but poor visual distinction at small tile sizes (32px).

**Key implementation details**:
- City graphic: 3-4 rectangles of varying height arranged as buildings, with one taller "tower" in the center. Fill color is a neutral building tone; owner color applied as a border/outline around the building cluster
- Town graphic: 2 small triangular-roof houses side by side. Smaller overall footprint than city. Same owner-color border scheme
- Both graphics centered on the tile, drawn on the settlement layer (above terrain, below units)
- Graphics scale: city occupies ~60% of tile width, town occupies ~40% of tile width
- Owner colors remain: Player 1 blue (0x4488ff), Player 2 red (0xff4444), Neutral gray (0xaaaaaa)

---

## R4: Map Size Doubling & Balance

**Decision**: Double all map dimensions in `MAP_SIZE_CONFIG`. Scale settlement counts and separation distances proportionally to maintain gameplay density. Adjust noise scale for terrain generation.

**Rationale**: Straightforward constant changes. The key consideration is maintaining gameplay balance — a 4× area increase (doubling both dimensions) needs proportionally more settlements to keep the same density of strategic objectives.

**Alternatives considered**:
- **Only increase by 50%**: Less dramatic change, less work. Rejected because the user specifically requested doubling.
- **Add new "huge" size instead**: Keeps existing sizes intact. Rejected because the user explicitly wants existing sizes doubled.

**Key implementation details**:
- New sizes: small 20×20 (400 tiles), medium 30×30 (900 tiles), large 40×40 (1600 tiles)
- Settlement scaling (approximate 4× area → 2-2.5× settlement count):
  - Small: separation 5, 6-8 towns (was: separation 3, 3-4 towns)
  - Medium: separation 7, 10-12 towns (was: separation 4, 5-6 towns)
  - Large: separation 9, 16-20 towns (was: separation 5, 8-10 towns)
- Starting city separation should scale with map size (currently 1.5× minimum separation)
- Noise scale may need reduction (e.g., 0.15 → 0.10) to maintain terrain feature size relative to the larger map
- The Poisson-disk placement algorithm and flood-fill validation work at any size
- Max generation attempts (20) may need increase for larger maps with stricter placement constraints
- Camera/viewport scrolling becomes essential for 40×40 maps at 32px/tile (1280px wide) — verify the existing viewport system handles this

---

## R5: Settlement Upgrade Mechanic

**Decision**: Add a new action type `'upgrade'` alongside existing move/attack/produce/end-turn actions. The upgrade converts a player-owned town to a city for $500. Available through the settlement selection UI panel.

**Rationale**: Follows the existing action pattern — validate, apply, render. The upgrade is essentially a settlement type change with a gold cost. Fits cleanly into the existing action system without new paradigms.

**Alternatives considered**:
- **Automatic upgrade based on turn count or income threshold**: Removes player agency. Rejected because the spec explicitly requires a player-initiated action.
- **Multi-turn upgrade (start upgrade, wait N turns)**: Adds complexity similar to production queue. Rejected for simplicity — the $500 cost is already a significant gate.
- **Upgrade through production queue**: Treating upgrade as a "produced" item. Plausible but conflates two different concepts and prevents a city from producing units and upgrading simultaneously.

**Key implementation details**:
- New action: `{ type: 'upgrade', settlementId: string }`
- Validation rules: phase is 'orders', settlement exists, settlement is a town, owner matches current player, player has ≥$500
- Application: change `settlement.type` from 'town' to 'city', deduct 500 from player funds, clear any existing production queue (N/A for towns currently, but defensive)
- Immediate effects: city income ($100/turn from next turn), unit production capability, increased vision range (3 vs 2)
- UI: "Upgrade to City ($500)" button in the settlement info panel, shown only when conditions met, grayed out with tooltip if insufficient funds
- The visual update is automatic — the renderer reads settlement type from state on each render

---

## R6: AI Upgrade Decision Logic

**Decision**: Add a pre-movement upgrade evaluation to the AI's `computeTurn`. Use a simple heuristic: upgrade a town if the AI has gold exceeding $500 + cost of the cheapest unit (Scout at $100), and the town is strategically valuable (e.g., near the front line, or the AI has fewer than 2 cities).

**Rationale**: The AI should use the upgrade mechanic to match the player's ability. A simple heuristic avoids complex evaluation while still providing reasonable behavior. The gold threshold ensures the AI doesn't spend all its money on upgrades at the expense of unit production.

**Alternatives considered**:
- **Include upgrades in alpha-beta search**: The search already evaluates unit actions. Adding upgrade decisions as tree branches significantly increases branching factor. Rejected for complexity — upgrades are strategic (long-term) decisions, not tactical (per-turn) decisions suited to minimax.
- **Never upgrade (AI-only limitation)**: Simplest but creates an unfair asymmetry.
- **Always upgrade when affordable**: Too aggressive — AI could drain funds before critical unit purchases.

**Key implementation details**:
- Evaluated at the start of `computeTurn`, before unit action computation
- Heuristic priority: towns closest to enemy territory or with the fewest friendly cities nearby
- Gold threshold: `funds >= UPGRADE_COST + CHEAPEST_UNIT_COST` (500 + 100 = 600)
- Maximum one upgrade per turn to avoid draining resources
- Upgrade action inserted at the beginning of the returned action list (before unit moves)

---

## R7: Increased AI Time Budget

**Decision**: Change `AI_TIME_BUDGET_MS` from 2500 to 5000 in constants.

**Rationale**: Direct requirement from spec. With doubled map sizes (up to 40×40 = 1600 tiles), the search space is significantly larger. More time allows deeper iterative deepening, yielding better AI play on larger maps.

**Alternatives considered**: None — this is a straightforward configuration change.

**Key implementation details**:
- Single constant change in `src/game/constants.ts`
- The iterative deepening system and deadline enforcement already handle variable time budgets
- The Web Worker (from R2) ensures this longer computation doesn't block the UI
