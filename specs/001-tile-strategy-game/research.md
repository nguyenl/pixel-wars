# Research: Tile-Based Strategy Game (Feature 001)

**Branch**: `001-tile-strategy-game` | **Date**: 2026-03-14
**Purpose**: Resolve all NEEDS CLARIFICATION items from Technical Context before Phase 1 design.

---

## 1. Technology Stack

### 1.1 Language

**Decision**: TypeScript 5.x

**Rationale**: The game domain has a naturally complex state model — grid coordinates, unit stats, turn phases, action resolution, fog-of-war layers — where type mismatches are silent in JavaScript and surface only at runtime in hard-to-reproduce states. TypeScript catches coordinate-system bugs (world vs screen vs tile), wrong field access on union types, and missing fields in serialized state at compile time. The future multiplayer-ready requirement strengthens this: typed message schemas and state interfaces serve as the protocol contract between client and server. Runtime cost is zero (TypeScript compiles to plain JavaScript); dev iteration cost with Vite is negligible (esbuild strips types inline, no separate `tsc` watch).

**Alternatives considered**: Plain JavaScript — lower initial friction but becomes a long-term liability for a growing game system where state shape errors are the dominant bug class.

---

### 1.2 Rendering Library

**Decision**: PixiJS 8.x

**Rationale**: PixiJS is a *renderer*, not a game framework. This is its key architectural advantage: it provides no built-in game loop, scene management, physics, or state machine — it forces a clean boundary between game logic and rendering code. The game state layer (`src/game/`) can be pure TypeScript with zero PixiJS dependency, enabling headless testing and future server-side simulation without a canvas. The `@pixi/tilemap` plugin handles tile grids with WebGL batching; a 20×20 grid (400 tiles) is trivially fast. Bundle size is ~450 KB minified — approximately 3× smaller than Phaser. Full GitHub Pages compatibility (static JS bundle, no server).

**Simpler alternative evaluated**: Vanilla HTML5 Canvas has zero bundle cost and perfect architectural separation. Rejected because it requires writing sprite batching, dirty-rect optimization, and tilemap draw calls from scratch — an estimated 500+ lines of infrastructure code with ongoing maintenance for a solo dev. PixiJS eliminates that cost without coupling game logic to the library.

**Alternatives considered**: Phaser 3 — excellent all-in-one framework but its built-in scene graph, physics, and input systems couple game logic to the framework, working against the multiplayer-ready separation requirement. Kaboom/Kaplay — designed for action/jam games; strategy game patterns are poorly documented.

---

### 1.3 Build Tool

**Decision**: Vite 6.x

**Rationale**: Vite provides native TypeScript support (esbuild strips types inline), sub-second dev server startup, HMR, and static production builds via Rollup with tree-shaking. GitHub Pages deployment is well-documented with a single `base` config option. The `vite.config.ts` for a vanilla TypeScript game is under 10 lines.

**Alternatives considered**: esbuild standalone — fastest raw compilation but requires manually building a dev server and HMR; appropriate as Vite's internal engine, not as a solo-dev tool. Parcel — zero-config but slower builds and smaller plugin ecosystem than Vite in 2026.

---

### 1.4 Testing Framework

**Decision**: Vitest 2.x

**Rationale**: Vitest reuses `vite.config.ts` directly — no separate Jest config, no Babel transpilation, no module aliasing duplicated across configs. Native ESM + TypeScript support with esbuild transforms inline. 10–20× faster than Jest in watch mode for TypeScript projects, which matters when developing AI logic that requires rapid iteration. Jest-compatible API (`describe`, `it`, `expect`, `vi.fn()`). The entire `src/game/` logic layer contains zero PixiJS imports, so all game logic tests run in Node without a browser shim.

**Alternatives considered**: Jest — incumbent standard, still correct for legacy codebases, but requires additional configuration (ESM transform, TypeScript preset, separate config file) that Vitest eliminates. No compelling reason to choose Jest for a greenfield Vite/TypeScript project.

---

## 2. Project Structure

**Decision**: Logic-first layered structure with a strict rendering boundary.

**Rationale**: The multiplayer-ready constitution requirement mandates that `src/game/` contains zero rendering imports. Game state must be serializable plain objects. This is what enables future headless simulation (server-side validation, AI computation, replay) without loading PixiJS.

