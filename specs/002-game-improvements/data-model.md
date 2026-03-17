# Data Model: Game Improvements

**Branch**: `002-game-improvements` | **Date**: 2026-03-14

This document describes all data model changes introduced by this feature. Existing types not listed here are unchanged.

---

## New Constants

### `SETTLEMENT_VISION` (added to `src/game/constants.ts`)

```typescript
/** Vision radius granted by an owned settlement, in Chebyshev tile distance */
export const SETTLEMENT_VISION: Record<SettlementType, number> = {
  city: 3,
  town: 2,
};
```

**Why here**: All static configuration lives in `constants.ts`. Settlement vision radii are fixed game-design values, not stored in `GameState`.

**Placement**: Directly after `SETTLEMENT_INCOME`.

---

## Changed Behaviour: `recomputeFog` (in `src/game/fog.ts`)

No change to the function signature. Behavioural extension only:

```typescript
// Current: applies vision from friendly units only
// New: ALSO applies vision from owned settlements

// After the friendly-units loop, add:
for (const settlement of Object.values(state.settlements)) {
  if (settlement.owner !== playerId) continue;
  const settTile = state.tiles[settlement.tileId];
  if (!settTile) continue;
  const visionRange = SETTLEMENT_VISION[settlement.type];
  for (const [tid, tile] of Object.entries(state.tiles)) {
    if (chebyshevDistance(settTile.coord, tile.coord) <= visionRange) {
      newFog[tid] = 'visible';
    }
  }
}
```

**Imports added**: `SETTLEMENT_VISION` from `./constants`.

---

## Changed Behaviour: `generateMap` (in `src/game/mapgen.ts`)

### Extended Connectivity Check

After the existing two-city flood-fill check, add all-settlement validation:

```typescript
// Current check:
const reachable = floodFillLand(tilesCopy, city1TileId);
if (!reachable.has(city2TileId)) continue;

// New: also ensure every town is on connected land
const allSettlementTileIds = Object.values(settlementsCopy).map(s => s.tileId);
if (!allSettlementTileIds.every(tid => reachable.has(tid))) continue;
```

### Opposite-Sides Check (added after `assignStartingCities`)

```typescript
// Verify starting cities are on opposite halves of the map
const c1 = tilesCopy[settlementsCopy[startingCities['player1']].tileId].coord;
const c2 = tilesCopy[settlementsCopy[startingCities['player2']].tileId].coord;
const sameColHalf = Math.abs(c1.col - c2.col) < cols / 2;
const sameRowHalf = Math.abs(c1.row - c2.row) < rows / 2;
if (sameColHalf && sameRowHalf) continue; // both cities in same quadrant — retry
```

**Invariant**: Both checks are within the existing retry loop (`MAX_GEN_ATTEMPTS = 20`). No new public API changes.

---

## Changed Behaviour: `newGame` (in `src/game/state.ts`)

Starting scouts are injected into the initial `units` and `tiles` before `startTurn()` is called:

```typescript
// After generateMap() and before building initial GameState:
const startingUnits: Record<string, Unit> = {};
const tilesWithScouts = { ...generated.tiles };

let scoutIndex = 0;
for (const playerId of ['player1', 'player2'] as const) {
  const cityId = generated.startingCities[playerId];
  const cityTileId = generated.settlements[cityId].tileId;
  const unitId = `unit-start-${scoutIndex++}`;
  const unit: Unit = {
    id: unitId,
    type: 'scout',
    owner: playerId,
    tileId: cityTileId,
    hp: UNIT_CONFIG.scout.maxHp,
    movementPoints: UNIT_CONFIG.scout.movementAllowance,
    hasAttacked: false,
  };
  startingUnits[unitId] = unit;
  tilesWithScouts[cityTileId] = { ...tilesWithScouts[cityTileId], unitId };
}

// Then use tilesWithScouts and startingUnits when constructing initial GameState
const state: GameState = {
  ...
  tiles: tilesWithScouts,
  units: startingUnits,
  ...
};
```

**No type changes**: `Unit` and `GameState` types are unchanged. Starting scouts are ordinary `Unit` instances.

**No cost deduction**: Scouts created here bypass the `produce` action; no funds are deducted from `STARTING_FUNDS`.

---

## Changed Behaviour: `GameRenderer` (in `src/renderer/renderer.ts`)

