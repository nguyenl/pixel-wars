# Implementation Plan: Game Improvements

**Branch**: `002-game-improvements` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-game-improvements/spec.md`

## Summary

Six gameplay and visual improvements are applied to the existing tile-based strategy game: viewport centering, pixel-art unit sprites, one starting Scout per player, settlement-based fog-of-war vision, and hardened map-generation constraints (full settlement connectivity + enforced opposite-side starting positions). The changes are confined to four game-logic modules and three renderer modules, with no new public TypeScript types introduced and no breaking changes to the `GameState` schema.

---

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: PixiJS 8.x, `@pixi/tilemap` 4.x, `simplex-noise` 4.x, Vitest 2.x
**Storage**: N/A — browser-only, no persistence
**Testing**: Vitest 2.x (`npm test`); type-checking via `tsc --noEmit` (`npm run lint`)
**Target Platform**: Browser (static files; GitHub Pages compatible)
**Project Type**: Browser-based single-player strategy game
**Performance Goals**: Map generation completes within the existing 5-second new-game budget; game renders at 60 fps on medium maps
**Constraints**: Fully static file serving (no server); all assets must be bundled or served from `public/`
**Scale/Scope**: Single-player vs AI; maps up to 20 × 20 tiles; 3 unit types; 2 players

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Simplicity First ✅

All changes are additive extensions to existing modules. No new abstractions, patterns, or layers are introduced. The settlement-vision change is ~10 lines appended to `recomputeFog`. The centering change adds one `Container` wrapper and one arithmetic formula. No over-engineering.

### II. Test-First Development ✅

Each user story has a corresponding test target. Tests are to be written before implementation code for every changed behaviour:
- `fog.test.ts`: settlement vision cases
- `mapgen.test.ts`: full connectivity, opposite-sides constraint
- `state.test.ts` (new): starting scouts exist; funds unchanged; turn-1 fog includes scouts + cities

### III. Vertical Slice Delivery ✅

Each user story (P1–P5) is independently implementable and testable without the others. Delivery order follows priority (P1 → P2 → P3 → P4 → P5).

### IV. Single-Player First, Multiplayer-Ready ✅

Settlement vision is indexed by `PlayerId` (already per-player in `FogMap`). Starting scouts are placed per-player. Map generation produces a deterministic, serializable state. No hardcoded player counts — `['player1', 'player2'] as const` loop is data-driven and can scale to N players.

### V. Browser-Only Execution ✅

Pixel art sprites are static PNG files served from `public/`. PixiJS `Assets.load()` fetches them at startup. No server calls, no runtime generation. All changes remain within the static-file constraint.

**No violations. No Complexity Tracking table required.**

---

## Project Structure

### Documentation (this feature)

```text
specs/002-game-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── module-contracts.md   # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code

```text
src/
├── main.ts                     # Unchanged
├── game/
│   ├── types.ts                # Unchanged
│   ├── constants.ts            # +SETTLEMENT_VISION constant
│   ├── state.ts                # +starting scout injection in newGame()
│   ├── board.ts                # Unchanged
│   ├── mapgen.ts               # +full connectivity check, +opposite-sides check
│   ├── fog.ts                  # +settlement vision loop in recomputeFog()
│   ├── rules.ts                # Unchanged
│   ├── combat.ts               # Unchanged
│   ├── turns.ts                # Unchanged
│   ├── pathfinding.ts          # Unchanged
│   └── ai/
│       ├── ai.ts               # Unchanged
│       └── scoring.ts          # Unchanged
├── renderer/
│   ├── renderer.ts             # +worldContainer, +centering, +sprite asset loading
│   ├── tilemap.ts              # Constructor: Application → Container
│   ├── units.ts                # +Sprite rendering replacing Graphics circles; Constructor: Application → Container
│   ├── fog.ts                  # Constructor: Application → Container
│   └── ui.ts                   # Unchanged
└── input/
    └── input.ts                # +world-offset subtraction in click-to-tile conversion

public/
└── assets/
    └── sprites/
        └── units/
            ├── scout.png       # NEW: 24×24 px pixel art (white base)
            ├── infantry.png    # NEW: 24×24 px pixel art (white base)
            └── artillery.png   # NEW: 24×24 px pixel art (white base)

tests/
├── game/
│   ├── fog.test.ts             # +settlement vision test cases
│   ├── mapgen.test.ts          # +full connectivity, +opposite-sides test cases
│   ├── state.test.ts           # NEW: starting scouts, funds, turn-1 fog
│   └── [others unchanged]
└── utils/
    └── rng.test.ts             # Unchanged
```

