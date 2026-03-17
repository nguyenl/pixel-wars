# Interface Contract: Animation & Sound

**Feature**: 004-unit-animations-combat-fixes
**Date**: 2026-03-14

This document defines the public interfaces between the renderer components introduced by this feature and their callers.

---

## `AnimationController` (inside `src/renderer/units.ts`)

Manages in-flight animations for unit sprites. Registered on the PixiJS Ticker.

```typescript
interface AnimationController {
  /** Start a move animation for a unit along a path of world-space waypoints.
   *  Each waypoint is the CENTER of a tile in world pixels.
   *  onComplete fires after the last waypoint is reached. */
  playMove(
    unitId: string,
    container: Container,
    waypoints: Array<{ x: number; y: number }>,
    msPerTile: number,
    onComplete: () => void,
  ): void;

  /** Start an attack lunge animation. Attacker lunges to the midpoint toward
   *  targetPos and returns. onComplete fires after the return. */
  playAttack(
    unitId: string,
    container: Container,
    fromPos: { x: number; y: number },
    targetPos: { x: number; y: number },
    onComplete: () => void,
  ): void;

  /** Start a death animation (alpha fade). onComplete fires after fade. */
  playDeath(
    unitId: string,
    container: Container,
    onComplete: () => void,
  ): void;

  /** Returns true if any one-shot animation (move/attack/death) is in progress. */
  isAnimating(): boolean;

  /** Stop all animations for a unit (used when unit is removed mid-animation). */
  cancelUnit(unitId: string): void;
}
```

**Idle animation**: Runs automatically on all unit containers via the Ticker. No explicit call needed. Implemented as a continuous Y offset derived from `ticker.lastTime`.

---

## `GameRenderer` — new public surface (`src/renderer/renderer.ts`)

```typescript
// New methods added to GameRenderer:

/** Set the tile coordinate currently under the cursor (null when outside map). */
setHoverCoord(coord: TileCoord | null): void;

/** Returns true if a one-shot animation is in progress (blocks input). */
isAnimating(): boolean;

/** Play a move animation for a unit along the given tile path.
 *  Calls onComplete when the animation finishes. */
animateMove(
  unitId: string,
  path: TileCoord[],
  onComplete: () => void,
): void;

/** Play an attack animation for a unit targeting a destination tile.
 *  Calls onComplete when the animation finishes. */
animateAttack(
  unitId: string,
  targetTileCoord: TileCoord,
  onComplete: () => void,
): void;
```

---

## `SoundManager` (`src/audio/sound.ts`)

```typescript
class SoundManager {
  /** Play the unit-selection sound. No-op if audio is unavailable. */
  playSelect(): void;

  /** Play the unit-movement sound. No-op if audio is unavailable. */
  playMove(): void;

  /** Play the attack-impact sound. No-op if audio is unavailable. */
  playAttack(): void;
}
```

**Construction**: `new SoundManager()` — no arguments. AudioContext is created on first `play*()` call.

**Error contract**: All public methods silently catch and discard audio errors. They never throw.

---

## `TilemapRenderer.render` — updated signature (`src/renderer/tilemap.ts`)

```typescript
// Before (existing):
render(
  state: GameState,
  reachableCoords: TileCoord[],
  attackableCoords: TileCoord[],
): void;

// After (this feature):
render(
  state: GameState,
  reachableCoords: TileCoord[],
  attackableCoords: TileCoord[],
  hoverCoord: TileCoord | null,   // NEW — null when no unit is selected or cursor is off-map
): void;
```

The hover highlight is drawn in `renderHighlights`. If `hoverCoord` is in `reachableCoords`, it gets a brighter move-hover color. If `hoverCoord` is an attackable tile, it gets an attack-hover color. Otherwise no hover highlight is drawn.

---

## `InputHandler` — updated constructor signature (`src/input/input.ts`)

```typescript
// The constructor gains an optional sound manager parameter:
constructor(
  renderer: GameRenderer,
  ui: UIRenderer,
  humanPlayerId: PlayerId,
  onStateUpdate: StateUpdater,
  getState: () => GameState,
  sound?: SoundManager,   // NEW — optional; sound is a no-op if omitted
)
```
