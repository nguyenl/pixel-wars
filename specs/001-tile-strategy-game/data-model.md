# Data Model: Tile-Based Strategy Game (Feature 001)

**Branch**: `001-tile-strategy-game` | **Date**: 2026-03-14

All types are TypeScript. All state is serializable plain objects (no class instances in game state) to satisfy the multiplayer-ready constitution requirement.

---

## Core Enumerations

```typescript
type TerrainType = 'plains' | 'forest' | 'grassland' | 'mountain' | 'water';

type UnitType = 'scout' | 'infantry' | 'artillery';

type PlayerId = 'player1' | 'player2';

type Owner = PlayerId | 'neutral';

type SettlementType = 'city' | 'town';

type TurnPhase =
  | 'income'     // Income collected at turn start (server/engine handles automatically)
  | 'orders'     // Human player issues orders
  | 'ai'         // AI computes and applies its moves
  | 'victory';   // Game over; no further input accepted
```

---

## Coordinate System

```typescript
/** Grid coordinate — (0,0) is top-left */
interface TileCoord {
  row: number;
  col: number;
}
```

All grid references use `TileCoord`. Screen coordinates are computed by the renderer and never stored in game state.

---

## Terrain

```typescript
interface TerrainConfig {
  type: TerrainType;
  /** Movement points consumed by a land unit entering this tile. Infinity = impassable. */
  moveCost: number;
  /** Display label */
  label: string;
}

const TERRAIN_CONFIG: Record<TerrainType, TerrainConfig> = {
  plains:    { type: 'plains',    moveCost: 1,        label: 'Plains' },
  grassland: { type: 'grassland', moveCost: 1,        label: 'Grassland' },
  forest:    { type: 'forest',    moveCost: 2,        label: 'Forest' },
  mountain:  { type: 'mountain',  moveCost: 3,        label: 'Mountain' },
  water:     { type: 'water',     moveCost: Infinity, label: 'Water' },
};
```

---

## Tile

```typescript
interface Tile {
  /** Unique ID: `"${row},${col}"` */
  id: string;
  coord: TileCoord;
  terrain: TerrainType;
  /** ID of the settlement on this tile, if any */
  settlementId: string | null;
  /** ID of the unit on this tile, if any */
  unitId: string | null;
}
```

**Invariants**:
- A tile holds at most one settlement and at most one unit.
- A unit cannot enter a tile whose terrain has `moveCost === Infinity`.

---

## Settlement

```typescript
interface Settlement {
  id: string;
  tileId: string;
  type: SettlementType;
  owner: Owner;
  /**
   * Unit type currently in production, or null if idle.
   * Production completes at the start of the owner's next turn.
   */
  productionQueue: UnitType | null;
}
```

**Income values**:
- `'town'`: $50 per turn
- `'city'`: $100 per turn (exactly 2× a town, per FR-008)

**Capture rule**: Ownership transfers at end of the occupying player's turn if a friendly unit remains on the tile and survives any combat.

**Production rule**: Cost deducted immediately on order. Unit appears at the start of the owner's next turn. A city with `productionQueue !== null` rejects new orders (FR-016).

---

## Unit

```typescript
interface Unit {
  id: string;
  type: UnitType;
  owner: PlayerId;
  tileId: string;
  hp: number;
  /** Max HP for this unit type */
  maxHp: number;
  /** Remaining movement points this turn */
  movementPoints: number;
  /** Whether this unit has attacked this turn */
  hasAttacked: boolean;
}
```

**Unit type stats** (defined as constants, not stored per-unit instance):

| Stat | Scout | Infantry | Artillery |
|------|-------|----------|-----------|
| `maxHp` | 3 | 5 | 4 |
| `movementAllowance` | 5 | 3 | 2 |
| `visionRange` | 4 | 2 | 2 |
| `attackStrength` | 2 | 4 | 6 |
| `defenseStrength` | 1 | 3 | 2 |
| `attackRange` | 1 | 1 | 2 |
| `productionCost` | $100 | $200 | $300 |

```typescript
interface UnitTypeConfig {
  type: UnitType;
  maxHp: number;
  movementAllowance: number;
  visionRange: number;
  attackStrength: number;
  defenseStrength: number;
  /** 1 = melee only; 2 = can attack from 2 tiles (artillery) */
  attackRange: number;
  productionCost: number;
}

const UNIT_CONFIG: Record<UnitType, UnitTypeConfig> = {
  scout:     { type: 'scout',     maxHp: 3, movementAllowance: 5, visionRange: 4, attackStrength: 2, defenseStrength: 1, attackRange: 1, productionCost: 100 },
  infantry:  { type: 'infantry',  maxHp: 5, movementAllowance: 3, visionRange: 2, attackStrength: 4, defenseStrength: 3, attackRange: 1, productionCost: 200 },
  artillery: { type: 'artillery', maxHp: 4, movementAllowance: 2, visionRange: 2, attackStrength: 6, defenseStrength: 2, attackRange: 2, productionCost: 300 },
};
```

