# Data Model: AI Visuals, Map Expansion & Settlement Upgrades

**Feature**: 007-ai-visuals-upgrades
**Date**: 2026-03-16

## Modified Entities

### Settlement (modified)

The `Settlement` entity already exists. The upgrade mechanic does not change its shape — it changes the _transitions_ allowed on the `type` field.

| Field | Type | Description | Change |
|-------|------|-------------|--------|
| id | string | Unique settlement identifier | No change |
| tileId | string | Tile coordinates ("row,col") | No change |
| type | 'city' \| 'town' | Settlement classification | **Now mutable** — towns can transition to cities via upgrade |
| owner | PlayerId \| 'neutral' | Current owner | No change |
| productionQueue | UnitType \| null | Active production order | No change (becomes usable after upgrade to city) |

**State transitions**:
- `town` → `city`: Via upgrade action. Irreversible. Costs $500. Grants city-level income, production, and vision.
- `city` → `town`: Not allowed. Cities cannot be downgraded.
- Ownership changes (capture) do not affect type.

---

### Player (modified)

| Field | Type | Description | Change |
|-------|------|-------------|--------|
| id | PlayerId | Player identifier | No change |
| funds | number | Current gold balance | **New deduction path** — upgrade action deducts $500 |

---

## New Entities

### UpgradeAction

A new action type in the game's action discriminated union.

| Field | Type | Description |
|-------|------|-------------|
| type | 'upgrade' | Action discriminator |
| settlementId | string | ID of the town to upgrade |

**Validation rules**:
- Game phase must be 'orders' (player turn) or 'ai' (AI turn for AI-owned towns)
- Settlement must exist in game state
- Settlement type must be 'town'
- Settlement owner must match acting player
- Acting player funds must be ≥ 500

**Application effects**:
- `settlement.type` changes from 'town' to 'city'
- `player.funds` decreases by 500
- Fog of war recomputed (city has vision range 3 vs town's 2)

---

### AITurnSequence (new concept, not persisted)

Represents the orchestrated playback of AI actions during the AI's turn. This is a runtime concept, not stored in game state.

| Field | Type | Description |
|-------|------|-------------|
| actions | Action[] | Ordered list of actions from `computeTurn()` |
| currentIndex | number | Index of the action currently animating |
| phase | 'thinking' \| 'animating' \| 'complete' | Current playback phase |

**State transitions**:
- `thinking`: AI computation in progress (Worker running). Thinking indicator visible.
- `animating`: Actions being played back sequentially with animations. Player input locked.
- `complete`: All actions animated. Transition to player's next turn.

---

## Modified Constants

### MAP_SIZE_CONFIG (modified)

| Size | Previous | New | Tiles (previous → new) |
|------|----------|-----|------------------------|
| small | 10×10 | 20×20 | 100 → 400 |
| medium | 15×15 | 30×30 | 225 → 900 |
| large | 20×20 | 40×40 | 400 → 1,600 |

### SETTLEMENT_PLACEMENT (modified)

| Size | Previous Separation | New Separation | Previous Town Count | New Town Count |
|------|---------------------|----------------|---------------------|----------------|
| small | 3 | 5 | 3-4 | 6-8 |
| medium | 4 | 7 | 5-6 | 10-12 |
| large | 5 | 9 | 8-10 | 16-20 |

### AI_TIME_BUDGET_MS (modified)

| Previous | New |
|----------|-----|
| 2500 | 5000 |

### New Constants

| Constant | Value | Description |
|----------|-------|-------------|
| UPGRADE_COST | 500 | Gold cost to upgrade town → city |
| AI_UPGRADE_THRESHOLD | 600 | Minimum AI gold to consider upgrading (UPGRADE_COST + cheapest unit cost) |

---

## Relationships

```
Player --owns--> Settlement (via settlement.owner)
Player --funds--> UpgradeAction (validates affordability)
Settlement --type transition--> Settlement (town → city via upgrade)
AITurnSequence --contains--> Action[] (from computeTurn)
AITurnSequence --triggers--> AnimationController (move/attack/death playback)
```