**Key structural rule**: `src/game/` imports only from other `src/game/` files. `src/renderer/` imports `src/game/` types read-only. `src/input/` is the only layer that bridges user events to game actions. `main.ts` owns the game loop.

```
pixel-wars/
├── public/assets/tiles/        # Tile spritesheets (served as-is)
├── src/
│   ├── main.ts                 # Entry: game loop wiring
│   ├── game/                   # PURE LOGIC — zero renderer imports
│   │   ├── types.ts            # GameState, Tile, Unit, Player, Action types
│   │   ├── state.ts            # GameState factory + reducer (applyAction)
│   │   ├── board.ts            # Grid utilities, coordinate transforms
│   │   ├── actions.ts          # Action constructors and validators
│   │   ├── rules.ts            # Move validation, combat resolution
│   │   ├── mapgen.ts           # Procedural map generation
│   │   ├── turns.ts            # Turn phase state machine
│   │   └── ai/
│   │       ├── ai.ts           # Entry: GameState → Action[]
│   │       └── scoring.ts      # Utility scoring functions
│   ├── renderer/               # RENDERING — reads state, draws it
│   │   ├── renderer.ts         # PixiJS Application setup
│   │   ├── tilemap.ts          # Tile layer rendering
│   │   ├── units.ts            # Unit sprite rendering
│   │   ├── fog.ts              # Fog-of-war overlay
│   │   └── ui.ts               # HUD, menus, turn indicators
│   ├── input/
│   │   └── input.ts            # Mouse/keyboard → Action dispatcher
│   └── utils/
│       └── rng.ts              # Mulberry32 seeded PRNG
├── tests/
│   ├── game/                   # Unit tests for src/game/ only
│   └── utils/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Procedural Map Generation

### 3.1 Terrain Generation Algorithm

**Decision**: Simplex noise (via `simplex-noise` npm package, ~4 KB) with threshold bucketing.

**Rationale**: Produces naturally clustered terrain without complex rule tuning. On a 20×20 grid, a full noise pass runs in < 1 ms. Threshold mapping gives direct control over terrain coverage ratios, tunable by adjusting constants.

Target coverage ratios:
- Water: 20–25% (creates separation, not too isolating)
- Mountains: 10–15%
- Plains: 25–30%
- Grasslands: 20–25%
- Forests: 15–20%

**Alternatives considered**: Cellular automata — produces too many single-tile islands on small grids; requires many smoothing passes. Random flood fill / Voronoi — produces unnatural "blobs"; hard to tune for small grids. Wave Function Collapse — significant upfront rule authoring for 5 terrain types; overkill for this scope.

---

### 3.2 Connectivity Guarantee

**Decision**: Flood-fill check from each player's starting city; full regeneration on failure (max 20 attempts with `seed + attempt` offset).

**Rationale**: Correct by construction. Flood fill on a 20×20 grid takes < 1 ms. Noise-based maps fail connectivity ~10–20% of the time; worst-case 20 attempts = < 50 ms total — negligible against the 5-second startup budget.

**Alternatives considered**: Post-processing water to bridge isolated regions — produces unnatural results. Graph-based spanning-tree terrain — more complex and constrains terrain variety.

---

### 3.3 Settlement Placement

**Decision**: Minimum-distance spacing (Poisson-disk-lite) with seeded-shuffle candidate selection.

Minimum separation by map size:
- Small (10×10): 3 tiles
- Medium (15×15): 4 tiles
- Large (20×20): 5 tiles

Cities placed first with 1.5× minimum distance; towns fill remaining eligible (non-water, non-mountain) tiles.

Suggested settlement counts:
- Small: 2 cities + 3–4 towns
- Medium: 2 cities + 5–6 towns
- Large: 2 cities + 8–10 towns

---

### 3.4 Starting Position Placement

**Decision**: Maximally distant city pair (Euclidean distance, O(n²) over city list — trivially fast for ≤6 cities).

**Rationale**: Guarantees maximum strategic distance. With minimum 2 cities on the map, the pair is automatically determined.

---

### 3.5 Seeded RNG

**Decision**: Mulberry32 — a ~10-line pure JavaScript seeded PRNG. No external dependency.

```typescript
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Seed generated from `Date.now()` at game start. Enables bug reproduction and future seed-sharing.

