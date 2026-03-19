# Research: Strategic AI Overhaul & Game Enhancements

All unknowns were resolvable by reading existing source code. No external research required. Decisions below map to each functional requirement group.

---

## Two-Turn City Capture (FR-001 – FR-004)

**Decision**: Add `captureProgress: number` (0 = none, 1 = one turn occupied) and `capturingUnit: string | null` to the `Settlement` type. `resolveCaptures` in `turns.ts` increments progress when the occupying unit matches `capturingUnit`, resets when it changes or tile is vacated, and transfers ownership when progress reaches 2.

**Rationale**: Minimal delta to existing state shape. Settlement already owns all capture-relevant context (owner, tileId). Adding two fields avoids a separate `CaptureState` map, which would require coordinated cleanup.

**Alternatives considered**:
- Separate `captureProgress: Record<string, number>` on `GameState` — rejected; splits logically related data across two structures.
- Keep capture in `Unit` (unit tracks how many turns it has been on a city) — rejected; capture is a property of the city, not the unit. A unit replacement mid-siege should reset progress, which is easier to detect on Settlement.

---

## Capture Progress Visual Indicator (FR-002, FR-004)

**Decision**: In `renderer/renderer.ts`, after rendering settlement sprites, draw a `Graphics` rectangle progress bar on any settlement with `captureProgress === 1`. Bar color reflects the capturing unit's owner color (player = blue, AI = red). Use the existing PixiJS `Graphics` pattern already present in the renderer (grid lines use it).

**Rationale**: Matches existing rendering patterns. No new PixiJS primitives needed.

**Alternatives considered**:
- Text overlay (e.g., "50%") — less visually clear than a bar; Text objects have higher overhead than Graphics.
- Separate PixiJS Container layer — unnecessary; indicator is per-tile and can be rendered inline with the settlement pass.

---

## AI Omniscient Vision (FR-005, FR-006)

**Decision**: In `ai.ts :: computeTurn`, replace the `aiKnownWorld`-based settlement/unit lookups with direct reads from `state.settlements` and `state.units`. Remove the `getKnownSettlements` / `getKnownUnits` filtering pass for objective building. The `aiKnownWorld` structure is kept for backward compatibility but no longer used as the sole source of truth for AI decisions.

**Rationale**: The simplest implementation of omniscience is to read unfiltered state. The AI worker already receives the full `GameState` (not a fog-filtered copy); the filtering was done in `objectives.ts` using `aiKnownWorld`. Removing that filter is a one-site change.

**Alternatives considered**:
- Pass a separate "AI view" state with fog removed — unnecessary indirection; the worker already has full state.
- Keep known world for "memory" of recently seen tiles and supplement with live data — over-engineered; omniscience means no filtering, period.

---

## Strategic AI Phase System (FR-007 – FR-011)

**Decision**: Compute `isOffensivePhase` as a pure boolean at the start of each AI turn:
```
isOffensivePhase =
  aiIncomePerTurn > playerIncomePerTurn &&
  aiMilitaryUnitCount > playerMilitaryUnitCount
```
Pass this flag into `buildObjectives` and `computeUtility` to modulate target priorities. No persistent phase field in `GameState` (computed fresh each turn from observable state).

**Rationale**: Storing phase in state would require managing transitions and could desync from actual income/unit counts. Computing it fresh is idempotent, testable, and correct. Matches the spec's definition exactly.

**Phase behavior**:

| Phase | Objective priorities |
|-------|---------------------|
| Expansion | Neutral cities (high weight), contested cities (block player), unit production, own territory defense |
| Offensive | Player cities and units (high weight), maintain ≥1 defender near own territory |

**Contested city blocking** (FR-008, FR-009): Add a new objective type `'block-capture'` for any neutral or AI-owned city where a player unit is within 3 tiles (Chebyshev). Priority weight = city value × 2. This makes blocking behavior emerge naturally from the existing objective-scoring loop without special-casing.

**Defensive reserve** (FR-011): When in offensive phase, exclude one unit per owned city from the offensive candidate pool — it stays assigned to `'defend'` objective type targeting the nearest own city. Implementation: sort units by distance to nearest own city; first N units (N = owned city count) are given defend objectives only.

**Alternatives considered**:
- Storing `aiPhase` in `GameState` — rejected; computed state is simpler and cannot drift.
- Hard-coded if/else blocks in `computeTurn` — rejected; factoring into `buildObjectives` keeps the search loop clean.

---

## End-Game Scoreboard (FR-012 – FR-015)

**Decision**: Add `gameStats: Record<PlayerId, GameStats>` to `GameState`. `GameStats` accumulates: `unitsProduced`, `unitsLost`, `totalIncomeEarned`, `citiesAtEnd`. Tracking hooks:
- `unitsProduced`: increment in `applyProduce` (state.ts)
- `unitsLost`: increment when a unit's HP reaches 0 in `applyCombat` (state.ts / rules.ts)
- `totalIncomeEarned`: increment in `startTurn` when income is collected (turns.ts)
- `citiesAtEnd`: set at game-over from final settlement ownership count (turns.ts :: checkVictory)

UI: Replace `showVictoryScreen` flow with `showScoreboard(stats, winner)` which renders a side-by-side panel, then a dismiss button that returns to main menu. Scoreboard is shown for both win and loss outcomes.

**Rationale**: Accumulating stats as events happen (rather than scanning state at game end) is simpler and more accurate — no risk of missing transient states. All hook points are already well-defined in the codebase.

**Alternatives considered**:
- Derive stats from `GameState` at game end by scanning history — no history is stored; would require replaying.
- Separate stats service class — over-engineered; a plain record on `GameState` suffices.
