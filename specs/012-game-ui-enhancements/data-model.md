# Data Model: Game UI Enhancements

No new persistent entities are introduced. All new UI elements are derived views of the existing `GameState`.

## Derived Data (computed on each render)

### Control Panel Data

Computed from `GameState.settlements` filtered by `owner === humanPlayerId`:

| Field | Type | Derivation |
|-------|------|-----------|
| cityCount | number | Count of settlements where `type === 'city'` and `owner === humanPlayerId` |
| townCount | number | Count of settlements where `type === 'town'` and `owner === humanPlayerId` |
| incomePerTurn | number | Sum of `SETTLEMENT_INCOME[settlement.type]` for all owned settlements |

### Tooltip Data

Computed from `GameState.units[unitId]` + `UNIT_CONFIG[unit.type]`:

| Field | Source | Display |
|-------|--------|---------|
| Unit Type | `unit.type` | Capitalized label (e.g., "Scout") |
| HP | `unit.hp` / `UNIT_CONFIG[type].maxHp` | "3/5" format |
| Movement | `unit.movementPoints` / `UNIT_CONFIG[type].movementAllowance` | "2/3" format |
| Attack | `UNIT_CONFIG[type].attackStrength` | Integer |
| Defense | `UNIT_CONFIG[type].defenseStrength` | Integer |
| Range | `UNIT_CONFIG[type].attackRange` | "Melee" or integer |
| Vision | `UNIT_CONFIG[type].visionRange` | Integer |

### Damage Number Data

Derived at combat resolution time from pre-combat HP and `CombatResult`:

| Field | Type | Derivation |
|-------|------|-----------|
| defenderDamage | number | `defender.hp - combatResult.defenderHpAfter` |
| attackerDamage | number | `attacker.hp - combatResult.attackerHpAfter` (only if counterattack occurred) |
| defenderPosition | {x, y} | Defender unit's tile pixel coordinates |
| attackerPosition | {x, y} | Attacker unit's tile pixel coordinates |

## Existing Types Used (no modifications needed)

- `GameState.settlements` — already keyed by settlement ID with `owner` and `type` fields
- `GameState.units` — already has `hp`, `movementPoints`, `type`, `owner`, `tileId`
- `UNIT_CONFIG` — already has `maxHp`, `movementAllowance`, `visionRange`, `attackStrength`, `defenseStrength`, `attackRange`
- `SETTLEMENT_INCOME` — already maps settlement type to gold per turn
- `CombatResult` — already has `attackerHpAfter`, `defenderHpAfter`, `counterattackOccurred`
