# Data Model: Strategic AI Overhaul & Game Enhancements

Documents all entity changes and new types introduced by this feature. Field-level deltas only — unchanged fields are omitted.

---

## Modified Entity: `Settlement`

```typescript
// BEFORE
interface Settlement {
  id: string
  tileId: string
  type: SettlementType       // 'city' | 'town'
  owner: Owner               // 'player1' | 'player2' | 'neutral'
  productionQueue: UnitType | null
}

// AFTER — added two fields
interface Settlement {
  id: string
  tileId: string
  type: SettlementType
  owner: Owner
  productionQueue: UnitType | null
  captureProgress: number          // 0 = none, 1 = one turn occupied (capture completes at 2)
  capturingUnit: string | null     // unitId of the unit currently occupying, null if uncontested
}
```

**Validation rules**:
- `captureProgress` MUST be 0 when `capturingUnit` is null.
- `captureProgress` MUST be 0 or 1 (never 2 — at 2 the ownership transfer is applied and the field resets).
- `capturingUnit` MUST reference an existing unit when non-null.
- A unit with `owner === settlement.owner` CANNOT be a `capturingUnit` (friendly occupation is not a capture).

**State transitions**:

```
[captureProgress=0, capturingUnit=null]
    → unit of foreign owner enters tile → [captureProgress=0, capturingUnit=unitId]
    → end of that owner's turn (resolveCaptures) → [captureProgress=1, capturingUnit=unitId]
    → end of same owner's next turn (resolveCaptures) → ownership transfer, reset to [0, null]
    → occupying unit leaves / is destroyed at any point → reset to [0, null]
    → different unit enters mid-siege → reset to [0, null] then track new unit
```

---

## New Entity: `GameStats`

```typescript
interface GameStats {
  unitsProduced: number          // total units spawned from production (all types)
  unitsLost: number              // total friendly units destroyed
  totalIncomeEarned: number      // cumulative funds collected at start-of-turn
  citiesAtEnd: number            // city count at time of game-over (set once, at victory)
}
```

**Tracking hook points**:

| Field | Incremented in | Trigger |
|-------|---------------|---------|
| `unitsProduced` | `applyProduce` (state.ts) | When a unit is added to the map from a production queue |
| `unitsLost` | `applyCombat` / combat resolution (state.ts) | When any unit's HP reaches 0 |
| `totalIncomeEarned` | `startTurn` (turns.ts) | After income from all settlements is added to player funds |
| `citiesAtEnd` | `checkVictory` (turns.ts) | Once, when the game-over condition is first detected |

---

## Modified Entity: `GameState`

```typescript
// Added field
interface GameState {
  // ... all existing fields unchanged ...
  gameStats: Record<PlayerId, GameStats>   // NEW — per-player stat accumulators
}
```

**Initialization**: Both player entries initialized to `{ unitsProduced: 0, unitsLost: 0, totalIncomeEarned: 0, citiesAtEnd: 0 }` in `createGameState`.

---

## New Type: `ObjectiveType` (extension)

```typescript
// BEFORE
type ObjectiveType = 'settlement' | 'enemy-unit' | 'explore' | 'aggressive'

// AFTER — added two types
type ObjectiveType = 'settlement' | 'enemy-unit' | 'explore' | 'aggressive' | 'block-capture' | 'defend'
```

- **`block-capture`**: Targets a city where a player unit is within 3 tiles. High priority during expansion phase.
- **`defend`**: Targets the nearest own city. Used to keep a defender unit near own territory during offensive phase.

---

## AI Phase (computed, not stored)

```typescript
// Computed at start of each AI turn — NOT added to GameState
function isOffensivePhase(state: GameState): boolean {
  const aiIncome = getIncomePerTurn(state, 'player2')
  const playerIncome = getIncomePerTurn(state, 'player1')
  const aiMilitary = getMilitaryUnitCount(state, 'player2')
  const playerMilitary = getMilitaryUnitCount(state, 'player1')
  return aiIncome > playerIncome && aiMilitary > playerMilitary
}
```

**Income per turn**: Sum of settlement income values for all settlements owned by that player (city = $100/turn, town = $50/turn). Matches existing `startTurn` income calculation.

**Military unit count**: Count of living units (`hp > 0`) owned by the player. All three unit types (scout, infantry, artillery) count as military.

---

## Unchanged Entities

`Tile`, `Unit`, `Player`, `FogMap`, `KnownWorld`, `KnownTile`, `TurnPhase`, `TerrainType`, `UnitType`, `Owner`, all `Action` types — no changes.