**Movement rule**: `unit.movementPoints` resets to `UNIT_CONFIG[unit.type].movementAllowance` at the start of the unit owner's turn. Entering a tile costs `TERRAIN_CONFIG[tile.terrain].moveCost` points from `movementPoints`.

**Attack rule**: A unit that has `hasAttacked === true` cannot attack again this turn. Both `movementPoints` and `hasAttacked` reset at turn start.

---

## Player

```typescript
interface Player {
  id: PlayerId;
  name: string;
  funds: number;
  isAI: boolean;
}
```

**Starting state**: `funds = 200`, `isAI = false` for Player 1, `isAI = true` for Player 2.

Funds increase at the start of the player's turn (income phase) based on owned settlements.

---

## Fog of War

```typescript
type FogState = 'hidden' | 'explored' | 'visible';

/**
 * Per-player fog map.
 * Key: tile ID (`"${row},${col}"`), Value: fog state for that player.
 */
type FogMap = Record<string, FogState>;
```

**Fog state semantics**:
- `'hidden'`: Never seen. Tile is fully obscured (black overlay). Terrain and units invisible.
- `'explored'`: Previously seen but currently outside all friendly unit vision ranges. Terrain and settlement info visible; unit positions hidden.
- `'visible'`: Within current vision range of at least one friendly unit. All info (terrain, settlement, units) visible.

**Vision range**: Chebyshev distance (8-directional) from the unit's tile. A unit at `visionRange = 2` sees all tiles within 2 steps in any direction.

**Update rule**: At the start of each player's turn, recompute `'visible'` tiles from all friendly unit positions; previously `'visible'` tiles that are no longer in range drop to `'explored'`; `'explored'` tiles never revert to `'hidden'`.

---

## AI Known World

```typescript
interface KnownTile {
  /** Which turn the AI last had vision of this tile */
  lastSeenTurn: number;
  terrain: TerrainType;
  settlementId: string | null;
  /** Last-seen unit on this tile, or null if none was seen */
  lastSeenUnit: { type: UnitType; owner: PlayerId } | null;
}

/** AI's remembered world state. Key: tile ID */
type KnownWorld = Record<string, KnownTile>;
```

The AI plans from `knownWorld`, not the true `GameState`. This gives AI "memory" without omniscience (see research.md §4.4).

---

## Game State

```typescript
interface GameState {
  /** Incrementing turn number starting at 1 */
  turn: number;
  /** Which player is currently acting */
  currentPlayer: PlayerId;
  phase: TurnPhase;
  /** Map dimensions */
  mapSize: { rows: number; cols: number };
  /** All tiles, keyed by tile ID */
  tiles: Record<string, Tile>;
  /** Row-major order of tile IDs for iteration */
  tileOrder: string[];
  /** All settlements, keyed by settlement ID */
  settlements: Record<string, Settlement>;
  /** All units, keyed by unit ID */
  units: Record<string, Unit>;
  /** Players, keyed by player ID */
  players: Record<PlayerId, Player>;
  /** Per-player fog maps */
  fog: Record<PlayerId, FogMap>;
  /** AI's remembered world (used only by AI module) */
  aiKnownWorld: KnownWorld;
  /** Winning player ID, or null if game is ongoing */
  winner: PlayerId | null;
  /** RNG seed used to generate this map (for debugging/sharing) */
  mapSeed: number;
}
```

**Invariants**:
- `tiles[tileId].unitId` and `units[unitId].tileId` are always consistent (bidirectional reference).
- `tiles[tileId].settlementId` and `settlements[settlementId].tileId` are always consistent.
- `winner !== null` iff `phase === 'victory'`.
- A player's `units` collection = all `Unit` records where `unit.owner === playerId`.

---

## Map Size Configuration

```typescript
type MapSizeOption = 'small' | 'medium' | 'large';

const MAP_SIZE_CONFIG: Record<MapSizeOption, { rows: number; cols: number }> = {
  small:  { rows: 10, cols: 10 },
  medium: { rows: 15, cols: 15 },
  large:  { rows: 20, cols: 20 },
};
```

---

## Combat Resolution

Damage formula (deterministic, no randomness):
```
damage = max(1, attacker.attackStrength − defender.defenseStrength)
```

Counterattack rule: Defender counterattacks immediately after the initial attack **if and only if** the attacker's `attackRange === 1` (melee) AND the defender is adjacent (distance = 1) to the attacker AND the defender still has `hp > 0` after the initial attack.

Artillery at `attackRange === 2`: Never triggers a counterattack (FR-019).

Unit removal: Any unit reaching `hp ≤ 0` is removed from `units` and its `tileId` tile's `unitId` is set to `null` (FR-012).

---

## State Transitions

```
[MAIN MENU]
     │ player selects map size
     ▼
[INCOME phase]  ← start of each player's turn
     │ income collected automatically
     ▼
[ORDERS phase]  ← human player issues actions
     │ player clicks "End Turn"
     ▼
[AI phase]      ← AI computes and applies all its actions
     │ AI finishes
     ▼
[check victory]
     │ loser has 0 cities       │ game continues
     ▼                          ▼
[VICTORY phase]           [INCOME phase] (next player's turn)
```