**Structure Decision**: Single-project (Option 1). All code lives in `src/`; tests mirror structure in `tests/`. No additional packages or workspaces needed.

---

## Implementation Guide (by User Story Priority)

### P1 — Map: Connected & Opposed Starting Positions

**Files**: `src/game/mapgen.ts`

**Changes**:

1. **Full connectivity check** — after the existing `reachable.has(city2TileId)` check, add:
   ```typescript
   const allSettlementTileIds = Object.values(settlementsCopy).map(s => s.tileId);
   if (!allSettlementTileIds.every(tid => reachable.has(tid))) continue;
   ```

2. **Opposite-sides check** — after the connectivity check:
   ```typescript
   const c1 = tilesCopy[settlementsCopy[startingCities['player1']].tileId].coord;
   const c2 = tilesCopy[settlementsCopy[startingCities['player2']].tileId].coord;
   const sameColHalf = Math.abs(c1.col - c2.col) < cols / 2;
   const sameRowHalf = Math.abs(c1.row - c2.row) < rows / 2;
   if (sameColHalf && sameRowHalf) continue;
   ```

**Tests** (write first, in `tests/game/mapgen.test.ts`):
- Generate 10 maps per size; assert ALL settlement tiles are in the flood-fill set from city1
- Generate 10 maps per size; assert `|c1.col - c2.col| >= cols/2 OR |c1.row - c2.row| >= rows/2`

---

### P2 — Starting Scout per Player

**Files**: `src/game/state.ts`, `src/game/constants.ts` (import only)

**Changes** in `newGame()` — between `generateMap()` call and `GameState` construction:

```typescript
import { UNIT_CONFIG, MAP_SIZE_CONFIG, STARTING_FUNDS } from './constants';
import type { Unit, PlayerId } from './types';

// Build starting scouts
const startingUnits: Record<string, Unit> = {};
const tilesWithScouts = { ...generated.tiles };
(['player1', 'player2'] as PlayerId[]).forEach((pid, idx) => {
  const cityId = generated.startingCities[pid];
  const cityTileId = generated.settlements[cityId].tileId;
  const unitId = `unit-start-${idx}`;
  const unit: Unit = {
    id: unitId, type: 'scout', owner: pid, tileId: cityTileId,
    hp: UNIT_CONFIG.scout.maxHp, movementPoints: UNIT_CONFIG.scout.movementAllowance,
    hasAttacked: false,
  };
  startingUnits[unitId] = unit;
  tilesWithScouts[cityTileId] = { ...tilesWithScouts[cityTileId], unitId };
});

// Then use tilesWithScouts and startingUnits in state construction
const state: GameState = {
  ...
  tiles: tilesWithScouts,
  units: startingUnits,
  ...
};
```

**Tests** (write first, in `tests/game/state.test.ts` — new file):
- `newGame()` returns state with exactly 2 units
- Both are scouts
- Each is on its player's starting city tile
- `player1.funds === STARTING_FUNDS` and `player2.funds === STARTING_FUNDS`
- Turn-1 fog for player1 has visible tiles around the starting city (confirms scouts + settlement vision active)

---

### P3 — Settlement Vision

**Files**: `src/game/constants.ts`, `src/game/fog.ts`

