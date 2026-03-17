# Module Contracts: Game Improvements

**Branch**: `002-game-improvements` | **Date**: 2026-03-14

This document specifies the inter-module contracts (public API surfaces) that change as part of this feature. All contracts are expressed as TypeScript signatures. Implementation MUST match these signatures exactly before integration.

---

## `src/game/constants.ts`

### New export: `SETTLEMENT_VISION`

```typescript
export const SETTLEMENT_VISION: Record<SettlementType, number>;
// SETTLEMENT_VISION.city === 3
// SETTLEMENT_VISION.town === 2
```

**Consumers**: `src/game/fog.ts`
**Contract invariant**: Values are non-negative integers. `city > town`.

---

## `src/game/fog.ts`

### `recomputeFog` — signature unchanged, behaviour extended

```typescript
export function recomputeFog(state: GameState, playerId: PlayerId): FogMap;
```

**New postconditions** (in addition to existing):
1. For every settlement `s` where `s.owner === playerId`: all tiles `t` where `chebyshevDistance(s.tileCoord, t.coord) ≤ SETTLEMENT_VISION[s.type]` are set to `'visible'` in the returned `FogMap`.
2. Neutral settlements (`s.owner === 'neutral'`) contribute NO vision.
3. Enemy settlements contribute NO vision to `playerId`.
4. Combined vision (units ∪ settlements) is a union — the most-visible state wins.

**Consumers**: `src/game/turns.ts` (calls `recomputeFog` in `startTurn`), `src/game/rules.ts` (calls after move).

---

## `src/game/mapgen.ts`

### `generateMap` — signature unchanged, stronger guarantees

```typescript
export function generateMap(mapSize: MapSizeOption, seed: number): GeneratedMap;
```

**Strengthened postconditions**:
1. **Existing**: `startingCities.player1` and `startingCities.player2` are reachable from each other by land.
2. **New**: Every settlement tile in `settlements` is reachable from `startingCities.player1` by land (8-directional flood fill). No isolated settlement islands.
3. **New**: The two starting city tiles are in different halves of the map: either `|c1.col − c2.col| ≥ cols/2` OR `|c1.row − c2.row| ≥ rows/2` (or both).

**Throws**: `MapGenerationError` if constraints cannot be satisfied within `MAX_GEN_ATTEMPTS` attempts (unchanged).

---

## `src/game/state.ts`

### `newGame` — signature unchanged, new behaviour

```typescript
export function newGame(mapSize: MapSizeOption, seed?: number): GameState;
```

**New postconditions**:
1. The returned `GameState.units` contains exactly two units at game start: one Scout owned by `'player1'` on `player1`'s starting city tile, and one Scout owned by `'player2'` on `player2`'s starting city tile.
2. The tile at each starting city has `unitId` set to the respective scout's ID.
3. Both scouts have full HP (`UNIT_CONFIG.scout.maxHp`) and full movement (`UNIT_CONFIG.scout.movementAllowance`).
4. `GameState.players.player1.funds === STARTING_FUNDS` (no deduction for starting scouts).
5. `GameState.players.player2.funds === STARTING_FUNDS` (no deduction for starting scouts).
6. Fog on turn 1 reflects BOTH unit vision (from the scouts) AND settlement vision (from the starting cities).

---

## `src/renderer/renderer.ts`

### `GameRenderer.init` — signature unchanged, new behaviour

```typescript
async init(container: HTMLElement): Promise<void>;
```

**New postconditions**:
1. Sprite textures for `'scout'`, `'infantry'`, and `'artillery'` are loaded and registered with the PixiJS `Assets` cache before `init` resolves.
2. A `worldContainer` (`Container`) is added to `app.stage` as the sole child for game-world rendering.
3. `tilemapRenderer`, `unitsRenderer`, and `fogRenderer` draw into `worldContainer` (not directly into `app.stage`).

### `GameRenderer.render` — signature unchanged, new behaviour

```typescript
render(state: GameState, humanPlayerId: PlayerId): void;
```

**New postcondition**: Before delegating to sub-renderers, `worldContainer.x` and `worldContainer.y` are set to center the map pixel area within the current canvas dimensions:
```
worldContainer.x = max(0, floor((canvasWidth  − cols × TILE_SIZE) / 2))
worldContainer.y = max(0, floor((canvasHeight − rows × TILE_SIZE) / 2))
```

### `GameRenderer` internal constructors for sub-renderers

Sub-renderers previously received `Application`; they now receive `Container`:

| Sub-renderer | Old first argument | New first argument |
|---|---|---|
| `TilemapRenderer` | `Application` | `Container` |
| `UnitsRenderer`   | `Application` | `Container` |
| `FogRenderer`     | `Application` | `Container` |

These constructors are internal (not exported), but the change must be consistent across all three files.

---

## `src/renderer/units.ts`

### `UnitsRenderer` — internal rendering contract

Units are rendered as `Sprite` objects (not `Graphics` circles). The following invariants hold:

1. Each visible unit maps to one `Sprite` with `texture = Assets.get(unit.type)`.
2. `sprite.tint === 0x2244ff` when `unit.owner === 'player1'`.
3. `sprite.tint === 0xdd2222` when `unit.owner === 'player2'`.
4. `sprite.width === sprite.height === 24` (px).
5. `sprite.anchor` is set to `(0.5, 0.5)` so the sprite is centered on the tile.
6. Units on fog-hidden tiles are NOT rendered (unchanged from current behaviour).
7. HP bars are retained as `Graphics` rectangles below the sprite center.

---

## Asset Contract

The following files MUST exist at the specified paths before `GameRenderer.init()` is called:

| Alias | Path | Dimensions | Notes |
|-------|------|-----------|-------|
| `'scout'`    | `public/assets/sprites/units/scout.png`    | 24 × 24 px | White/light base for tint compatibility |
| `'infantry'` | `public/assets/sprites/units/infantry.png` | 24 × 24 px | White/light base for tint compatibility |
| `'artillery'`| `public/assets/sprites/units/artillery.png`| 24 × 24 px | White/light base for tint compatibility |

If any file is missing, `Assets.load()` will throw and the game will fail to start. The implementation MUST include a graceful fallback (e.g., solid-color `Graphics` circle) if asset loading fails, to prevent a broken game state.

---

## Input Handler Contract (no API change)

`src/input/input.ts` converts canvas pixel coordinates to tile coordinates. With the world container offset, raw click coordinates must be adjusted:

```typescript
// Adjusted tile coordinate from click event:
const worldX = event.clientX - worldContainer.x;
const worldY = event.clientY - worldContainer.y;
const col = Math.floor(worldX / TILE_SIZE);
const row = Math.floor(worldY / TILE_SIZE);
```

`InputHandler` must receive the `worldContainer` reference (or the `GameRenderer` must expose a `worldOffset(): { x: number; y: number }` method) so click coordinates can be correctly translated. This is an internal wiring change, not a public API change.
