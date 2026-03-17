# Research: Game Improvements

**Branch**: `002-game-improvements` | **Date**: 2026-03-14

## Decision 1: Canvas Centering Strategy

**Question**: Should we center by repositioning the canvas element in the DOM (CSS), or by offsetting the PixiJS world container inside the full-screen canvas?

**Decision**: Offset the PixiJS world `Container` inside the full-screen canvas.

**Rationale**: The existing `#app` div is `100vw × 100vh` and the PixiJS canvas fills it completely. The HTML UI overlays (HUD, menus, production panel) are DOM elements positioned with `fixed` CSS that assumes the canvas is full-screen. Shrinking the canvas to map dimensions would break the UI overlay positioning. Instead, wrapping all game-world layers (tilemap, units, fog) in a single PixiJS `Container` and setting `container.x` / `container.y` to `(canvasWidth − mapPixelWidth) / 2` and `(canvasHeight − mapPixelHeight) / 2` centers the map without touching the DOM layout.

**Alternatives Considered**:
- *CSS centering with fixed canvas size*: Requires resizing the PixiJS canvas to the map's pixel dimensions and centering the element. Would break DOM-based UI overlays that are currently fixed-position relative to the viewport. Rejected.
- *PixiJS stage scale*: Scale the stage so the map fills the screen. Not what the spec asks for; would distort visuals. Rejected.

**Implementation detail**: `mapPixelWidth = state.mapSize.cols × TILE_SIZE`, `mapPixelHeight = state.mapSize.rows × TILE_SIZE`. Offset is recalculated on `window.resize`. For maps larger than the viewport the offset clamps to 0 (no negative margin); browser scrolling handles overflow.

---

## Decision 2: Pixel Art Sprite Differentiation Strategy

**Question**: Use separate per-player colored PNG sprites (6 files), or use a single white/grayscale base sprite per unit type and apply PixiJS tinting (3 files)?

**Decision**: Single grayscale base sprite per unit type + PixiJS `tint` property for player color differentiation.

**Rationale**: PixiJS 8 Sprites expose a `tint` property (`0xRRGGBB`) that multiplies the sprite's color channels at render time. A white (or near-white) base sprite tinted with `0x2244ff` (blue) for Player 1 and `0xdd2222` (red) for Player 2 produces distinct, visually clear player colors without doubling the number of asset files. This is the standard approach for palette-swapped sprites in 2D game engines. Reduces art scope from 6 files to 3.

**Alternatives Considered**:
- *Separate colored sprites per player*: More control over exact colors but doubles file count and requires coordinated updates when any sprite changes. Rejected for simplicity.
- *Keep colored Graphics circles*: No art assets needed but does not satisfy the spec requirement for pixel art sprites. Rejected.

**Asset specification**:
- Location: `public/assets/sprites/units/`
- Files: `scout.png`, `infantry.png`, `artillery.png`
- Dimensions: 24 × 24 px (fits within a 32 px tile with 4 px padding on each side)
- Format: PNG with transparency; use white/light-gray base colors so tinting produces saturated player colors
- Player 1 tint: `0x2244ff` (blue) — matches existing `UNIT_COLORS.player1`
- Player 2 tint: `0xdd2222` (red) — matches existing `UNIT_COLORS.player2`

**Loading strategy**: Use PixiJS `Assets.load()` (async) before the first render. Group all three into a bundle loaded once at app startup in `GameRenderer.init()`.

---

## Decision 3: Settlement Vision Distance Metric

**Question**: Should settlement vision use Chebyshev distance (8-directional, consistent with unit vision) or Manhattan distance?

**Decision**: Chebyshev distance, consistent with the existing unit vision implementation in `fog.ts`.

**Rationale**: `recomputeFog` already uses `chebyshevDistance` for unit vision. Using a different metric for settlement vision would create inconsistent behavior (e.g., a unit on a diagonal tile 3 steps away would be visible from a unit but not from a city at the same range). Chebyshev also produces a square vision "diamond" which is visually intuitive for tile-based games. Reuses the existing `chebyshevDistance` import with no new code.

**Radii**: City → 3 tiles, Town → 2 tiles. New constant `SETTLEMENT_VISION` added to `constants.ts`.

---

## Decision 4: Full Settlement Connectivity Validation Scope

**Question**: The current `mapgen.ts` flood-fill check only verifies that city1 and city2 are land-connected. The spec requires ALL settlements (including towns) to be on connected land. How extensive should the check be?

**Decision**: After flood-filling from city1, verify that every settlement tile ID (both cities and all towns) is present in the flood-fill result set.

**Rationale**: The existing `floodFillLand` already computes the complete reachable land region from city1. Checking that all settlement `tileId`s are in the returned `Set<string>` costs O(S) where S = number of settlements — negligible. This fully satisfies FR-002 without any new algorithm. If any settlement is on an isolated land patch, the attempt is discarded and a new seed is tried (up to `MAX_GEN_ATTEMPTS = 20`).

**Alternatives Considered**:
- *Check only starting cities* (current behavior): Insufficient — towns on islands can still slip through. Rejected.
- *Guarantee single land mass* (ensure all land tiles form one component): Over-engineering; the game only cares about settlement reachability, not land aesthetics. Rejected.

---

## Decision 5: Opposite-Sides Placement Validation

**Question**: The current `assignStartingCities` picks the maximally-distant pair from the 2 placed cities (with only 2 cities the "pair" is always cities[0] and cities[1], making the max-distance loop a no-op). Is the existing logic sufficient to guarantee opposite halves?

**Decision**: Add an explicit opposite-halves check: the two cities must be in different halves of the map along the longer axis (columns for square maps). If they are in the same half, retry with a new seed.

**Rationale**: Because cities are placed sequentially from a shuffled candidate list using only minimum-distance constraints, both cities can land in the same quadrant (e.g., both in the top-left corner). On a 10×10 map with `cityMinDist = 4`, cities at `(1,1)` and `(4,1)` are 4 tiles apart but both in the left half. The maxDist loop is effectively dead code for 2 cities (there is only one pair to evaluate). The explicit halves check costs O(1) and ensures the spec guarantee is met.

**Check implementation**: After `assignStartingCities`, if `abs(city1.coord.col − city2.coord.col) < cols / 2` AND `abs(city1.coord.row − city2.coord.row) < rows / 2`, the cities are not "opposite" enough — retry.

---

## Decision 6: Starting Scout Spawn Point in the Game Flow

**Question**: Should starting scouts be created in `newGame()` (before `startTurn()`), or in `startTurn()` as a special first-turn initialization?

**Decision**: Create starting scouts in `newGame()`, before calling `startTurn()`, so that fog computation on turn 1 already includes them.

**Rationale**: `startTurn()` calls `recomputeFog()` as its last step. If scouts are placed before `startTurn()`, fog on turn 1 correctly reveals tiles around each starting city (from both the scout's vision and the city's settlement vision). If scouts were placed after `startTurn()`, fog would miss the scout's vision on the very first render and require an extra recompute pass. Pre-placement is cleaner and avoids any ordering complexity.

**Tile occupancy**: Both starting city tiles start unoccupied (no units in the initial state). The scout is placed on the city tile, setting `tile.unitId = scoutId`. This blocks production-queue spawning on turn 1 (city tile occupied → skip spawn), which is correct — the starting scout already occupies that tile.

**No cost deduction**: Starting scouts are free. They are created directly in `newGame()` without going through the `produce` action, so no funds are deducted.
