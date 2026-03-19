# Contracts: Type Interface Changes

Pixel Wars is a browser game with no external API surface. The "contracts" are the internal TypeScript interfaces that cross module boundaries. This document captures all interface changes for this feature.

---

## `src/game/types.ts` — Interface Deltas

### `Settlement` — extended

```typescript
// New fields added
captureProgress: number        // 0 | 1
capturingUnit: string | null   // unitId or null
```

All consumers of `Settlement` must handle the new fields:
- `turns.ts :: resolveCaptures` — primary writer
- `renderer/renderer.ts` — reads `captureProgress` for indicator rendering
- `state.ts :: createGameState` — must initialize both fields to `0` / `null`

### `GameStats` — new interface

```typescript
interface GameStats {
  unitsProduced: number
  unitsLost: number
  totalIncomeEarned: number
  citiesAtEnd: number
}
```

### `GameState` — extended

```typescript
// New field added
gameStats: Record<PlayerId, GameStats>
```

### `ObjectiveType` — extended union

```typescript
type ObjectiveType =
  | 'settlement'
  | 'enemy-unit'
  | 'explore'
  | 'aggressive'
  | 'block-capture'   // NEW
  | 'defend'          // NEW
```

---

## Cross-Module Data Flow

```
turns.ts
  resolveCaptures()
    reads:  settlement.capturingUnit, settlement.captureProgress, tile.unitId
    writes: settlement.captureProgress, settlement.capturingUnit, settlement.owner

  startTurn()
    reads:  player.funds (before income)
    writes: gameStats[player].totalIncomeEarned (+=income collected)

  checkVictory()
    writes: gameStats[player].citiesAtEnd (snapshot at game end)

state.ts / rules.ts
  applyProduce()
    writes: gameStats[player].unitsProduced += 1

  applyCombat() / unit HP reaches 0
    writes: gameStats[unit.owner].unitsLost += 1

ai/ai.ts
  computeTurn()
    reads:  state.settlements (all, unfiltered — omniscient)
    reads:  state.units (all, unfiltered — omniscient)
    computes: isOffensivePhase(state) → bool

ai/objectives.ts
  buildObjectives()
    reads:  state.units[*].tileId (player units, direct from state)
    emits:  Objective{ type: 'block-capture' } for contested cities
    emits:  Objective{ type: 'defend' } in offensive phase

renderer/renderer.ts
  renderSettlements()
    reads:  settlement.captureProgress, settlement.capturingUnit
    draws:  progress bar Graphics when captureProgress > 0

renderer/ui.ts
  showScoreboard(stats, winner)
    reads:  gameStats[player1], gameStats[player2]
    shows:  side-by-side HTML overlay panel
```

---

## Backward Compatibility

All new fields are additive. Existing action types (`MoveAction`, `AttackAction`, etc.) are unchanged. The `applyAction` reducer in `state.ts` will need to handle stats accumulation, but all existing callers pass through without change.

No fields are removed or renamed in this feature.
