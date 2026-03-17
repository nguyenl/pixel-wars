# Data Model: Unit Animations, Visual Polish, and Combat Fixes

**Feature**: 004-unit-animations-combat-fixes
**Date**: 2026-03-14

---

## Existing Entities (unchanged by this feature)

These game-state entities are not modified. They are documented here because the bug fixes enforce stricter invariants on them.

### `Unit` (`src/game/types.ts`)

| Field | Type | Invariant enforced by this feature |
|-------|------|-----------------------------------|
| `id` | `string` | Stable; equals the key in `GameState.units` |
| `tileId` | `string` | MUST equal the `id` of a tile whose `unitId` is this unit's `id` (tile↔unit bidirectional sync) |
| `hp` | `number` | > 0 (destroyed units are removed from state) |
| `hasAttacked` | `boolean` | Cleared at turn start; set to `true` after attack |

### `Tile` (`src/game/types.ts`)

| Field | Type | Invariant enforced by this feature |
|-------|------|-----------------------------------|
| `id` | `string` | Stable; `"${row},${col}"` |
| `unitId` | `string \| null` | At most one unit ID; if set, `state.units[unitId].tileId === tile.id` |

**New invariant explicitly enforced**: `tile.unitId !== null` means the tile is occupied and no other unit may move there. Previously, only friendly units were considered occupiers; this feature extends the invariant to all units.

---

## New Renderer-Layer Entities

These entities live exclusively in the display layer and are **never serialized** into `GameState`.

### `AnimationState` (internal to `AnimationController`)

Represents a single in-flight animation on a unit sprite.

| Field | Type | Description |
|-------|------|-------------|
| `unitId` | `string` | Which unit this animation belongs to |
| `type` | `'move' \| 'attack' \| 'death' \| 'idle'` | Animation category |
| `elapsed` | `number` | Milliseconds elapsed since animation start |
| `duration` | `number` | Total animation duration in milliseconds |
| `fromX` | `number` | Starting world X position (pixels) |
| `fromY` | `number` | Starting world Y position (pixels) |
| `toX` | `number` | Target world X position (pixels) — for move/attack |
| `toY` | `number` | Target world Y position (pixels) — for move/attack |
| `onComplete` | `(() => void) \| null` | Called once when `elapsed >= duration` |

**State transitions**:
```
created → running (ticker advances elapsed) → complete (onComplete called, removed from list)
```

For `idle` type: `duration = Infinity`; never completes; `onComplete = null`. Provides a sinusoidal offset to the sprite's Y position.

For `move` type: A sequence of single-step animations is chained — each step animates one tile of the path, and on `onComplete` the next step starts.

For `attack` type: Two phases chained — lunge (fromPos → midpoint toward target) followed by return (midpoint → fromPos). The attacker never reaches the target tile's center.

For `death` type: Alpha fade from 1.0 → 0 over `duration`. On `onComplete`, the sprite container is removed.

---

### `SoundManager` (`src/audio/sound.ts`)

Not a data entity — a service. Documented here for contract purposes.

| State field | Type | Description |
|------------|------|-------------|
| `ctx` | `AudioContext \| null` | Initialized lazily on first `play()` call |
| `enabled` | `boolean` | `true` if `AudioContext` created successfully |

**No serialization**. Stateless between game sessions.

---

### `HoverState` (internal to `InputHandler` / `GameRenderer`)

Minimal: a single `TileCoord | null` passed from `InputHandler` to `GameRenderer.setHoverCoord()` on every `mousemove`. Stored in `GameRenderer` as `private hoverCoord: TileCoord | null`. No history, no complex structure.

---

## Invariants Summary

| Invariant | Where enforced |
|-----------|---------------|
| No two units share a tile | `validateMove` (rules.ts) + `getReachableTiles` (pathfinding.ts) |
| `unit.tileId` ↔ `tile.unitId` bidirectional sync | `applyMove`, `applyCombatResult` (already correct; bugs prevented by FR-001/FR-002) |
| Attacker stays on its tile during attack animation | `AnimationController` — lunge midpoint is < 50% of the distance to target |
| Sound failures are silent | `SoundManager` — all AudioContext operations wrapped in try/catch |
| Animations do not mutate GameState | `AnimationController` operates on PixiJS Container positions only |