**Alternatives considered**: `Math.random()` — not reproducible. LCG — poor statistical quality in low bits. `seedrandom.js` — 2 KB dependency for equivalent results achievable in 10 lines.

---

## 4. AI Opponent

### 4.1 AI Approach

**Decision**: Layered rule-based outer loop + utility scoring per unit action.

**Rationale**: Minimax is intractable at this scale (branching factor ~10^10 for 10 units × 10 actions each). Pure rule-based AI is fast but brittle at the margins. Utility scoring handles overlapping concerns gracefully via weighted sums with O(units × objectives) cost per turn — negligible on a 20×20 grid.

The outer loop determines global phase (e.g., "is the AI under existential threat?"); utility scoring ranks individual unit decisions within each phase.

**Alternatives considered**: Minimax — intractable. MCTS — viable but adds significant implementation complexity; better for hidden-information multiplayer. Pure rule-based — becomes unwieldy as unit count grows.

---

### 4.2 Decision Priority Order (per unit)

1. **Retreat** if HP ≤ 25% and cannot secure a kill this turn
2. **Attack for kill** if an enemy unit can be destroyed in one hit (deterministic — always calculable)
3. **Attack if advantageous** (damage dealt > counter-damage received; Artillery always qualifies for ranged attacks)
4. **Capture** if on or adjacent to an unowned settlement not already claimed by another AI unit
5. **Move toward highest-utility objective** (via utility scoring)
6. **Wait** if no beneficial action exists

Scouts de-prioritize combat via unit-type utility weights; their primary utility is scouting unexplored tiles.

---

### 4.3 Unit Assignment

**Decision**: Greedy assignment by utility score with a `claimedObjectives` set, evaluated in unit-initiative order.

Utility function inputs per (unit, objective) pair:
- Distance (inverse — closer is better)
- Unit type fit (Scout → scouting; Infantry → capture; Artillery → ranged attack)
- Objective value (city income, enemy HP remaining, strategic position)
- Threat level at objective

O(units × objectives) per turn — negligible for ≤15 AI units.

---

### 4.4 Fog of War for AI

**Decision**: Memory-based partial cheat — AI maintains a `knownWorld` state (last-seen tile info), updates it each turn from its units' vision, and plans based on remembered (potentially stale) positions.

**Rationale**: Balances fairness (AI cannot react to units it has never scouted) with implementation simplicity (no probabilistic tracking needed).

**Alternatives considered**: Full cheat (AI sees everything) — rejected for the "psychic AI" problem. Full fair play (AI respects fog exactly) — also valid and slightly more fair; chosen "memory-based" as the middle ground for implementation simplicity.

---

### 4.5 Pathfinding

**Decision**: Dijkstra for movement range calculation; A* for point-to-point navigation.

| Task | Algorithm | Why |
|------|-----------|-----|
| Highlight reachable tiles | Dijkstra | No destination; explores all tiles within budget |
| Navigate unit to objective | A* with Manhattan heuristic | Goal known; heuristic prunes search |
| Multiple AI units to one destination | Dijkstra from destination (flow field) | Precompute once for all units |

**Note**: On a ≤400-tile grid, the performance difference between algorithms is imperceptible (both complete in microseconds). The distinction matters for correctness, not performance.

---

## 5. Resolved NEEDS CLARIFICATION Items

| Item | Resolution |
|------|------------|
| Language | TypeScript 5.x |
| Rendering | PixiJS 8.x |
| Build tool | Vite 6.x |
| Testing | Vitest 2.x |
| Seeded RNG | Mulberry32 (inline, no dependency) |
| Terrain generation | Simplex noise + threshold bucketing |
| Connectivity guarantee | Flood fill + regeneration loop |
| Settlement placement | Minimum-distance Poisson-disk-lite |
| Starting positions | Maximally distant city pair |
| AI strategy | Rule-based + utility scoring |
| Pathfinding | Dijkstra (range) + A* (navigation) |
| AI fog of war | Memory-based known-world state |
| Map sizes | Small=10×10, Medium=15×15, Large=20×20 |
| Income values | Town=$50/turn, City=$100/turn |
| Unit costs | Scout=$100, Infantry=$200, Artillery=$300 |