**`constants.ts`** — add after `SETTLEMENT_INCOME`:
```typescript
export const SETTLEMENT_VISION: Record<SettlementType, number> = {
  city: 3,
  town: 2,
};
```

**`fog.ts`** — add at the end of `recomputeFog`, after the unit vision loop:
```typescript
import { UNIT_CONFIG, SETTLEMENT_VISION } from './constants';

// Settlement vision
for (const settlement of Object.values(state.settlements)) {
  if (settlement.owner !== playerId) continue;
  const settTile = state.tiles[settlement.tileId];
  if (!settTile) continue;
  const range = SETTLEMENT_VISION[settlement.type];
  for (const [tid, tile] of Object.entries(state.tiles)) {
    if (chebyshevDistance(settTile.coord, tile.coord) <= range) {
      newFog[tid] = 'visible';
    }
  }
}
```

**Tests** (write first, additions to `tests/game/fog.test.ts`):
- Player owning a city with no units: tiles within 3 Chebyshev tiles are `'visible'`
- Player owning a town with no units: tiles within 2 Chebyshev tiles are `'visible'`
- Enemy-owned city: no vision granted to opponent
- Neutral city: no vision to either player
- Captured city: new owner gains vision, former owner loses it (in the next `recomputeFog` call)

---

### P4 — Pixel Art Unit Sprites

**Files**: `src/renderer/renderer.ts`, `src/renderer/units.ts`, `src/renderer/tilemap.ts`, `src/renderer/fog.ts`, `src/input/input.ts`, `public/assets/sprites/units/*.png`

**Step 4a — Create assets** (do this first; unblocks rendering work):
- Create 3 × 24 × 24 px PNGs at `public/assets/sprites/units/`
- White/light base colors; transparent background

**Step 4b — Sub-renderer constructor signature change**:

All three renderers (`TilemapRenderer`, `UnitsRenderer`, `FogRenderer`) change their first constructor argument from `Application` to `Container`. Their internal coordinate calculations (tile positions) are unchanged.

```typescript
// Old:
constructor(private app: Application, private tileSize: number) {
  // draws to app.stage
}
// New:
constructor(private container: Container, private tileSize: number) {
  // draws to container (which is worldContainer in GameRenderer)
}
```

**Step 4c — `GameRenderer` adds `worldContainer` and asset loading**:

```typescript
import { Application, Container, Assets } from 'pixi.js';

// In init():
await Assets.load([
  { alias: 'scout',     src: 'assets/sprites/units/scout.png' },
  { alias: 'infantry',  src: 'assets/sprites/units/infantry.png' },
  { alias: 'artillery', src: 'assets/sprites/units/artillery.png' },
]);
this.worldContainer = new Container();
this.app.stage.addChild(this.worldContainer);
// pass worldContainer to sub-renderers
```

**Step 4d — `UnitsRenderer` sprite rendering**:

Replace Graphics circle creation with Sprite instantiation. Retain HP bar `Graphics` unchanged.

```typescript
import { Container, Sprite, Assets, Graphics } from 'pixi.js';

const PLAYER_TINT: Record<PlayerId, number> = {
  player1: 0x2244ff,
  player2: 0xdd2222,
};

// For each visible unit:
const texture = Assets.get(unit.type);
const sprite = new Sprite(texture);
sprite.width = 24;
sprite.height = 24;
sprite.anchor.set(0.5);
sprite.x = col * this.tileSize + this.tileSize / 2;
sprite.y = row * this.tileSize + this.tileSize / 2;
sprite.tint = PLAYER_TINT[unit.owner];
this.container.addChild(sprite);
```

**Tests**: Renderer unit tests are visual (manual verification). Write a unit test that confirms `Assets.get('scout')` is not null after `GameRenderer.init()` completes. All other renderer tests are integration tests via visual QA.

---

### P5 — Viewport Centering

**Files**: `src/renderer/renderer.ts`, `src/input/input.ts`

