# Research: Unit Animations, Visual Polish, and Combat Fixes

**Feature**: 004-unit-animations-combat-fixes
**Date**: 2026-03-14

---

## R-001: Combat Bug Root Causes

**Question**: Why do units "disappear" into enemies, and why do attacks fail?

**Finding**: Two interlinked bugs in the movement validation path:

1. **`src/game/pathfinding.ts` — `getReachableTiles`** only excludes friendly-occupied tiles from the result set. Enemy-occupied tiles are left in the reachable list. When a unit is selected, enemy tiles appear highlighted as valid move destinations.

2. **`src/game/rules.ts` — `validateMove`** only returns an error when the destination tile is occupied by a *friendly* unit. An enemy-occupied destination passes validation. `applyMove` then overwrites the destination tile's `unitId`, orphaning the enemy unit (the unit object still exists in `state.units` with a `tileId` pointing to a tile that no longer references it).

3. The **input handler** (`src/input/input.ts`, `handleTileClick`) checks `isAttackTarget` first, but the attack detection relies on `getAttackableTargets`. If the unit being selected has already moved this turn and has 0 MP remaining, or if the attack was not detected properly, the reachable-tile check (which incorrectly includes enemy tiles) fires a move instead of an attack.

**Decision**: Fix both `getReachableTiles` (exclude enemy-occupied tiles) and `validateMove` (also block enemy-occupied destinations, not just friendly). Add a `tile.unitId !== null` check that rejects any occupied tile as a move destination unless the occupant is the moving unit itself (needed for same-tile edge case).

**Alternatives considered**:
- Fix only the input handler to prioritize attack — rejected because the state-level bug (move to enemy tile) would remain and could be triggered by the AI or future code paths.
- Fix only `validateMove` — rejected because `getReachableTiles` would still show enemy tiles as highlighted, confusing the player even if the move is blocked at the action level.

---

## R-002: PixiJS Ticker for Animations

**Question**: How to drive time-based animations in the existing PixiJS setup?

**Finding**: PixiJS 8.x provides `Application.ticker` — a `Ticker` instance that fires on every frame (typically 60 fps). The ticker callback receives a `Ticker` object with a `deltaTime` property (frame delta in "ticker units", defaulting to 1.0 at 60 fps) and `deltaMS` (milliseconds since last tick).

Current architecture: `GameRenderer.render()` is called imperatively from `main.ts` whenever state changes. There is no continuous game loop — rendering only happens on state mutations.

**Decision**: Add an `AnimationController` class inside `src/renderer/units.ts` that:
- Registers itself on `app.ticker` during construction
- Maintains a list of active `Animation` objects (move, attack, idle, death)
- On each tick, advances each active animation by `deltaMS`
- When all animations complete, calls a provided `onComplete` callback (which unblocks input)
- Is deregistered (or paused) when no animations are active to avoid unnecessary ticks

Idle animations run continuously on the ticker; move/attack/death animations are one-shot with completion callbacks.

