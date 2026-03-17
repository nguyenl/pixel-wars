# Quickstart: Game Improvements

**Branch**: `002-game-improvements` | **Date**: 2026-03-14

---

## Prerequisites

```bash
node --version   # v20+ required
npm --version    # v10+
```

---

## Setup

```bash
git checkout 002-game-improvements
npm install
```

---

## Run the Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. The game should appear centered on screen.

### What to verify visually

1. **Centering**: The map (grey border area) should have equal whitespace on all sides of the playfield on standard browser window sizes.
2. **Starting scouts**: On a new game, both players should immediately have a Scout unit visible on their starting city tile (blue for Player 1, red for Player 2). No production wait.
3. **Pixel art sprites**: Units should show small pixel art sprites, not plain colored circles.
4. **Settlement vision**: At game start, tiles around both starting cities should be visible even without moving the scouts.
5. **Map generation**: Player 1's city (blue scout) and Player 2's city (red scout) should be on opposite sides of the map.

---

## Run Tests

```bash
npm test
```

All tests must pass. New tests cover:

| Test file | What it validates |
|-----------|-------------------|
| `tests/game/fog.test.ts` | Settlement vision (city=3 tiles, town=2 tiles, neutral=none) |
| `tests/game/mapgen.test.ts` | Full settlement connectivity, opposite-sides placement |
| `tests/game/state.test.ts` | Starting scouts exist at game start, fog includes scouts + settlement vision on turn 1 |

---

## Lint

```bash
npm run lint
```

No type errors allowed (`tsc --noEmit`).

---

## Asset Creation Workflow

Pixel art sprites are static PNG files. Create them with any pixel art editor (Aseprite, Libresprite, GIMP):

1. New canvas: **24 × 24 px**
2. Use **white or near-white** (`#ffffff` to `#cccccc`) for the unit body — PixiJS tinting multiplies these channels
3. Use **fully transparent** background (`rgba(0,0,0,0)`)
4. Export as PNG to:
   - `public/assets/sprites/units/scout.png`
   - `public/assets/sprites/units/infantry.png`
   - `public/assets/sprites/units/artillery.png`

**Visual design suggestions**:
- **Scout**: Running figure, cloak, light armor — conveys speed and stealth
- **Infantry**: Soldier with shield or weapon, stocky — conveys durability
- **Artillery**: Cannon, wheeled, heavy — conveys range and firepower

After exporting, restart the dev server (`npm run dev`) and reload the browser. Sprites appear immediately without a full rebuild.

---

## Debugging

### Centering not working?

Check `GameRenderer.render()` — the `centerWorldContainer()` call must run before `tilemapRenderer.render()`.

### Scouts not appearing at game start?

Inspect `src/game/state.ts` `newGame()` — verify `startingUnits` is built and passed into initial `GameState.units`, and `tilesWithScouts` is used for `GameState.tiles`.

### Settlement vision not revealing tiles?

In `src/game/fog.ts` `recomputeFog()`, verify the settlement loop runs after the unit loop and uses `SETTLEMENT_VISION` from `constants.ts`.

### Click coordinates off after centering?

Ensure `InputHandler` subtracts `worldContainer.x` / `worldContainer.y` from raw click coordinates before dividing by `TILE_SIZE`.

### Sprite textures not loading?

Confirm the PNG files exist at `public/assets/sprites/units/` and that `Assets.load()` is awaited in `GameRenderer.init()` before any rendering.
