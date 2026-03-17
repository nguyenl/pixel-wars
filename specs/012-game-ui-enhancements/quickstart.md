# Quickstart: Game UI Enhancements

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
git checkout 012-game-ui-enhancements
npm install
```

## Development

```bash
npm run dev    # Start Vite dev server with HMR
```

## Testing

```bash
npm test       # Run Vitest
npm run lint   # Run linter
```

## Key Files to Modify

| File | What to change |
|------|----------------|
| `src/renderer/ui.ts` | Add control panel rendering, instructions overlay, help button in HUD |
| `src/renderer/units.ts` | Add floating damage number animation to AnimationController |
| `src/renderer/renderer.ts` | Expose damage number API, add tooltip hover support |
| `src/input/input.ts` | Add unit hover tooltip logic, mobile long-press detection |
| `src/main.ts` | Pass combat damage data to renderer during attack animations |

## Key Constants Reference

```typescript
// Unit stats — src/game/constants.ts
UNIT_CONFIG[unitType].maxHp / movementAllowance / visionRange / attackStrength / defenseStrength / attackRange

// Settlement income — src/game/constants.ts
SETTLEMENT_INCOME.city = 100  // gold per turn
SETTLEMENT_INCOME.town = 50   // gold per turn

// Combat damage formula — src/game/combat.ts
damage = max(1, attacker.attackStrength - defender.defenseStrength)
```

## Verification

After implementation, verify:
1. Control panel visible during gameplay showing income, cities, towns
2. Hovering over units shows tooltip with full stats
3. Attack animations display floating damage numbers
4. Help button opens instructions overlay; Escape closes it
5. All features work on both desktop and mobile