**`renderer.ts`** — centering logic:

```typescript
private worldContainer!: Container;
private currentMapSize: { rows: number; cols: number } = { rows: 0, cols: 0 };

private centerWorldContainer(): void {
  const mapW = this.currentMapSize.cols * TILE_SIZE;
  const mapH = this.currentMapSize.rows * TILE_SIZE;
  const canvasW = this.app.renderer.width;
  const canvasH = this.app.renderer.height;
  this.worldContainer.x = Math.max(0, Math.floor((canvasW - mapW) / 2));
  this.worldContainer.y = Math.max(0, Math.floor((canvasH - mapH) / 2));
}

// In render():
render(state: GameState, humanPlayerId: PlayerId): void {
  this.currentMapSize = state.mapSize;
  this.centerWorldContainer();
  // ...existing delegate calls...
}

// In onResize():
private onResize(): void {
  if (!this.container) return;
  this.app.renderer.resize(this.container.clientWidth, this.container.clientHeight);
  this.centerWorldContainer();
}
```

**Expose world offset for input**:

```typescript
getWorldOffset(): { x: number; y: number } {
  return { x: this.worldContainer.x, y: this.worldContainer.y };
}
```

**`input.ts`** — click coordinate adjustment:

```typescript
// In tile-click handler, before dividing by TILE_SIZE:
const offset = this.renderer.getWorldOffset();
const worldX = event.offsetX - offset.x;
const worldY = event.offsetY - offset.y;
// Only handle clicks within the map area
if (worldX < 0 || worldY < 0) return;
const col = Math.floor(worldX / tileSize);
const row = Math.floor(worldY / tileSize);
```

**Tests** (write first, additions to a new `tests/renderer/renderer.test.ts` or inline in integration):
- `centerWorldContainer()` sets `worldContainer.x = (canvasW - mapW) / 2` (pure arithmetic test, can be extracted to a helper function and unit-tested)
- Verify the computation returns 0 when `mapW >= canvasW` (no negative offset)

---

## Delivery Order

| Step | Story | Files Changed | Tests Required |
|------|-------|--------------|----------------|
| 1 | P1 Map generation | `mapgen.ts` | `mapgen.test.ts` |
| 2 | P3 Settlement vision | `constants.ts`, `fog.ts` | `fog.test.ts` |
| 3 | P2 Starting scouts | `state.ts` | `state.test.ts` (new) |
| 4a | P4 Assets creation | `public/assets/sprites/units/*.png` | Visual QA |
| 4b | P4 Sub-renderer constructors | `tilemap.ts`, `units.ts`, `fog.ts` | Compile + visual QA |
| 4c | P4 Asset loading + worldContainer | `renderer.ts` | Asset load test |
| 4d | P4 Sprite rendering | `units.ts` | Visual QA |
| 5 | P5 Viewport centering | `renderer.ts`, `input.ts` | Unit test for offset math + visual QA |

Steps 1–3 are pure game-logic changes, fully testable without a browser. Steps 4–5 require visual QA in the browser.

Steps 1, 2, and 3 are independent and can be implemented in parallel if desired.

---

## Risk & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Map generation retry count increases due to stricter constraints | Medium | `MAX_GEN_ATTEMPTS = 20` is generous; connectivity + opposite-sides rarely conflict. Monitor test timing. |
| PixiJS `Assets.load()` fails on missing PNG files | Low | Add graceful fallback in `UnitsRenderer` (colored Graphics circle) when texture not found |
| World container offset breaks click-to-tile coordinate mapping | Medium | The `getWorldOffset()` method and `input.ts` adjustment are explicitly contracted; covered by manual QA |
| Sub-renderer constructor change breaks TypeScript compilation | Low | All three sub-renderers are internal classes; type errors are caught immediately by `tsc --noEmit` |
| Sprite tint too dark on colored backgrounds | Low | Use near-white sprite bases (≥ 200/255 brightness); test both player colors before finalizing assets |
