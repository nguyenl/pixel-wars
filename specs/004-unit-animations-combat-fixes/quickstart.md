# Quickstart: Implementing Feature 004

**Branch**: `004-unit-animations-combat-fixes`
**Date**: 2026-03-14

## Prerequisites

- Node.js ≥ 18
- `npm install` already run

## Development commands

```bash
npm test          # Run Vitest unit tests
npm run lint      # TypeScript type check + ESLint
npm run dev       # Vite dev server (hot reload)
npm run build     # Production build
```

## Implementation order (vertical slices — each independently testable)

### Slice 1 — Combat bug fixes (P1)

1. **Write failing tests first** in `tests/game/pathfinding.test.ts`:
   - `getReachableTiles` must NOT include enemy-occupied tiles
2. **Write failing tests first** in `tests/game/rules.test.ts`:
   - `validateMove` must return an error when destination tile is enemy-occupied
3. Fix `src/game/pathfinding.ts` → `getReachableTiles`: add enemy exclusion
4. Fix `src/game/rules.ts` → `validateMove`: block any occupied destination
5. Run `npm test` — all tests pass
6. Manual smoke test: select unit adjacent to enemy → click enemy tile → attack fires, attacker stays in place

### Slice 2 — Unit animations (P2)

1. Add `AnimationController` class at bottom of `src/renderer/units.ts`
2. Wire `AnimationController` to `app.ticker` in `UnitsRenderer` constructor
3. Implement idle bob (continuous Y sinusoidal offset via ticker)
4. Implement `playMove` (linear interpolation along waypoints, chained)
5. Implement `playAttack` (lunge to 40% of target distance, return)
6. Implement `playDeath` (alpha fade)
7. Expose `animateMove()`, `animateAttack()`, `isAnimating()` on `GameRenderer`
8. Update `InputHandler.doMove` and `InputHandler.doAttack` to call animate then update state
9. Update `InputHandler.handleTileClick` to early-return if `renderer.isAnimating()`
10. Manual smoke test: move unit → smooth traversal; attack → lunge+return

### Slice 3 — Tile visual detail (P3)

1. Add `renderTerrainDetail(tile, g, x, y, tileSize)` to `TilemapRenderer`
2. Call it within `renderTiles` after the base fill
3. Visual smoke test: each terrain type shows distinct decorative elements

### Slice 4 — Hover highlight (P3)

1. Add `mousemove` listener in `InputHandler.setupCanvasClick` section
2. Call `renderer.setHoverCoord(coord | null)` from `mousemove` + `mouseleave`
3. Add `hoverCoord` parameter to `TilemapRenderer.render` (4th param, null by default)
4. Update `renderHighlights` to draw hover overlay
5. Update `GameRenderer.render` to pass `this.hoverCoord`
6. Manual smoke test: hover over reachable tile with unit selected → hover glow

### Slice 5 — Sound (P4)

1. Create `src/audio/sound.ts` with `SoundManager`
2. Instantiate in `main.ts`, pass to `InputHandler`
3. Call `sound.playSelect()`, `sound.playMove()`, `sound.playAttack()` at appropriate points in `InputHandler`
4. Manual smoke test: each action produces a distinct brief tone

## Key files at a glance

| File | What changes |
|------|-------------|
| `src/game/pathfinding.ts` | `getReachableTiles` excludes enemy tiles |
| `src/game/rules.ts` | `validateMove` blocks any occupied destination |
| `src/renderer/units.ts` | `AnimationController` + idle/move/attack/death |
| `src/renderer/tilemap.ts` | `renderTerrainDetail` + hover highlight layer |
| `src/renderer/renderer.ts` | `setHoverCoord`, `isAnimating`, `animateMove`, `animateAttack` |
| `src/audio/sound.ts` | NEW: `SoundManager` (Web Audio API synthesis) |
| `src/input/input.ts` | `mousemove` listener, input blocking, sound calls |
| `src/main.ts` | Wire `SoundManager` into `InputHandler` |

## Testing notes

- Game logic tests (`tests/game/`) run in Node via Vitest — no browser needed
- Renderer and animation tests are manual/visual (PixiJS requires a DOM)
- Sound is also manual (requires browser with audio enabled)
- Run `npm test` to verify all game logic tests pass before each PR
