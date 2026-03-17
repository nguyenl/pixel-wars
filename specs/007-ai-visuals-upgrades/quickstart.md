# Quickstart: AI Visuals, Map Expansion & Settlement Upgrades

**Feature**: 007-ai-visuals-upgrades
**Date**: 2026-03-16

## Prerequisites

- Node.js (for npm)
- Browser with Web Worker support (all modern browsers)

## Setup

```bash
npm install
npm run dev
```

## Development Workflow

```bash
# Run tests
npm test

# Run linting
npm run lint

# Run both (as per CLAUDE.md)
npm test && npm run lint
```

## Key Files to Modify

### AI Turn Animation & Thinking Indicator
- `src/main.ts` — Game loop; orchestrate AI turn phases (thinking → animating → complete)
- `src/game/ai/ai.ts` — Entry point for `computeTurn()`; adapt for Worker communication
- `src/renderer/units.ts` — `AnimationController`; no changes needed (reuse existing playMove/playAttack/playDeath)
- `src/renderer/renderer.ts` — Add thinking indicator overlay; coordinate animation playback
- **New**: `src/game/ai/ai.worker.ts` — Web Worker wrapping `computeTurn` for off-main-thread computation

### Settlement Visuals
- `src/renderer/tilemap.ts` — Replace diamond drawing code with city/town building graphics

### Map Size Doubling
- `src/game/constants.ts` — Update `MAP_SIZE_CONFIG`, settlement placement parameters
- `src/game/mapgen.ts` — Verify/adjust noise scale and generation attempts for larger maps

### Settlement Upgrade
- `src/game/types.ts` — Add `UpgradeAction` to action union type
- `src/game/rules.ts` — Add `validateUpgrade()` and `applyUpgrade()`
- `src/game/constants.ts` — Add `UPGRADE_COST` constant
- `src/game/ai/ai.ts` — Add upgrade evaluation heuristic
- `src/renderer/ui.ts` — Add "Upgrade to City" button in settlement panel
- `src/input/input.ts` — Handle upgrade action dispatch

### AI Time Budget
- `src/game/constants.ts` — Change `AI_TIME_BUDGET_MS` from 2500 to 5000

## Testing Strategy

```bash
# Unit tests for new upgrade action validation/application
npm test -- --grep "upgrade"

# Unit tests for map generation at new sizes
npm test -- --grep "mapgen"

# All tests
npm test
```

## Architecture Notes

- **Game logic is pure** — no DOM or PixiJS dependencies in `src/game/`. This makes it safe to run in a Web Worker.
- **Renderer is read-only** — it reads game state and renders. It never mutates game state.
- **AnimationController is callback-based** — animations signal completion via `onComplete` callbacks, not Promises.
- **Actions are validated then applied** — all state mutations go through `validateAction()` → `applyAction()` in `rules.ts`.