**Alternatives considered**:
- Using `gsap` or `animejs` for tweening — rejected (adds external dependency; Web Audio + PixiJS already cover the need; constitution principle I requires avoiding unnecessary deps).
- Using `requestAnimationFrame` directly — rejected (PixiJS Ticker is already the canonical animation loop for this project's render engine; mixing RAF directly would create two competing loops).
- Keeping the imperative render-on-state-change pattern and faking animation with `setTimeout` — rejected (produces choppy motion; no smooth interpolation possible).

---

## R-003: Web Audio API for Sound Synthesis

**Question**: How to produce simple audio feedback with no external audio files?

**Finding**: The Web Audio API (available in all modern browsers) allows creating an `AudioContext` and chaining oscillator nodes to produce tones. A short "blip" effect can be synthesized with an `OscillatorNode` + `GainNode` in ~10 lines. This requires no file downloads.

Browser autoplay policy: An `AudioContext` must be created or resumed in response to a user gesture (click, keydown). Creating the context on first user interaction and reusing it satisfies this constraint.

**Decision**: Create `src/audio/sound.ts` with a `SoundManager` class:
- `AudioContext` is initialized lazily on first `play()` call (triggered by user interaction)
- Three methods: `playSelect()`, `playMove()`, `playAttack()` — each synthesizes a short tone with distinct pitch/duration
- All errors from AudioContext are silently caught (sound failing must not break gameplay)
- No external audio files; no new npm dependencies

**Tone design**:
- Select: 880 Hz sine wave, 80ms, slight decay
- Move: 440→660 Hz sweep (linear ramp), 150ms
- Attack: 220 Hz square wave, 200ms with fast decay

**Alternatives considered**:
- Bundling small WAV/OGG files — rejected (adds assets to repo, complicates GitHub Pages deployment, violates simplicity principle).
- Using the Howler.js library — rejected (external dependency not justified for 3 beeps).
- Skipping sound entirely — rejected (explicitly requested in spec; P4 user story).

---

## R-004: Hover Highlight Implementation

**Question**: How to detect mouse hover over game tiles and update highlight state?

**Finding**: The canvas already has a `click` listener in `InputHandler.setupCanvasClick()`. The same coordinate transformation (worldOffset + tileSize division) can be applied to `mousemove` events. The resulting tile coordinate can be stored in the renderer and applied as a "hover layer" in `TilemapRenderer`.

**Decision**:
- Add a `mousemove` listener in `InputHandler` that computes the hovered `TileCoord` (same math as click, with early exit outside map bounds)
- Pass the hovered coord to `GameRenderer.setHoverCoord(coord | null)`
- `TilemapRenderer.render()` gains a `hoverCoord` parameter alongside the existing `reachableCoords` and `attackableCoords`
- Hover highlights are drawn in `renderHighlights()` at a distinct alpha/color (brighter than the static highlights)
- The hover coord is cleared when the mouse leaves the canvas (`mouseleave` event)

**Alternatives considered**:
- Using PixiJS `FederatedPointerEvent` on the tilemap sprites — rejected (tiles are drawn with a single Graphics object per tile, not individual event targets; adding per-tile interactivity would require refactoring the tilemap renderer).
- Tracking hover in the renderer only (no InputHandler involvement) — rejected (the renderer doesn't know which tiles are reachable; that context lives in InputHandler).

---

## R-005: Terrain Visual Detail

**Question**: What decorative detail to add per terrain type using PixiJS Graphics?

**Finding**: The existing `TilemapRenderer.renderTiles()` draws a flat colored rect per tile. PixiJS Graphics supports arbitrary shapes via `moveTo/lineTo/circle/poly/bezierCurveTo`. All detail can be drawn inline using deterministic pseudo-random placement derived from the tile's `(row, col)` coordinates (no RNG state needed, same result each render).

**Decision**: Add a `renderTerrainDetail(tile, g, x, y, tileSize)` helper called within `renderTiles` after the base rect fill. Per-type detail:

| Terrain | Detail |
|---------|--------|
| plains | 3–4 small grass tufts (2-line "V" shapes) at fixed offsets within tile |
| grassland | 5–6 denser grass tufts + one circular bush |
| forest | 2–3 dark-green filled circles (tree canopies) |
| mountain | A filled triangle (peak silhouette) in darker gray |
| water | 2 short horizontal wave lines (lighter blue strokes) |

All detail elements are drawn within the tile boundary with 3px inset. Detail is redrawn only when the tile is first created (tiles don't change terrain).

**Alternatives considered**:
- Sprite assets for terrain — rejected (no assets currently; spec says "no flat color", not "add sprites"; Graphics primitives satisfy the requirement and preserve zero-asset fallback).
- Per-tile textures cached to RenderTexture — rejected (adds complexity; 20×20 = 400 tiles × Graphics is fast enough; constitution principle I).

---

## R-006: Animation Input Blocking

**Question**: Should player input be blocked during animations?

**Finding**: Move animations need 500ms × path length; for a 3-tile path this is 1.5 seconds. Attack animations run ~600ms. Without input blocking, a player could issue a second action before the first animation completes, which would produce state/visual de-sync.

**Decision**:
- `GameRenderer` exposes `isAnimating(): boolean`
- `InputHandler.handleTileClick` returns early if `renderer.isAnimating()` is true
- `AnimationController` signals completion via callback; `GameRenderer` tracks the pending flag
- Idle animations do NOT block input (they run continuously)

AI turn actions are already gated via `await delay(AI_DELAY_MS)` in `main.ts`; no change needed there.

**Alternatives considered**:
- Queuing actions during animation — rejected (overly complex for a turn-based game; simpler to ignore extra clicks).
- No input blocking — rejected (would cause state/visual de-sync as described above).