### World Container

A new PixiJS `Container` (`worldContainer`) wraps all game-world rendering layers:

```typescript
// New field:
private worldContainer!: Container;

// In init():
this.worldContainer = new Container();
this.app.stage.addChild(this.worldContainer);

// Sub-renderers receive worldContainer instead of this.app directly:
this.tilemapRenderer = new TilemapRenderer(this.worldContainer, TILE_SIZE);
this.unitsRenderer  = new UnitsRenderer(this.worldContainer, TILE_SIZE);
this.fogRenderer    = new FogRenderer(this.worldContainer, TILE_SIZE);
```

### Centering

Called in `render()` and `onResize()`:

```typescript
private centerWorldContainer(mapSize: { rows: number; cols: number }): void {
  const mapW = mapSize.cols * TILE_SIZE;
  const mapH = mapSize.rows * TILE_SIZE;
  const canvasW = this.app.renderer.width;
  const canvasH = this.app.renderer.height;
  this.worldContainer.x = Math.max(0, Math.floor((canvasW - mapW) / 2));
  this.worldContainer.y = Math.max(0, Math.floor((canvasH - mapH) / 2));
}
```

**Impact on sub-renderers**: `TilemapRenderer`, `UnitsRenderer`, and `FogRenderer` constructors currently receive `Application` — they will receive `Container` instead. Their internal drawing coordinates (`col * TILE_SIZE`, `row * TILE_SIZE`) remain unchanged; centering is handled purely by the parent container's position.

---

## Changed Behaviour: `UnitsRenderer` (in `src/renderer/units.ts`)

### Sprite Loading

Textures are loaded once during `GameRenderer.init()` before the first render:

```typescript
// In GameRenderer.init():
await Assets.load([
  { alias: 'scout',    src: 'assets/sprites/units/scout.png' },
  { alias: 'infantry', src: 'assets/sprites/units/infantry.png' },
  { alias: 'artillery',src: 'assets/sprites/units/artillery.png' },
]);
```

### Sprite Rendering (replaces Graphics circles)

```typescript
// For each visible unit, instead of drawCircle:
const texture = Assets.get<Texture>(unit.type);
const sprite = new Sprite(texture);
sprite.width = 24;
sprite.height = 24;
sprite.anchor.set(0.5);
sprite.x = col * TILE_SIZE + TILE_SIZE / 2;
sprite.y = row * TILE_SIZE + TILE_SIZE / 2;
sprite.tint = unit.owner === 'player1' ? 0x2244ff : 0xdd2222;
container.addChild(sprite);
```

**HP bars**: Retained unchanged — rendered as `Graphics` rectangles below the sprite.

---

## New Static Assets

| File | Dimensions | Format | Description |
|------|-----------|--------|-------------|
| `public/assets/sprites/units/scout.png` | 24 × 24 px | PNG + alpha | Pixel art scout: fast, light — suggested motif: cloaked figure or running silhouette |
| `public/assets/sprites/units/infantry.png` | 24 × 24 px | PNG + alpha | Pixel art infantry: sturdy, armed — suggested motif: soldier with shield or rifle |
| `public/assets/sprites/units/artillery.png` | 24 × 24 px | PNG + alpha | Pixel art artillery: heavy, wheeled — suggested motif: cannon or tank |

**Color guidance**: Use white or near-white (≥ 200/255 brightness) for the main unit body so PixiJS tinting produces saturated blue/red player colors. Use transparent pixels for the background.

---

## Entities Unchanged

The following `types.ts` interfaces are **not changed** by this feature:

- `Tile` — no new fields
- `Settlement` — no new fields (vision is derived from `SETTLEMENT_VISION[settlement.type]`)
- `Unit` — no new fields
- `Player` — no new fields
- `GameState` — no new fields
- `FogMap`, `FogState` — unchanged
- All `Action` types — unchanged
- `GeneratedMap` — unchanged (already returns `startingCities`)

---

## Validation Rules (unchanged)

Settlement vision integrates transparently into the existing fog system:
- Settlement vision is applied identically to unit vision (Chebyshev radius, sets tiles to `'visible'`)
- The `'explored'` → `'hidden'` regression prevention still applies
- Settlement vision updates every time `recomputeFog` is called (start of turn, after moves)
- Neutral settlements contribute no vision (owner check: `settlement.owner !== playerId`)
