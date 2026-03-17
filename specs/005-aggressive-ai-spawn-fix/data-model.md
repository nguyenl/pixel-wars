# Data Model: Aggressive AI & Spawn Render Fix

**Feature**: 005-aggressive-ai-spawn-fix
**Date**: 2026-03-15

## Existing Entities (No Changes)

### GameState
The top-level game state object. No structural changes required. The AI reads from `aiKnownWorld`, `units`, `settlements`, `tiles`, and `fog` to make decisions.

### Unit
Game piece with position, HP, movement, attack state. No field changes. The AI's new behaviors operate on existing unit fields (`tileId`, `movementPoints`, `hp`, `hasAttacked`, `owner`, `type`).

### Tile
Map cell holding terrain, optional unit, optional settlement. No field changes.

### Settlement
City or town with owner and production queue. No field changes.

## Existing Entities (Modified Usage)

### Objective (scoring.ts)

```
Objective {
  type: 'enemy-unit' | 'settlement' | 'explore'   // 'explore' was defined but never instantiated
  tileCoord: TileCoord
  tileId: string
  enemyUnitId?: string       // set when type = 'enemy-unit'
  settlementId?: string      // set when type = 'settlement'
}
```

**Change**: The `'explore'` type will now be actively created by `buildObjectives()`. No interface change needed — the type already supports it. Explore objectives will have `tileCoord` and `tileId` set to the target boundary tile; `enemyUnitId` and `settlementId` will be undefined.

### IdleState (units.ts AnimationController)

```
IdleState {
  baseY: number              // y-position the bob oscillates around
  phase: number              // phase offset for staggered animation
}
```

**Change**: `baseY` must be updated whenever the unit's tile position changes during rendering, not just at registration time. This ensures the idle bob animation oscillates around the correct y-coordinate.

## New Concepts (No New Entities)

### Aggression Mode
Not a persisted entity — computed each turn inside `computeTurn()`. The AI counts its combat units (infantry + artillery) and enters aggression mode when count >= 3. Aggression mode modifies scoring weights for the current turn only. No new state fields are needed.

### Exploration Boundary
Not a persisted entity — computed each turn inside `buildObjectives()`. The boundary is the set of known tiles that have at least one unknown neighbor. These tiles are used to create explore objectives. No new state fields are needed.

## Entity Relationships

```
GameState
  ├── units: Record<string, Unit>          (AI reads for decision-making)
  ├── tiles: Record<string, Tile>          (AI reads for pathfinding)
  ├── settlements: Record<string, Settlement>  (AI reads for production + objectives)
  ├── aiKnownWorld: Record<string, KnownTile>  (AI reads/writes for exploration)
  └── fog: Record<PlayerId, FogMap>        (renderer reads for unit visibility)

Objective (computed per turn, not persisted)
  ├── references Tile via tileCoord/tileId
  ├── references Unit via enemyUnitId (when type='enemy-unit')
  └── references Settlement via settlementId (when type='settlement')

AnimationController
  └── idles: Map<string, IdleState>        (baseY must stay in sync with unit position)
```

## State Transitions

### AI Turn Flow (existing, modified behavior)

```
phase='ai' triggered
  │
  ├─ updateKnownWorld()          [no change]
  │
  ├─ buildObjectives()           [MODIFIED: now creates 'explore' objectives]
  │   ├─ enemy-unit objectives   [no change]
  │   ├─ settlement objectives   [no change]
  │   └─ explore objectives      [NEW: boundary tiles of known world]
  │
  ├─ Production phase            [MODIFIED: remove occupied-tile check]
  │   └─ for each idle city:     [MODIFIED: strategic unit type selection]
  │       queue unit production
  │
  ├─ Count combat units          [NEW: determine aggression mode]
  │
  └─ Per-unit actions            [MODIFIED: aggression-aware scoring]
      ├─ score objectives        [MODIFIED: higher weights when aggressive]
      ├─ decideUnitActions()     [no change to decision priority order]
      └─ apply actions           [no change]
```

### Idle Animation Sync (modified)

```
UnitsRenderer.render() called
  │
  ├─ Unit container exists?
  │   ├─ No: createUnitContainer() → registerIdle()
  │   └─ Yes: continue
  │
  ├─ Set container.x, container.y to tile position
  │
  └─ Update idle baseY to container.y    [NEW: sync after position set]
```
