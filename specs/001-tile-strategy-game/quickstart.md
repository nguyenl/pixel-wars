# Quickstart: Tile-Based Strategy Game (Feature 001)

**Branch**: `001-tile-strategy-game`

## Prerequisites

- Node.js 20+ (LTS)
- npm 10+

## First-Time Setup

```bash
# From repo root
npm create vite@latest . -- --template vanilla-ts
npm install
npm install pixi.js @pixi/tilemap simplex-noise
npm install -D vitest @vitest/ui
```

> **Note**: The `npm create vite` command scaffolds the project in place. Answer "yes" when prompted about overwriting the directory.

## Development

```bash
npm run dev        # Start Vite dev server at http://localhost:5173
npm run test       # Run Vitest in watch mode
npm run test:ui    # Open Vitest browser UI
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

## Project Layout

```
pixel-wars/
├── public/assets/tiles/        # Tile spritesheets and images
├── src/
│   ├── main.ts                 # Entry point: game loop
│   ├── game/                   # Pure game logic (no PixiJS imports allowed)
│   │   ├── types.ts            # Re-exports from contracts/game-state.ts
│   │   ├── state.ts            # GameState factory + applyAction reducer
│   │   ├── board.ts            # Grid utilities (tile ID, adjacency, distance)
│   │   ├── rules.ts            # Move/attack/produce validation
│   │   ├── mapgen.ts           # Procedural map generation (Simplex noise)
│   │   ├── turns.ts            # Turn phase state machine + income collection
│   │   └── ai/
│   │       ├── ai.ts           # AI entry: GameState → Action[]
│   │       └── scoring.ts      # Utility scoring functions
│   ├── renderer/               # PixiJS rendering (reads state, never writes)
│   │   ├── renderer.ts         # PixiJS Application setup
│   │   ├── tilemap.ts          # Tile and terrain rendering
│   │   ├── units.ts            # Unit sprite management
│   │   ├── fog.ts              # Fog-of-war overlay
│   │   └── ui.ts               # HUD, menus, victory screen
│   ├── input/
│   │   └── input.ts            # Mouse/keyboard → Action dispatcher
│   └── utils/
│       └── rng.ts              # Mulberry32 seeded PRNG
├── tests/
│   ├── game/                   # Unit tests (no PixiJS; pure game logic only)
│   │   ├── rules.test.ts
│   │   ├── combat.test.ts
│   │   ├── mapgen.test.ts
│   │   ├── turns.test.ts
│   │   └── ai.test.ts
│   └── utils/
│       └── rng.test.ts
├── specs/001-tile-strategy-game/   # This feature's design artifacts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pixel-wars/',   // Required for GitHub Pages deployment
});
```

## Vitest Configuration

Add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pixel-wars/',
  test: {
    environment: 'node',   // Game logic tests run in Node — no DOM/canvas needed
    include: ['tests/**/*.test.ts'],
  },
});
```

## GitHub Pages Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npm run build
      - uses: actions/deploy-pages@v4
        with: { artifact_path: dist }
```

## Key Architectural Rules

1. **`src/game/` is PixiJS-free.** Never import from `pixi.js` or `@pixi/tilemap` in any file under `src/game/`. This is enforced by convention and checked in code review.

2. **All game state is serializable.** `GameState` and all nested types must be plain JSON-serializable objects. No `Map`, `Set`, class instances, or functions stored in state.

3. **Tests use game logic only.** All files under `tests/` import exclusively from `src/game/` and `src/utils/`. No renderer imports in tests.

4. **Actions are the single input channel.** The only way to advance game state is via `applyAction(state, action)`. Neither the renderer nor the input layer touches state directly.

5. **Seeded RNG everywhere.** Use `mulberry32` from `src/utils/rng.ts` for all randomness in map generation and AI decisions. Never call `Math.random()` in game logic.

## Running Tests for the First Time (TDD Workflow)

```bash
npm run test -- --reporter=verbose

# Write a failing test in tests/game/rules.test.ts
# Verify it fails (RED)
# Implement the feature in src/game/rules.ts
# Verify it passes (GREEN)
# Refactor without breaking tests
```

## Map Generation Debug

The map seed is stored in `GameState.mapSeed`. To reproduce a specific map:

```typescript
const state = engine.newGame('medium', 42);
console.log(state.mapSeed); // 42
```

Pass the same seed to `newGame` to get the identical map.
