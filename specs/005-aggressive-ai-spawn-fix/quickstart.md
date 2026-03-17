# Quickstart: Aggressive AI & Spawn Render Fix

**Feature**: 005-aggressive-ai-spawn-fix
**Date**: 2026-03-15

## Prerequisites

- Node.js (for npm)
- Repository cloned and on branch `005-aggressive-ai-spawn-fix`

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens the game in a browser at `http://localhost:5173`.

## Testing

```bash
npm test
```

Runs all Vitest tests. AI-specific tests are in `tests/game/ai.test.ts`.

```bash
npm run lint
```

Runs the linter.

## Files to Modify

| File | Change |
|------|--------|
| `src/game/ai/ai.ts` | Add exploration objectives to `buildObjectives()`, remove occupied-tile production check, add aggression mode to `computeTurn()`, improve unit type selection |
| `src/game/ai/scoring.ts` | Add aggression-aware weight overrides to `computeUtility()` |
| `src/renderer/units.ts` | Sync idle animation `baseY` after unit position is set in `render()` |
| `tests/game/ai.test.ts` | Add tests for exploration, production, and aggression behaviors |

## Validation

After implementation, verify:

1. **AI moves**: Start a game, end turns. AI units should move each turn.
2. **AI builds**: After 3 turns, the AI should have produced new units.
3. **AI captures**: After 5 turns, the AI should own more settlements than it started with.
4. **AI attacks**: Place a unit near AI territory and skip turns. AI should attack.
5. **Spawn rendering**: Queue a unit in a city, end turn. The spawned unit should be visible on top of the city.
6. **Tests pass**: `npm test` should pass with no regressions.
